/** Seller fee model aligned with Hi-Fi payout summary. */
export const THROVE_COMMISSION_RATE = 0.075;

export function paymentProcessingFee(itemPrice: number) {
  return Math.max(200, Math.round(itemPrice * 0.02));
}

export function throveCommission(itemPrice: number) {
  return Math.round(itemPrice * THROVE_COMMISSION_RATE);
}

export function netPayout(itemPrice: number) {
  return Math.max(0, itemPrice - throveCommission(itemPrice) - paymentProcessingFee(itemPrice));
}

export const AUTO_COMPLETE_HOURS = 48;

export function autoCompleteAtFrom(deliveredAt: string | Date) {
  const base = typeof deliveredAt === 'string' ? new Date(deliveredAt) : deliveredAt;
  return new Date(base.getTime() + AUTO_COMPLETE_HOURS * 60 * 60 * 1000).toISOString();
}

export type PayoutStatus =
  | 'not_yet_eligible'
  | 'eligible'
  | 'processing'
  | 'paid_out'
  | 'on_hold'
  | 'failed';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_buyer'
  | 'resolved_seller'
  | 'closed';

export type OrderDispute = {
  id: string;
  orderId: string;
  reason: string;
  status: DisputeStatus;
  buyerNote: string;
  sellerResponse: string;
  evidenceUrls: string[];
  createdAt: string;
  resolvedAt?: string | null;
};

export function mapDispute(row: Record<string, unknown>): OrderDispute {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    reason: String(row.reason ?? ''),
    status: (row.status as DisputeStatus) ?? 'under_review',
    buyerNote: String(row.buyer_note ?? ''),
    sellerResponse: String(row.seller_response ?? ''),
    evidenceUrls: Array.isArray(row.evidence_urls) ? (row.evidence_urls as string[]) : [],
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  };
}

export function payoutBreakdown(itemPrice: number) {
  const commission = throveCommission(itemPrice);
  const processingFee = paymentProcessingFee(itemPrice);
  return {
    itemSalePrice: itemPrice,
    commissionRate: THROVE_COMMISSION_RATE,
    commission,
    processingFee,
    netPayout: Math.max(0, itemPrice - commission - processingFee),
  };
}
