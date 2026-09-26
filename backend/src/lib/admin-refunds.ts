import type { SupabaseClient } from '@supabase/supabase-js';

export type RefundDbStatus =
  | 'awaiting_finance'
  | 'ready'
  | 'processing'
  | 'completed'
  | 'uncertain'
  | 'failed';

/**
 * Create a Finance refund row from a buyer-win dispute decision.
 * Idempotent on dispute_id (unique). Failures are logged; do not fail the decide caller.
 */
export async function createRefundFromDispute(
  service: SupabaseClient,
  input: {
    disputeId: string;
    orderId: string;
    decidedBy: string;
    decidedAt: string;
    decisionReason: string;
  },
): Promise<{ id: string } | null> {
  const { data: existing } = await service
    .from('refunds')
    .select('id')
    .eq('dispute_id', input.disputeId)
    .maybeSingle();
  if (existing?.id) return { id: String(existing.id) };

  const { data: order, error: orderError } = await service
    .from('orders')
    .select('id, buyer_id, item_price, delivery_fee, protection_fee, status')
    .eq('id', input.orderId)
    .maybeSingle();
  if (orderError || !order) {
    console.warn('[refunds] create from dispute: order missing', orderError?.message ?? input.orderId);
    return null;
  }

  const { data: intent } = await service
    .from('payment_intents')
    .select('id, provider, status')
    .eq('order_id', input.orderId)
    .eq('status', 'successful')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const itemAmount = Number(order.item_price ?? 0);
  const deliveryAmount = Number(order.delivery_fee ?? 0);
  const protectionAmount = Number(order.protection_fee ?? 0);
  const needsDelivery = deliveryAmount > 0;
  const status: RefundDbStatus = needsDelivery ? 'awaiting_finance' : 'ready';

  const { data: refund, error } = await service
    .from('refunds')
    .insert({
      order_id: input.orderId,
      dispute_id: input.disputeId,
      payment_intent_id: intent?.id ?? null,
      buyer_id: order.buyer_id,
      status,
      origin: 'eligible_dispute',
      origin_detail: `Buyer-win dispute · ${input.decisionReason}`,
      item_amount: itemAmount,
      buyer_protection_amount: protectionAmount,
      delivery_amount: deliveryAmount,
      buyer_protection_included: protectionAmount > 0,
      include_delivery: needsDelivery ? null : false,
      needs_delivery_determination: needsDelivery,
      total_amount: needsDelivery
        ? null
        : itemAmount + (protectionAmount > 0 ? protectionAmount : 0),
      decided_by: input.decidedBy,
      decided_at: input.decidedAt,
    })
    .select('id')
    .single();

  if (error) {
    // Unique race: another writer won
    if (error.code === '23505') {
      const { data: again } = await service
        .from('refunds')
        .select('id')
        .eq('dispute_id', input.disputeId)
        .maybeSingle();
      return again?.id ? { id: String(again.id) } : null;
    }
    console.warn('[refunds] create from dispute failed', error.message);
    return null;
  }

  await service.from('refund_events').insert({
    refund_id: refund.id,
    actor_id: input.decidedBy,
    action: 'created',
    reason: input.decisionReason,
  });

  return { id: String(refund.id) };
}
