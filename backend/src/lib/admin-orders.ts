import { createServiceClient } from './supabase.js';

export type OrderDbStatus =
  | 'paid'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type OrderUiStatus =
  | 'Paid'
  | 'Awaiting dispatch'
  | 'In transit'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled'
  | 'Disputed';

export type OrderFlag = 'dispute' | 'hold' | 'cancellable' | 'payout' | 'refund' | 'verify';

export type OrderEventAction = 'note' | 'escalated';

export type RelatedPayment = {
  id: string;
  tx_ref: string;
  status: string;
};

export type RelatedDispute = {
  id: string;
  status: string;
};

export type RelatedRefund = {
  id: string;
  status: string;
};

export type RelatedPayout = {
  id: string;
  status: string;
};

const OPEN_DISPUTE = new Set(['open', 'under_review']);
const ACTIVE_REFUND = new Set(['awaiting_finance', 'ready', 'processing', 'uncertain']);

export function uiStatusFromDb(
  dbStatus: string,
  openDispute: boolean,
): OrderUiStatus {
  if (openDispute) return 'Disputed';
  const map: Record<string, OrderUiStatus> = {
    paid: 'Paid',
    dispatched: 'Awaiting dispatch',
    in_transit: 'In transit',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[dbStatus] ?? 'Paid';
}

export function paymentStatusLabel(
  payment: RelatedPayment | null | undefined,
  orderStatus: string,
): 'Confirmed' | 'Uncertain' {
  if (payment?.status === 'successful') return 'Confirmed';
  if (payment?.status === 'pending' || payment?.status === 'failed') return 'Uncertain';
  // Paid (or later) without a successful intent is uncertain
  if (orderStatus !== 'cancelled' && !payment) return 'Uncertain';
  return 'Confirmed';
}

export function deriveFlags(input: {
  dbStatus: string;
  payoutStatus: string;
  openDispute: boolean;
  payment: RelatedPayment | null;
  refund: RelatedRefund | null;
  payout: RelatedPayout | null;
}): OrderFlag[] {
  const flags: OrderFlag[] = [];
  if (input.openDispute) flags.push('dispute');
  if (input.payoutStatus === 'on_hold') flags.push('hold');
  if (input.dbStatus === 'paid') flags.push('cancellable');
  if (input.payout && input.payout.status !== 'cancelled') flags.push('payout');
  if (input.refund) flags.push('refund');
  if (
    input.payment &&
    (input.payment.status === 'pending' || input.payment.status === 'failed')
  ) {
    flags.push('verify');
  }
  return flags;
}

export function needsAssistance(input: {
  openDispute: boolean;
  payoutStatus: string;
  payment: RelatedPayment | null;
  refund: RelatedRefund | null;
  escalated: boolean;
}): boolean {
  if (input.openDispute) return true;
  if (input.payoutStatus === 'on_hold') return true;
  if (
    input.payment &&
    (input.payment.status === 'pending' || input.payment.status === 'failed')
  ) {
    return true;
  }
  if (input.refund && ACTIVE_REFUND.has(input.refund.status)) return true;
  if (input.escalated) return true;
  return false;
}

export function isOpenDispute(status: string | null | undefined): boolean {
  return Boolean(status && OPEN_DISPUTE.has(status));
}

export function queueMatchesDb(queue: string): OrderDbStatus | null {
  if (queue === 'paid') return 'paid';
  if (queue === 'awaiting_dispatch') return 'dispatched';
  if (queue === 'in_transit') return 'in_transit';
  if (queue === 'delivered') return 'delivered';
  if (queue === 'completed') return 'completed';
  if (queue === 'cancelled') return 'cancelled';
  // UI chip labels also used as queue ids on the page
  if (queue === 'Paid') return 'paid';
  if (queue === 'Awaiting dispatch') return 'dispatched';
  if (queue === 'In transit') return 'in_transit';
  if (queue === 'Delivered') return 'delivered';
  if (queue === 'Completed') return 'completed';
  if (queue === 'Cancelled') return 'cancelled';
  return null;
}

export async function recordOrderEvent(
  orderId: string,
  actorId: string | null,
  action: OrderEventAction,
  reason?: string | null,
) {
  const service = createServiceClient();
  const { error } = await service.from('order_events').insert({
    order_id: orderId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
  if (error) console.warn('[admin/orders] event write failed', error.message);
}

export function deliveryAreaFrom(city: unknown, state: unknown): string | undefined {
  const c = city ? String(city).trim() : '';
  const s = state ? String(state).trim() : '';
  if (c && s) return `${c}, ${s}`;
  if (c) return c;
  if (s) return s;
  return undefined;
}

export function formatAt(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

export function openLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
