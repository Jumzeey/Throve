import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fulfillPaidCheckout,
  paymentMode,
  type CheckoutPayload,
} from './checkout-fulfill.js';
import { flutterwaveVerifyByRef } from './payments/flutterwave.js';
import { createServiceClient } from './supabase.js';

export type PaymentDbStatus = 'pending' | 'successful' | 'failed' | 'cancelled';

export type PaymentEventAction =
  | 'created'
  | 'note'
  | 'reconcile'
  | 'status_changed'
  | 'escalated';

export type ReconcileResult =
  | { kind: 'already_applied'; intent: Record<string, unknown> }
  | { kind: 'conflict'; message: string }
  | { kind: 'updated'; intent: Record<string, unknown>; providerStatus: string };

const UNCERTAIN_AGE_MS = 15 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isUncertainPending(row: {
  status: string;
  provider_ref?: string | null;
  created_at: string;
}): boolean {
  if (row.status !== 'pending') return false;
  if (row.provider_ref) return true;
  const created = new Date(row.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created >= UNCERTAIN_AGE_MS;
}

export function isYoungPending(row: {
  status: string;
  provider_ref?: string | null;
  created_at: string;
}): boolean {
  if (row.status !== 'pending') return false;
  if (row.provider_ref) return false;
  const created = new Date(row.created_at).getTime();
  if (Number.isNaN(created)) return true;
  return Date.now() - created < UNCERTAIN_AGE_MS;
}

/** Build a key for duplicate clustering. */
export function duplicateKey(row: {
  user_id: string;
  listing_id: string;
  amount: number;
}): string {
  return `${row.user_id}|${row.listing_id}|${row.amount}`;
}

export function findDuplicateIds(
  rows: Array<{
    id: string;
    user_id: string;
    listing_id: string;
    amount: number;
    status: string;
    created_at: string;
  }>,
): Set<string> {
  const eligible = rows.filter((r) => r.status === 'pending' || r.status === 'successful');
  const byKey = new Map<string, typeof eligible>();
  for (const row of eligible) {
    const key = duplicateKey(row);
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }

  const duplicateIds = new Set<string>();
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const gap =
          Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        if (gap <= DUPLICATE_WINDOW_MS) {
          duplicateIds.add(a.id);
          duplicateIds.add(b.id);
        }
      }
    }
  }
  return duplicateIds;
}

export function deriveUiStatus(
  row: {
    id: string;
    status: string;
    provider_ref?: string | null;
    created_at: string;
  },
  duplicateIds: Set<string>,
):
  | 'Status uncertain'
  | 'Duplicate risk'
  | 'Confirmed failed'
  | 'Successful'
  | 'Cancelled'
  | 'Initiated' {
  if (duplicateIds.has(row.id) && (row.status === 'pending' || row.status === 'successful')) {
    // Prefer duplicate label for pending cluster members; successful can still show Successful
    // when not pending — plan: duplicate queue is heuristic for pending/successful pairs.
    if (row.status === 'pending') return 'Duplicate risk';
  }
  if (row.status === 'successful') return 'Successful';
  if (row.status === 'failed') return 'Confirmed failed';
  if (row.status === 'cancelled') return 'Cancelled';
  if (isUncertainPending(row)) return 'Status uncertain';
  if (duplicateIds.has(row.id)) return 'Duplicate risk';
  return 'Initiated';
}

export function deriveVerification(
  status: string,
): 'Pending' | 'Verified' | 'Failed' | 'Not required' {
  if (status === 'successful') return 'Verified';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Not required';
  return 'Pending';
}

export function needsAttentionUi(
  uiStatus:
    | 'Status uncertain'
    | 'Duplicate risk'
    | 'Confirmed failed'
    | 'Successful'
    | 'Cancelled'
    | 'Initiated',
): boolean {
  return (
    uiStatus === 'Status uncertain' ||
    uiStatus === 'Duplicate risk' ||
    uiStatus === 'Confirmed failed'
  );
}

export function maskProviderRef(ref: string | null | undefined): string {
  if (!ref) return '—';
  const s = String(ref);
  if (s.length <= 4) return `···· ${s}`;
  return `···· ${s.slice(-4)}`;
}

export async function recordPaymentEvent(
  paymentIntentId: string,
  actorId: string | null,
  action: PaymentEventAction,
  reason?: string | null,
) {
  const service = createServiceClient();
  const { error } = await service.from('payment_events').insert({
    payment_intent_id: paymentIntentId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
  if (error) console.warn('[admin/payments] event write failed', error.message);
}

/**
 * Staff reconcile: re-check provider and fulfill if paid.
 * Simulate mode fulfills when checkout_payload is present (same default as buyer verify success).
 */
export async function reconcilePaymentIntent(
  intentId: string,
  actorId: string,
  reason: string,
): Promise<ReconcileResult> {
  const service = createServiceClient();
  const { data: intent, error } = await service
    .from('payment_intents')
    .select('*')
    .eq('id', intentId)
    .maybeSingle();
  if (error) throw error;
  if (!intent) throw Object.assign(new Error('Payment not found'), { status: 404 });

  if (intent.status === 'successful' && intent.order_id) {
    return { kind: 'already_applied', intent };
  }
  if (intent.status !== 'pending') {
    return {
      kind: 'conflict',
      message: `Cannot reconcile payment in status ${intent.status}`,
    };
  }

  const mode = paymentMode();
  let providerStatus: 'pending' | 'successful' | 'failed' = 'pending';
  let providerRef = (intent.provider_ref as string | null) ?? null;

  if (mode === 'simulate') {
    const payload = intent.checkout_payload as CheckoutPayload | null;
    if (payload?.listingId && payload?.name && payload?.address) {
      providerStatus = 'successful';
    } else {
      await recordPaymentEvent(intentId, actorId, 'reconcile', reason);
      return { kind: 'updated', intent, providerStatus: 'pending' };
    }
  } else {
    try {
      const verified = await flutterwaveVerifyByRef(String(intent.tx_ref));
      providerRef = verified.providerRef ?? providerRef;
      if (verified.currency !== 'NGN' || Math.round(verified.amount) !== Number(intent.amount)) {
        await service
          .from('payment_intents')
          .update({ status: 'failed', provider_ref: providerRef })
          .eq('id', intentId);
        await recordPaymentEvent(intentId, actorId, 'reconcile', reason);
        await recordPaymentEvent(
          intentId,
          actorId,
          'status_changed',
          'Marked failed: amount/currency mismatch',
        );
        const { data: updated } = await service
          .from('payment_intents')
          .select('*')
          .eq('id', intentId)
          .single();
        return { kind: 'updated', intent: updated ?? intent, providerStatus: 'failed' };
      }
      const st = String(verified.status ?? '').toLowerCase();
      if (st === 'successful' || st === 'success') providerStatus = 'successful';
      else if (st === 'failed') providerStatus = 'failed';
      else providerStatus = 'pending';
    } catch {
      await recordPaymentEvent(
        intentId,
        actorId,
        'reconcile',
        `${reason} · provider verify unavailable`,
      );
      return { kind: 'updated', intent, providerStatus: 'pending' };
    }
  }

  await recordPaymentEvent(intentId, actorId, 'reconcile', reason);

  if (providerStatus === 'failed') {
    await service
      .from('payment_intents')
      .update({ status: 'failed', provider_ref: providerRef })
      .eq('id', intentId);
    await recordPaymentEvent(intentId, actorId, 'status_changed', 'Provider confirmed failed');
    const { data: updated } = await service
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .single();
    return { kind: 'updated', intent: updated ?? intent, providerStatus: 'failed' };
  }

  if (providerStatus !== 'successful') {
    if (providerRef && providerRef !== intent.provider_ref) {
      await service.from('payment_intents').update({ provider_ref: providerRef }).eq('id', intentId);
    }
    return { kind: 'updated', intent, providerStatus: 'pending' };
  }

  try {
    const order = await fulfillPaidCheckout(
      service as SupabaseClient,
      String(intent.user_id),
      intent.checkout_payload as CheckoutPayload,
      {
        txRef: String(intent.tx_ref),
        providerRef,
      },
    );
    await service
      .from('payment_intents')
      .update({
        status: 'successful',
        provider_ref: providerRef,
        order_id: order.id,
      })
      .eq('id', intentId);
    await recordPaymentEvent(
      intentId,
      actorId,
      'status_changed',
      `Successful · order ${order.id}`,
    );
    const { data: updated } = await service
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .single();
    return { kind: 'updated', intent: updated ?? intent, providerStatus: 'successful' };
  } catch (err) {
    await recordPaymentEvent(
      intentId,
      actorId,
      'status_changed',
      err instanceof Error ? `Fulfill failed: ${err.message}` : 'Fulfill failed',
    );
    throw err;
  }
}
