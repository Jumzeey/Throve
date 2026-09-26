import type { SupabaseClient } from '@supabase/supabase-js';
import { payoutBreakdown, THROVE_COMMISSION_RATE } from './order-finance.js';

export type PayoutLedgerStatus =
  | 'not_yet_eligible'
  | 'eligible'
  | 'verification_required'
  | 'on_hold'
  | 'processing'
  | 'failed'
  | 'paid_out'
  | 'cancelled';

export type EnsurePayoutIntent =
  | 'eligible'
  | 'on_hold'
  | 'cancelled'
  | 'sync';

function orderStatusToLedger(
  orderPayoutStatus: string,
  payoutVerified: boolean,
): PayoutLedgerStatus {
  if (orderPayoutStatus === 'on_hold') return 'on_hold';
  if (orderPayoutStatus === 'processing') return 'processing';
  if (orderPayoutStatus === 'paid_out') return 'paid_out';
  if (orderPayoutStatus === 'failed') return 'failed';
  if (orderPayoutStatus === 'eligible') {
    return payoutVerified ? 'eligible' : 'verification_required';
  }
  return 'not_yet_eligible';
}

async function recordEvent(
  service: SupabaseClient,
  payoutId: string,
  actorId: string | null,
  action: string,
  reason?: string | null,
) {
  const { error } = await service.from('payout_events').insert({
    payout_id: payoutId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
  if (error) console.warn('[payouts] event write failed', error.message);
}

/**
 * Create or update the Finance payout ledger row for an order.
 * Failures are logged; callers should not fail the primary mutation on ensure errors.
 */
export async function ensurePayoutForOrder(
  service: SupabaseClient,
  input: {
    orderId: string;
    intent: EnsurePayoutIntent;
    disputeId?: string | null;
    actorId?: string | null;
    reason?: string | null;
  },
): Promise<{ id: string } | null> {
  const { data: order, error: orderError } = await service
    .from('orders')
    .select('id, seller_id, buyer_id, item_price, payout_status, status')
    .eq('id', input.orderId)
    .maybeSingle();
  if (orderError || !order) {
    console.warn('[payouts] ensure: order missing', orderError?.message ?? input.orderId);
    return null;
  }

  const { data: seller } = await service
    .from('profiles')
    .select('id, payout_verified')
    .eq('id', order.seller_id)
    .maybeSingle();
  const payoutVerified = Boolean(seller?.payout_verified);

  const breakdown = payoutBreakdown(Number(order.item_price ?? 0));
  const amounts = {
    sale_total: breakdown.itemSalePrice,
    commission: breakdown.commission,
    fees: breakdown.processingFee,
    net: breakdown.netPayout,
    commission_rate: THROVE_COMMISSION_RATE,
    fee_note: 'Payment processing fee',
  };

  let targetStatus: PayoutLedgerStatus;
  if (input.intent === 'cancelled') {
    targetStatus = 'cancelled';
  } else if (input.intent === 'on_hold') {
    targetStatus = 'on_hold';
  } else if (input.intent === 'eligible') {
    targetStatus = payoutVerified ? 'eligible' : 'verification_required';
  } else {
    targetStatus = orderStatusToLedger(String(order.payout_status), payoutVerified);
  }

  const { data: existing } = await service
    .from('payouts')
    .select('id, status')
    .eq('order_id', input.orderId)
    .maybeSingle();

  if (existing?.id) {
    const current = String(existing.status);
    // Do not reopen paid/cancelled via sync; allow intentional cancelled/hold/eligible
    if (input.intent === 'sync' && (current === 'paid_out' || current === 'cancelled' || current === 'processing')) {
      return { id: String(existing.id) };
    }
    if (input.intent === 'eligible' && (current === 'paid_out' || current === 'cancelled' || current === 'processing')) {
      return { id: String(existing.id) };
    }

    const patch: Record<string, unknown> = {
      status: targetStatus,
      ...amounts,
      seller_id: order.seller_id,
    };
    if (input.disputeId) patch.dispute_id = input.disputeId;
    if (targetStatus === 'on_hold' && input.reason) {
      patch.hold_reason = input.reason;
      patch.hold_seller_facing = input.reason;
    }
    if (targetStatus === 'eligible' || targetStatus === 'verification_required') {
      patch.hold_reason = null;
      patch.hold_seller_facing = null;
      if (input.intent !== 'on_hold') {
        // clear dispute link on release unless still holding
      }
    }
    if (input.intent === 'eligible' || input.intent === 'cancelled') {
      // keep dispute_id for trail when cancelled from refund_buyer
      if (input.disputeId) patch.dispute_id = input.disputeId;
    }

    const { error } = await service.from('payouts').update(patch).eq('id', existing.id);
    if (error) {
      console.warn('[payouts] ensure update failed', error.message);
      return { id: String(existing.id) };
    }

    if (targetStatus === 'cancelled' && current !== 'cancelled') {
      await recordEvent(service, String(existing.id), input.actorId ?? null, 'cancelled', input.reason);
    } else if (targetStatus === 'on_hold' && current !== 'on_hold') {
      await recordEvent(service, String(existing.id), input.actorId ?? null, 'hold', input.reason);
    } else if (
      (targetStatus === 'eligible' || targetStatus === 'verification_required') &&
      current === 'on_hold'
    ) {
      await recordEvent(service, String(existing.id), input.actorId ?? null, 'release', input.reason);
    }

    return { id: String(existing.id) };
  }

  const { data: created, error: insertError } = await service
    .from('payouts')
    .insert({
      order_id: input.orderId,
      seller_id: order.seller_id,
      dispute_id: input.disputeId ?? null,
      status: targetStatus,
      ...amounts,
      hold_reason: targetStatus === 'on_hold' ? input.reason ?? 'Payout on hold' : null,
      hold_seller_facing: targetStatus === 'on_hold' ? input.reason ?? 'Payout on hold' : null,
    })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: again } = await service
        .from('payouts')
        .select('id')
        .eq('order_id', input.orderId)
        .maybeSingle();
      return again?.id ? { id: String(again.id) } : null;
    }
    console.warn('[payouts] ensure insert failed', insertError.message);
    return null;
  }

  await recordEvent(
    service,
    String(created.id),
    input.actorId ?? null,
    targetStatus === 'cancelled' ? 'cancelled' : targetStatus === 'on_hold' ? 'hold' : 'created',
    input.reason,
  );

  return { id: String(created.id) };
}

/** Map ledger status to orders.payout_status enum (no verification_required / cancelled on orders). */
export function ledgerToOrderPayoutStatus(
  status: PayoutLedgerStatus,
): 'not_yet_eligible' | 'eligible' | 'processing' | 'paid_out' | 'on_hold' | 'failed' {
  if (status === 'verification_required') return 'eligible';
  if (status === 'cancelled') return 'on_hold';
  if (status === 'not_yet_eligible') return 'not_yet_eligible';
  if (status === 'eligible') return 'eligible';
  if (status === 'on_hold') return 'on_hold';
  if (status === 'processing') return 'processing';
  if (status === 'paid_out') return 'paid_out';
  if (status === 'failed') return 'failed';
  return 'not_yet_eligible';
}

export async function mirrorOrderPayoutStatus(
  service: SupabaseClient,
  orderId: string,
  ledgerStatus: PayoutLedgerStatus,
) {
  const { error } = await service
    .from('orders')
    .update({ payout_status: ledgerToOrderPayoutStatus(ledgerStatus) })
    .eq('id', orderId);
  if (error) console.warn('[payouts] mirror order status failed', error.message);
}
