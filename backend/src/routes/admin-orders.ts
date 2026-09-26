import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import {
  deliveryAreaFrom,
  deriveFlags,
  formatAt,
  isOpenDispute,
  needsAssistance,
  openLabel,
  paymentStatusLabel,
  queueMatchesDb,
  recordOrderEvent,
  uiStatusFromDb,
  type OrderFlag,
  type RelatedDispute,
  type RelatedPayment,
  type RelatedPayout,
  type RelatedRefund,
} from '../lib/admin-orders.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { getSellerMap } from '../lib/mappers.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.orders;

const reasonBody = z.object({ reason: z.string().trim().min(3) });

type TimelineEntry = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  tone?: 'default' | 'warn' | 'danger' | 'ok';
};

function mapAdminOrder(
  row: Record<string, unknown>,
  extras: {
    buyerUsername: string;
    sellerUsername: string;
    department: string;
    category: string;
    condition: string;
    payment: RelatedPayment | null;
    dispute: RelatedDispute | null;
    refund: RelatedRefund | null;
    payout: RelatedPayout | null;
    escalated: boolean;
    timeline?: TimelineEntry[];
  },
) {
  const dbStatus = String(row.status);
  const payoutStatus = String(row.payout_status ?? 'not_yet_eligible');
  const openDispute = isOpenDispute(extras.dispute?.status);
  const uiStatus = uiStatusFromDb(dbStatus, openDispute);
  const paymentStatus = paymentStatusLabel(extras.payment, dbStatus);
  const flags = deriveFlags({
    dbStatus,
    payoutStatus,
    openDispute,
    payment: extras.payment,
    refund: extras.refund,
    payout: extras.payout,
  });
  const assist = needsAssistance({
    openDispute,
    payoutStatus,
    payment: extras.payment,
    refund: extras.refund,
    escalated: extras.escalated,
  });

  const createdAt = String(row.created_at);
  const deliveryMethod = String(row.delivery_method ?? 'Standard');
  const deliveryFee = Number(row.delivery_fee ?? 0);
  const city = row.city ? String(row.city) : '';
  const area = deliveryAreaFrom(row.city, row.state);

  const linkedRecords: {
    id: string;
    kind: 'dispute' | 'payment' | 'payout' | 'refund' | 'listing';
    label: string;
    financeOnly?: boolean;
  }[] = [
    {
      id: String(row.listing_id),
      kind: 'listing',
      label: String(row.listing_title ?? 'Listing'),
    },
  ];
  if (extras.dispute) {
    linkedRecords.push({
      id: extras.dispute.id,
      kind: 'dispute',
      label: extras.dispute.status,
    });
  }
  if (extras.payment) {
    linkedRecords.push({
      id: extras.payment.id,
      kind: 'payment',
      label: extras.payment.status,
      financeOnly: true,
    });
  }
  if (extras.payout) {
    linkedRecords.push({
      id: extras.payout.id,
      kind: 'payout',
      label: extras.payout.status,
      financeOnly: true,
    });
  }
  if (extras.refund) {
    linkedRecords.push({
      id: extras.refund.id,
      kind: 'refund',
      label: extras.refund.status,
      financeOnly: true,
    });
  }

  let cancellableBy: string | undefined;
  if (flags.includes('cancellable')) {
    cancellableBy = 'Buyer or seller (while Paid)';
  }

  return {
    id: String(row.id),
    listing: String(row.listing_title ?? 'Listing'),
    listingId: String(row.listing_id),
    buyer: extras.buyerUsername,
    seller: extras.sellerUsername,
    itemPrice: Number(row.item_price ?? 0),
    buyerProtection: Number(row.protection_fee ?? 0),
    deliveryFee,
    total: Number(row.total ?? 0),
    status: uiStatus,
    dbStatus,
    paymentStatus,
    delivery: city || deliveryMethod,
    deliveryMethod,
    deliveryLabel: `${deliveryMethod}${deliveryFee ? ` · ₦${deliveryFee.toLocaleString()}` : ''}`,
    deliveryArea: area,
    addressRestricted: true,
    createdAt: createdAt.slice(0, 10),
    placedAt: openLabel(createdAt),
    paymentId: extras.payment?.tx_ref ?? extras.payment?.id ?? '—',
    paymentIntentId: extras.payment?.id,
    payoutId: extras.payout?.id,
    refundId: extras.refund?.id,
    disputeId: extras.dispute?.id,
    department: extras.department,
    category: extras.category,
    condition: extras.condition,
    flags: flags as OrderFlag[],
    needsAssistance: assist,
    completionPaused: openDispute && dbStatus === 'delivered',
    cancellableBy,
    aiSummary: '',
    linkedRecords,
    timeline: extras.timeline ?? [],
  };
}

async function loadRelatedMaps(orderIds: string[]) {
  const service = createServiceClient();
  if (orderIds.length === 0) {
    return {
      paymentsByOrder: new Map<string, RelatedPayment>(),
      disputesByOrder: new Map<string, RelatedDispute>(),
      refundsByOrder: new Map<string, RelatedRefund>(),
      payoutsByOrder: new Map<string, RelatedPayout>(),
      escalatedOrders: new Set<string>(),
    };
  }

  const [paymentsRes, disputesRes, refundsRes, payoutsRes, escalatedRes] = await Promise.all([
    service
      .from('payment_intents')
      .select('id, tx_ref, status, order_id, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false }),
    service.from('order_disputes').select('id, status, order_id').in('order_id', orderIds),
    service
      .from('refunds')
      .select('id, status, order_id, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false }),
    service.from('payouts').select('id, status, order_id').in('order_id', orderIds),
    service
      .from('order_events')
      .select('order_id')
      .in('order_id', orderIds)
      .eq('action', 'escalated'),
  ]);

  if (paymentsRes.error) console.warn('[admin/orders] payments join', paymentsRes.error.message);
  if (disputesRes.error) console.warn('[admin/orders] disputes join', disputesRes.error.message);
  if (refundsRes.error) console.warn('[admin/orders] refunds join', refundsRes.error.message);
  if (payoutsRes.error) console.warn('[admin/orders] payouts join', payoutsRes.error.message);
  if (escalatedRes.error) console.warn('[admin/orders] events join', escalatedRes.error.message);

  const paymentsByOrder = new Map<string, RelatedPayment>();
  for (const p of paymentsRes.data ?? []) {
    const oid = String(p.order_id);
    if (paymentsByOrder.has(oid)) continue;
    paymentsByOrder.set(oid, {
      id: String(p.id),
      tx_ref: String(p.tx_ref),
      status: String(p.status),
    });
  }

  const disputesByOrder = new Map<string, RelatedDispute>();
  for (const d of disputesRes.data ?? []) {
    disputesByOrder.set(String(d.order_id), {
      id: String(d.id),
      status: String(d.status),
    });
  }

  const refundsByOrder = new Map<string, RelatedRefund>();
  for (const r of refundsRes.data ?? []) {
    const oid = String(r.order_id);
    if (refundsByOrder.has(oid)) continue;
    refundsByOrder.set(oid, { id: String(r.id), status: String(r.status) });
  }

  const payoutsByOrder = new Map<string, RelatedPayout>();
  for (const p of payoutsRes.data ?? []) {
    payoutsByOrder.set(String(p.order_id), {
      id: String(p.id),
      status: String(p.status),
    });
  }

  const escalatedOrders = new Set(
    (escalatedRes.data ?? []).map((e) => String(e.order_id)),
  );

  return {
    paymentsByOrder,
    disputesByOrder,
    refundsByOrder,
    payoutsByOrder,
    escalatedOrders,
  };
}

async function enrichOrders(rows: Record<string, unknown>[]) {
  const service = createServiceClient();
  if (rows.length === 0) return [] as ReturnType<typeof mapAdminOrder>[];

  const orderIds = rows.map((r) => String(r.id));
  const buyerIds = [...new Set(rows.map((r) => String(r.buyer_id)))];
  const sellerIds = [...new Set(rows.map((r) => String(r.seller_id)))];
  const listingIds = [...new Set(rows.map((r) => String(r.listing_id)))];

  const [nameMap, listingsRes, related] = await Promise.all([
    getSellerMap(service, [...buyerIds, ...sellerIds]),
    service
      .from('listings')
      .select('id, department, category, condition')
      .in('id', listingIds),
    loadRelatedMaps(orderIds),
  ]);

  if (listingsRes.error) throw listingsRes.error;
  const listingMap = new Map(
    (listingsRes.data ?? []).map((l) => [
      String(l.id),
      l as { id: string; department: string; category: string; condition: string },
    ]),
  );

  return rows.map((row) => {
    const oid = String(row.id);
    const listing = listingMap.get(String(row.listing_id));
    return mapAdminOrder(row, {
      buyerUsername: nameMap.get(String(row.buyer_id)) ?? 'unknown',
      sellerUsername: nameMap.get(String(row.seller_id)) ?? 'unknown',
      department: listing?.department ? String(listing.department) : '—',
      category: listing?.category ? String(listing.category) : '—',
      condition: listing?.condition ? String(listing.condition) : '—',
      payment: related.paymentsByOrder.get(oid) ?? null,
      dispute: related.disputesByOrder.get(oid) ?? null,
      refund: related.refundsByOrder.get(oid) ?? null,
      payout: related.payoutsByOrder.get(oid) ?? null,
      escalated: related.escalatedOrders.has(oid),
    });
  });
}

async function buildTimeline(orderId: string, row: Record<string, unknown>): Promise<TimelineEntry[]> {
  const service = createServiceClient();
  const entries: TimelineEntry[] = [];

  const push = (
    id: string,
    at: string | null | undefined,
    title: string,
    detail?: string,
    tone?: TimelineEntry['tone'],
  ) => {
    if (!at) return;
    entries.push({
      id,
      at: formatAt(String(at)),
      title,
      detail,
      tone,
    });
  };

  push('t-paid', row.paid_at ? String(row.paid_at) : String(row.created_at), 'Order paid', 'Lifecycle');
  push('t-dispatched', row.dispatched_at ? String(row.dispatched_at) : null, 'Dispatched', 'Seller');
  push('t-transit', row.in_transit_at ? String(row.in_transit_at) : null, 'In transit', 'Tracking');
  push('t-delivered', row.delivered_at ? String(row.delivered_at) : null, 'Delivered', 'Seller');
  push('t-completed', row.completed_at ? String(row.completed_at) : null, 'Completed', undefined, 'ok');
  push(
    't-cancelled',
    row.cancelled_at ? String(row.cancelled_at) : null,
    'Cancelled',
    row.cancel_reason ? String(row.cancel_reason) : undefined,
    'danger',
  );

  const { data: staffEvents } = await service
    .from('order_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  const actorIds = [
    ...new Set((staffEvents ?? []).map((e) => e.actor_id).filter(Boolean)),
  ] as string[];
  const names = await getSellerMap(service, actorIds);

  for (const ev of staffEvents ?? []) {
    const by = ev.actor_id ? names.get(String(ev.actor_id)) : null;
    const detailParts = [by ? `@${by}` : 'System'];
    if (ev.reason) detailParts.push(String(ev.reason));
    entries.push({
      id: String(ev.id),
      at: formatAt(String(ev.created_at)),
      title: ev.action === 'escalated' ? 'Order escalated' : 'Internal note added',
      detail: detailParts.join(' · '),
      tone: ev.action === 'escalated' ? 'warn' : 'default',
    });
  }

  // Lightweight related events
  const { data: dispute } = await service
    .from('order_disputes')
    .select('id, status, created_at')
    .eq('order_id', orderId)
    .maybeSingle();
  if (dispute) {
    push(
      `t-dispute-${dispute.id}`,
      String(dispute.created_at),
      'Dispute opened',
      String(dispute.status),
      'warn',
    );
  }

  entries.sort((a, b) => a.at.localeCompare(b.at));
  return entries;
}

async function loadOrderDetailPayload(orderId: string) {
  const service = createServiceClient();
  const { data: row, error } = await service
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const [mapped] = await enrichOrders([row as Record<string, unknown>]);
  if (!mapped) return null;
  const timeline = await buildTimeline(orderId, row as Record<string, unknown>);
  return { order: { ...mapped, timeline } };
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const queue = typeof req.query.queue === 'string' ? req.query.queue : 'needs_assistance';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  const service = createServiceClient();
  const { data, error } = await service
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return handleSupabaseError(res, error);

  let orders: Awaited<ReturnType<typeof enrichOrders>>;
  try {
    orders = await enrichOrders((data ?? []) as Record<string, unknown>[]);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string });
    }
    return sendError(res, 500, 'Could not load orders');
  }

  const counts = {
    needs_assistance: 0,
    paid: 0,
    awaiting_dispatch: 0,
    in_transit: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const o of orders) {
    if (o.needsAssistance) counts.needs_assistance += 1;
    if (o.dbStatus === 'paid') counts.paid += 1;
    if (o.dbStatus === 'dispatched') counts.awaiting_dispatch += 1;
    if (o.dbStatus === 'in_transit') counts.in_transit += 1;
    if (o.dbStatus === 'delivered') counts.delivered += 1;
    if (o.dbStatus === 'completed') counts.completed += 1;
    if (o.dbStatus === 'cancelled') counts.cancelled += 1;
  }

  const dbQueue = queueMatchesDb(queue);
  let filtered = orders;
  if (queue === 'needs_assistance') {
    filtered = orders.filter((o) => o.needsAssistance);
  } else if (dbQueue) {
    filtered = orders.filter((o) => o.dbStatus === dbQueue);
  }

  if (q) {
    filtered = filtered.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.listing.toLowerCase().includes(q) ||
        o.listingId.toLowerCase().includes(q) ||
        o.buyer.toLowerCase().includes(q) ||
        o.seller.toLowerCase().includes(q) ||
        o.paymentId.toLowerCase().includes(q),
    );
    // Widen search if queue filtered to empty
    if (filtered.length === 0) {
      filtered = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.listing.toLowerCase().includes(q) ||
          o.listingId.toLowerCase().includes(q) ||
          o.buyer.toLowerCase().includes(q) ||
          o.seller.toLowerCase().includes(q) ||
          o.paymentId.toLowerCase().includes(q),
      );
    }
  }

  return res.json({ orders: filtered, counts });
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const payload = await loadOrderDetailPayload(String(req.params.id));
    if (!payload) return sendError(res, 404, 'Order not found', 'NOT_FOUND');
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string });
    }
    return sendError(res, 500, 'Could not load order');
  }
});

router.post(
  '/:id/note',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const orderId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const service = createServiceClient();
    const { data: existing, error } = await service
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle();
    if (error) return handleSupabaseError(res, error);
    if (!existing) return sendError(res, 404, 'Order not found', 'NOT_FOUND');

    await recordOrderEvent(orderId, userId, 'note', parsed.data.reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'order.note',
      resourceType: 'order',
      resourceId: orderId,
      reason: parsed.data.reason,
      sensitivity: 'Standard',
    });

    try {
      const payload = await loadOrderDetailPayload(orderId);
      return res.json(payload);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Note saved but reload failed');
    }
  },
);

router.post(
  '/:id/escalate',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const orderId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const service = createServiceClient();
    const { data: existing, error } = await service
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle();
    if (error) return handleSupabaseError(res, error);
    if (!existing) return sendError(res, 404, 'Order not found', 'NOT_FOUND');

    await recordOrderEvent(orderId, userId, 'escalated', parsed.data.reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'order.escalate',
      resourceType: 'order',
      resourceId: orderId,
      reason: parsed.data.reason,
      sensitivity: 'High',
    });

    try {
      const payload = await loadOrderDetailPayload(orderId);
      return res.json(payload);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Escalation saved but reload failed');
    }
  },
);

export default router;
