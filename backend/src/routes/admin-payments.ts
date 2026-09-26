import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import {
  deriveUiStatus,
  deriveVerification,
  findDuplicateIds,
  maskProviderRef,
  needsAttentionUi,
  reconcilePaymentIntent,
  recordPaymentEvent,
  type PaymentDbStatus,
} from '../lib/admin-payments.js';
import { buyerProtectionFee, shippingFee } from '../lib/listing-catalog.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { getSellerMap } from '../lib/mappers.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.payments;

const reasonBody = z.object({ reason: z.string().trim().min(3) });

type CheckoutPayloadShape = {
  deliveryMethod?: string;
  name?: string;
};

function formatAt(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

function openLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function orderStatusLabel(status: string | null | undefined): string | undefined {
  if (!status) return undefined;
  const map: Record<string, string> = {
    paid: 'Paid',
    preparing: 'Preparing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  };
  return map[status] ?? status;
}

async function loadPaymentHistory(paymentIntentId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('payment_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('payment_intent_id', paymentIntentId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const names = await getSellerMap(
    service,
    [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[],
  );
  const titles: Record<string, string> = {
    created: 'Payment intent created',
    note: 'Internal note added',
    reconcile: 'Provider verification requested',
    status_changed: 'Status updated',
    escalated: 'Escalated to Finance',
  };

  return rows.map((row) => {
    const by = row.actor_id ? names.get(String(row.actor_id)) : null;
    const detailParts = [by ? `@${by}` : 'System'];
    if (row.reason) detailParts.push(String(row.reason));
    return {
      id: String(row.id),
      at: formatAt(String(row.created_at)),
      title: titles[String(row.action)] ?? String(row.action),
      detail: detailParts.join(' · '),
    };
  });
}

function mapAdminPayment(
  row: Record<string, unknown>,
  extras: {
    buyerUsername: string;
    itemTitle: string;
    itemPrice: number;
    deliveryFee: number;
    buyerProtection: number;
    deliveryMethod: string;
    uiStatus: ReturnType<typeof deriveUiStatus>;
    relatedAttempts: {
      id: string;
      at: string;
      amount: number;
      status: string;
      kind: 'payment' | 'order';
    }[];
    history?: { id: string; at: string; title: string; detail?: string }[];
    linkedRefundId?: string;
    linkedRefundLabel?: string;
    orderStatus?: string | null;
  },
) {
  const dbStatus = String(row.status) as PaymentDbStatus;
  const verification = deriveVerification(dbStatus);
  const needsAttention = needsAttentionUi(extras.uiStatus);
  const createdAt = String(row.created_at);

  let attentionTitle: string | undefined;
  let attentionBody: string | undefined;
  if (extras.uiStatus === 'Status uncertain') {
    attentionTitle = 'Awaiting provider confirmation';
    attentionBody =
      'No confirmed successful capture yet. Request provider verification before advising the buyer.';
  } else if (extras.uiStatus === 'Duplicate risk') {
    attentionTitle = 'Possible duplicate payment';
    attentionBody =
      'Another attempt matches this buyer, listing, and amount within 24 hours. Verify before refunding or advising.';
  } else if (extras.uiStatus === 'Confirmed failed') {
    attentionTitle = 'Provider confirmed failure';
    attentionBody = 'Do not mark paid. Buyer may retry checkout or open a support thread.';
  }

  const timeline = [
    {
      id: 't-created',
      at: formatAt(createdAt),
      title: 'Intent created',
      detail: String(row.provider ?? 'simulate'),
    },
    ...(row.provider_ref
      ? [
          {
            id: 't-provider',
            at: formatAt(createdAt),
            title: 'Provider reference recorded',
            detail: maskProviderRef(String(row.provider_ref)),
          },
        ]
      : []),
    ...(dbStatus === 'successful' && row.order_id
      ? [
          {
            id: 't-order',
            at: formatAt(String(row.updated_at ?? createdAt)),
            title: 'Order created',
            detail: String(row.order_id),
          },
        ]
      : []),
    ...(dbStatus === 'failed'
      ? [
          {
            id: 't-failed',
            at: formatAt(String(row.updated_at ?? createdAt)),
            title: 'Confirmed failed',
          },
        ]
      : []),
  ];

  return {
    id: String(row.id),
    txRef: String(row.tx_ref),
    orderId: row.order_id ? String(row.order_id) : '—',
    buyer: extras.buyerUsername,
    itemTitle: extras.itemTitle,
    itemPrice: extras.itemPrice,
    deliveryFee: extras.deliveryFee,
    deliveryMethod: extras.deliveryMethod,
    buyerProtection: extras.buyerProtection,
    amount: Number(row.amount ?? 0),
    status: extras.uiStatus,
    dbStatus,
    needsAttention,
    at: formatAt(createdAt),
    placedLabel: openLabel(createdAt),
    providerRefMasked: maskProviderRef(
      row.provider_ref ? String(row.provider_ref) : null,
    ),
    verification,
    environment: String(row.provider ?? 'simulate'),
    attentionTitle,
    attentionBody,
    timeline,
    relatedAttempts: extras.relatedAttempts,
    history: extras.history ?? [],
    linkedRefundId: extras.linkedRefundId,
    linkedRefundLabel: extras.linkedRefundLabel,
    orderStatusLabel: orderStatusLabel(extras.orderStatus),
    failedConfirmedAt:
      dbStatus === 'failed' ? openLabel(String(row.updated_at ?? createdAt)) : undefined,
  };
}

async function enrichIntentRows(rows: Record<string, unknown>[]) {
  const service = createServiceClient();
  if (rows.length === 0) {
    return {
      payments: [] as ReturnType<typeof mapAdminPayment>[],
      duplicateIds: new Set<string>(),
    };
  }

  const duplicateIds = findDuplicateIds(
    rows.map((r) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      listing_id: String(r.listing_id),
      amount: Number(r.amount),
      status: String(r.status),
      created_at: String(r.created_at),
    })),
  );

  const buyerIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const listingIds = [...new Set(rows.map((r) => String(r.listing_id)))];
  const orderIds = [
    ...new Set(rows.map((r) => r.order_id).filter(Boolean).map(String)),
  ];
  const intentIds = rows.map((r) => String(r.id));

  const refundOr = [
    intentIds.length ? `payment_intent_id.in.(${intentIds.join(',')})` : null,
    orderIds.length ? `order_id.in.(${orderIds.join(',')})` : null,
  ]
    .filter(Boolean)
    .join(',');

  const [buyerMap, listingsRes, ordersRes, refundsRes] = await Promise.all([
    getSellerMap(service, buyerIds),
    service.from('listings').select('id, title, price').in('id', listingIds),
    orderIds.length
      ? service
          .from('orders')
          .select('id, status, item_price, delivery_fee, protection_fee, delivery_method')
          .in('id', orderIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    refundOr
      ? service.from('refunds').select('id, payment_intent_id, order_id, status').or(refundOr)
      : Promise.resolve({ data: [] as { id: string; payment_intent_id: string | null; order_id: string | null; status: string }[], error: null }),
  ]);

  if (listingsRes.error) throw listingsRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (refundsRes.error) console.warn('[admin/payments] refunds join failed', refundsRes.error.message);

  const listingMap = new Map(
    (listingsRes.data ?? []).map((l) => [String(l.id), l as { id: string; title: string; price: number }]),
  );
  const orderMap = new Map(
    ((ordersRes.data ?? []) as Record<string, unknown>[]).map((o) => [String(o.id), o]),
  );
  const refundByIntent = new Map<string, { id: string; status: string }>();
  const refundByOrder = new Map<string, { id: string; status: string }>();
  for (const r of refundsRes.data ?? []) {
    const entry = { id: String(r.id), status: String(r.status) };
    if (r.payment_intent_id) refundByIntent.set(String(r.payment_intent_id), entry);
    if (r.order_id) refundByOrder.set(String(r.order_id), entry);
  }

  // Related attempts: same duplicate key within loaded set
  const byDupKey = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.user_id}|${r.listing_id}|${r.amount}`;
    const list = byDupKey.get(key) ?? [];
    list.push(r);
    byDupKey.set(key, list);
  }

  const payments = rows.map((row) => {
    const listing = listingMap.get(String(row.listing_id));
    const order = row.order_id ? orderMap.get(String(row.order_id)) : null;
    const payload = (row.checkout_payload ?? {}) as CheckoutPayloadShape;
    const deliveryMethod =
      (order?.delivery_method as string | undefined) ??
      payload.deliveryMethod ??
      'Standard';

    let itemPrice = Number(order?.item_price ?? listing?.price ?? 0);
    let deliveryFee = Number(order?.delivery_fee ?? 0);
    let buyerProtection = Number(order?.protection_fee ?? 0);
    const total = Number(row.amount ?? 0);
    if (!order) {
      const method = deliveryMethod === 'Express' ? 'Express' : 'Standard';
      deliveryFee = shippingFee(method);
      if (listing?.price != null) {
        itemPrice = Number(listing.price);
        buyerProtection = buyerProtectionFee(itemPrice);
        // Offer/live price may differ — back into item from total when mismatch
        if (itemPrice + deliveryFee + buyerProtection !== total) {
          itemPrice = Math.max(0, total - deliveryFee - buyerProtectionFee(Math.max(0, total - deliveryFee)));
          buyerProtection = Math.max(0, total - itemPrice - deliveryFee);
        }
      } else {
        buyerProtection = buyerProtectionFee(Math.max(0, total - deliveryFee));
        itemPrice = Math.max(0, total - deliveryFee - buyerProtection);
      }
    }

    const uiStatus = deriveUiStatus(
      {
        id: String(row.id),
        status: String(row.status),
        provider_ref: row.provider_ref ? String(row.provider_ref) : null,
        created_at: String(row.created_at),
      },
      duplicateIds,
    );

    const cluster = byDupKey.get(`${row.user_id}|${row.listing_id}|${row.amount}`) ?? [row];
    const relatedAttempts = cluster.map((c) => ({
      id: String(c.id),
      at: formatAt(String(c.created_at)).slice(11) || formatAt(String(c.created_at)),
      amount: Number(c.amount),
      status: deriveUiStatus(
        {
          id: String(c.id),
          status: String(c.status),
          provider_ref: c.provider_ref ? String(c.provider_ref) : null,
          created_at: String(c.created_at),
        },
        duplicateIds,
      ),
      kind: 'payment' as const,
    }));

    const refund =
      refundByIntent.get(String(row.id)) ??
      (row.order_id ? refundByOrder.get(String(row.order_id)) : undefined);

    return mapAdminPayment(row, {
      buyerUsername: buyerMap.get(String(row.user_id)) ?? 'unknown',
      itemTitle: listing?.title ?? 'Listing',
      itemPrice,
      deliveryFee,
      buyerProtection,
      deliveryMethod,
      uiStatus,
      relatedAttempts,
      linkedRefundId: refund?.id,
      linkedRefundLabel: refund ? `Refund · ${refund.status}` : undefined,
      orderStatus: order?.status ? String(order.status) : null,
    });
  });

  return { payments, duplicateIds };
}

function matchesQueue(
  payment: ReturnType<typeof mapAdminPayment>,
  queue: string,
): boolean {
  if (queue === 'needs_attention') return payment.needsAttention;
  if (queue === 'uncertain') return payment.status === 'Status uncertain';
  if (queue === 'failed') return payment.status === 'Confirmed failed';
  if (queue === 'duplicate') return payment.status === 'Duplicate risk';
  if (queue === 'successful') return payment.status === 'Successful';
  return true;
}

async function loadPaymentDetailPayload(paymentId: string) {
  const service = createServiceClient();
  const { data: row, error } = await service
    .from('payment_intents')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  // Load cluster for duplicate heuristics
  const windowStart = new Date(
    new Date(String(row.created_at)).getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const windowEnd = new Date(
    new Date(String(row.created_at)).getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: clusterRows } = await service
    .from('payment_intents')
    .select('*')
    .eq('user_id', row.user_id)
    .eq('listing_id', row.listing_id)
    .eq('amount', row.amount)
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd);

  const rows = (clusterRows?.length ? clusterRows : [row]) as Record<string, unknown>[];
  const { payments } = await enrichIntentRows(rows);
  const mapped = payments.find((p) => p.id === paymentId) ?? payments[0];
  if (!mapped) return null;

  const history = await loadPaymentHistory(paymentId);
  return { payment: { ...mapped, history } };
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const queue = typeof req.query.queue === 'string' ? req.query.queue : 'needs_attention';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  const service = createServiceClient();
  const { data, error } = await service
    .from('payment_intents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return handleSupabaseError(res, error);

  const rows = (data ?? []) as Record<string, unknown>[];
  let enriched: Awaited<ReturnType<typeof enrichIntentRows>>;
  try {
    enriched = await enrichIntentRows(rows);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string });
    }
    return sendError(res, 500, 'Could not load payments');
  }

  const counts = {
    needs_attention: 0,
    uncertain: 0,
    failed: 0,
    duplicate: 0,
    successful: 0,
  };
  for (const p of enriched.payments) {
    if (p.needsAttention) counts.needs_attention += 1;
    if (p.status === 'Status uncertain') counts.uncertain += 1;
    if (p.status === 'Confirmed failed') counts.failed += 1;
    if (p.status === 'Duplicate risk') counts.duplicate += 1;
    if (p.status === 'Successful') counts.successful += 1;
  }

  let payments = enriched.payments.filter((p) => matchesQueue(p, queue));
  if (q) {
    payments = payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.txRef.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.buyer.toLowerCase().includes(q) ||
        p.itemTitle.toLowerCase().includes(q),
    );
  }

  // Also allow search against buyer usernames already in DTO; for tx_ref/order raw DB miss
  // when queue filtered them out — if search present and no results, widen search across all
  if (q && payments.length === 0) {
    payments = enriched.payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.txRef.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.buyer.toLowerCase().includes(q) ||
        p.itemTitle.toLowerCase().includes(q),
    );
  }

  return res.json({ payments, counts });
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const payload = await loadPaymentDetailPayload(String(req.params.id));
    if (!payload) return sendError(res, 404, 'Payment not found', 'NOT_FOUND');
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string });
    }
    return sendError(res, 500, 'Could not load payment');
  }
});

router.post(
  '/:id/note',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const paymentId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const service = createServiceClient();
    const { data: existing, error } = await service
      .from('payment_intents')
      .select('id, order_id, tx_ref')
      .eq('id', paymentId)
      .maybeSingle();
    if (error) return handleSupabaseError(res, error);
    if (!existing) return sendError(res, 404, 'Payment not found', 'NOT_FOUND');

    await recordPaymentEvent(paymentId, userId, 'note', parsed.data.reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'payment.note',
      resourceType: 'payment_intent',
      resourceId: paymentId,
      reason: parsed.data.reason,
      sensitivity: 'Standard',
      meta: { orderId: existing.order_id, txRef: existing.tx_ref },
    });

    try {
      const payload = await loadPaymentDetailPayload(paymentId);
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
  '/:id/reconcile',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('reconcile_payment'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const paymentId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    try {
      const result = await reconcilePaymentIntent(paymentId, userId, parsed.data.reason);
      if (result.kind === 'already_applied') {
        return sendError(res, 409, 'Payment already reconciled', 'ALREADY_APPLIED');
      }
      if (result.kind === 'conflict') {
        return sendError(res, 409, result.message, 'CONFLICT');
      }

      const service = createServiceClient();
      void writeAdminAudit(service, {
        actorId: userId,
        actorRole: adminRole,
        action: 'payment.reconcile',
        resourceType: 'payment_intent',
        resourceId: paymentId,
        reason: parsed.data.reason,
        sensitivity: 'High',
        meta: {
          providerStatus: result.providerStatus,
          orderId: result.intent.order_id ?? null,
          txRef: result.intent.tx_ref,
        },
      });

      const payload = await loadPaymentDetailPayload(paymentId);
      return res.json(payload);
    } catch (err) {
      const status =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as { status: number }).status)
          : 500;
      if (status === 404) return sendError(res, 404, 'Payment not found', 'NOT_FOUND');
      return sendError(
        res,
        status || 500,
        err instanceof Error ? err.message : 'Could not reconcile payment',
      );
    }
  },
);

export default router;
