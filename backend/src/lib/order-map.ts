import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfileById } from './mappers.js';
import {
  autoCompleteAtFrom,
  mapDispute,
  payoutBreakdown,
  type OrderDispute,
  type PayoutStatus,
} from './order-finance.js';

type DbRow = Record<string, unknown>;

export async function mapOrderJson(
  supabase: SupabaseClient,
  row: DbRow,
  options?: { includeSellerFinance?: boolean; sellerPayoutVerified?: boolean },
) {
  const buyer = await getProfileById(supabase, String(row.buyer_id));
  const seller = await getProfileById(supabase, String(row.seller_id));

  let dispute: OrderDispute | null = null;
  const { data: disputeRow } = await supabase
    .from('order_disputes')
    .select('*')
    .eq('order_id', row.id)
    .maybeSingle();
  if (disputeRow) dispute = mapDispute(disputeRow as DbRow);

  const itemPrice = Number(row.item_price ?? 0);
  const payoutStatus = (row.payout_status as PayoutStatus) ?? 'not_yet_eligible';
  const base = {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    buyer: buyer?.username ?? 'unknown',
    seller: seller?.username ?? 'unknown',
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state ?? null,
    phone: row.phone,
    deliveryMethod: row.delivery_method,
    deliveryFee: row.delivery_fee,
    protectionFee: row.protection_fee ?? 0,
    itemPrice,
    listedPrice: row.listed_price ?? null,
    offerId: row.offer_id ?? null,
    total: row.total,
    fromLiveId: row.from_live_id,
    liveStreamProductId: row.live_stream_product_id ?? undefined,
    claimId: row.claim_id ?? undefined,
    createdAt: row.created_at,
    status: row.status,
    reviewed: row.reviewed,
    cancelReason: row.cancel_reason ?? undefined,
    trackingNumber: row.tracking_number ?? null,
    trackingCarrier: row.tracking_carrier ?? null,
    paidAt: row.paid_at ?? row.created_at,
    dispatchedAt: row.dispatched_at ?? null,
    inTransitAt: row.in_transit_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    completedAt: row.completed_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    autoCompleteAt: row.auto_complete_at ?? null,
    payoutStatus,
    dispute,
  };

  if (!options?.includeSellerFinance) return base;

  return {
    ...base,
    payout: {
      ...payoutBreakdown(itemPrice),
      status: payoutStatus,
      verificationRequired: options.sellerPayoutVerified === false,
    },
  };
}

/** Complete delivered orders whose 48h window passed with no open dispute. */
export async function runAutoCompleteDueOrders(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const { data: due } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'delivered')
    .lte('auto_complete_at', now)
    .limit(50);

  for (const row of due ?? []) {
    const { data: dispute } = await supabase
      .from('order_disputes')
      .select('id, status')
      .eq('order_id', row.id)
      .maybeSingle();
    if (dispute && ['open', 'under_review'].includes(String(dispute.status))) continue;

    await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: now,
        auto_complete_at: null,
        payout_status: 'eligible',
      })
      .eq('id', row.id)
      .eq('status', 'delivered');
  }
}

export { autoCompleteAtFrom };
