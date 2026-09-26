import type { SupabaseClient } from '@supabase/supabase-js';
import { mirrorOrderPayoutStatus } from '../admin-payouts.js';
import { getProviderByName, type PaymentsProvider, type ProviderOpResult } from './provider.js';

/** Simulate refs are always `SIM-…`; anything else came from the live provider. */
export function providerForRef(ref: string | null | undefined): PaymentsProvider {
  return getProviderByName(ref?.startsWith('SIM-') ? 'simulate' : 'flutterwave');
}

export function failedResult(err: unknown): ProviderOpResult {
  return {
    status: 'failed',
    providerRef: null,
    message: err instanceof Error ? err.message : 'Provider call failed',
  };
}

async function payoutEvent(service: SupabaseClient, payoutId: string, actorId: string | null, action: string, reason: string) {
  const { error } = await service.from('payout_events').insert({ payout_id: payoutId, actor_id: actorId, action, reason });
  if (error) console.warn('[payments/settle] payout event failed', error.message);
}

async function refundEvent(service: SupabaseClient, refundId: string, actorId: string | null, action: string, reason: string) {
  const { error } = await service.from('refund_events').insert({ refund_id: refundId, actor_id: actorId, action, reason });
  if (error) console.warn('[payments/settle] refund event failed', error.message);
}

export async function applyPayoutOutcome(
  service: SupabaseClient,
  payout: { id: string; orderId: string },
  result: ProviderOpResult,
  actorId: string | null,
  providerName: string,
) {
  const now = new Date().toISOString();
  const refPatch = result.providerRef ? { provider_ref: result.providerRef } : {};

  if (result.status === 'successful') {
    const { error } = await service
      .from('payouts')
      .update({ status: 'paid_out', paid_at: now, paid_by: actorId, provider: providerName, ...refPatch })
      .eq('id', payout.id);
    if (error) throw error;
    await mirrorOrderPayoutStatus(service, payout.orderId, 'paid_out');
    await payoutEvent(service, payout.id, actorId, 'paid_out', `${providerName} · ${result.providerRef ?? 'no ref'}`);
    return;
  }

  if (result.status === 'failed') {
    const { error } = await service
      .from('payouts')
      .update({ status: 'failed', failed_at: now, provider: providerName, ...refPatch })
      .eq('id', payout.id);
    if (error) throw error;
    await mirrorOrderPayoutStatus(service, payout.orderId, 'failed');
    await payoutEvent(service, payout.id, actorId, 'failed', result.message ?? `${providerName} transfer failed`);
    return;
  }

  const { error } = await service
    .from('payouts')
    .update({ status: 'processing', provider: providerName, ...refPatch })
    .eq('id', payout.id);
  if (error) throw error;
}

export async function applyRefundOutcome(
  service: SupabaseClient,
  refundId: string,
  result: ProviderOpResult,
  actorId: string | null,
  providerName: string,
) {
  const now = new Date().toISOString();
  const refPatch = result.providerRef ? { provider_ref: result.providerRef } : {};

  if (result.status === 'successful') {
    const { error } = await service
      .from('refunds')
      .update({ status: 'completed', completed_at: now, completed_by: actorId, ...refPatch })
      .eq('id', refundId);
    if (error) throw error;
    await refundEvent(service, refundId, actorId, 'completed', `${providerName} · ${result.providerRef ?? 'no ref'}`);
    return;
  }

  if (result.status === 'failed') {
    const { error } = await service
      .from('refunds')
      .update({ status: 'failed', failed_at: now, ...refPatch })
      .eq('id', refundId);
    if (error) throw error;
    await refundEvent(service, refundId, actorId, 'failed', result.message ?? `${providerName} refund failed`);
    return;
  }

  const { error } = await service
    .from('refunds')
    .update({ status: 'processing', ...refPatch })
    .eq('id', refundId);
  if (error) throw error;
}

/** Re-check provider state for payouts/refunds still waiting on the provider. */
export async function reconcilePendingProviderOps(service: SupabaseClient) {
  const { data: payouts } = await service
    .from('payouts')
    .select('id, order_id, provider_ref')
    .eq('status', 'processing')
    .not('provider_ref', 'is', null)
    .limit(50);

  for (const row of payouts ?? []) {
    const provider = providerForRef(String(row.provider_ref));
    let result: ProviderOpResult;
    try {
      result = await provider.transferStatus(String(row.provider_ref));
    } catch (err) {
      console.warn('[reconcile] transfer status failed', row.id, err instanceof Error ? err.message : err);
      continue;
    }
    if (result.status === 'pending') continue;
    await applyPayoutOutcome(service, { id: String(row.id), orderId: String(row.order_id) }, result, null, provider.name);
  }

  const { data: refunds } = await service
    .from('refunds')
    .select('id, provider_ref')
    .in('status', ['processing', 'uncertain'])
    .not('provider_ref', 'is', null)
    .limit(50);

  for (const row of refunds ?? []) {
    const provider = providerForRef(String(row.provider_ref));
    let result: ProviderOpResult;
    try {
      result = await provider.refundStatus(String(row.provider_ref));
    } catch (err) {
      console.warn('[reconcile] refund status failed', row.id, err instanceof Error ? err.message : err);
      continue;
    }
    if (result.status === 'pending') continue;
    await applyRefundOutcome(service, String(row.id), result, null, provider.name);
  }
}
