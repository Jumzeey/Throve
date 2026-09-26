import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { getSellerMap } from '../lib/mappers.js';
import { getProviderByName, type ProviderOpResult } from '../lib/payments/provider.js';
import { applyRefundOutcome, failedResult, providerForRef } from '../lib/payments/settle.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';
import type { RefundDbStatus } from '../lib/admin-refunds.js';

const router = Router();
const routeRoles = ROUTE_ROLES.refunds;

type RefundEventAction = 'created' | 'note' | 'execute' | 'retry' | 'completed' | 'failed' | 'verify';

const reasonBody = z.object({ reason: z.string().trim().min(3) });
const executeBody = z.object({
  reason: z.string().trim().min(3),
  includeDelivery: z.boolean().optional(),
});

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

function uiStatus(status: RefundDbStatus): string {
  const map: Record<RefundDbStatus, string> = {
    awaiting_finance: 'Awaiting Finance',
    ready: 'Ready to execute',
    processing: 'Processing',
    completed: 'Completed',
    uncertain: 'Status uncertain',
    failed: 'Failed',
  };
  return map[status] ?? status;
}

function queueToStatuses(queue: string): RefundDbStatus[] | null {
  if (queue === 'awaiting') return ['awaiting_finance'];
  if (queue === 'ready') return ['ready'];
  if (queue === 'processing') return ['processing'];
  if (queue === 'completed') return ['completed'];
  if (queue === 'uncertain') return ['uncertain', 'failed'];
  if (queue === 'all') return null;
  return ['awaiting_finance'];
}

function computeTotal(
  row: {
    item_amount: number;
    buyer_protection_amount: number;
    buyer_protection_included: boolean;
    delivery_amount: number;
  },
  includeDelivery: boolean,
) {
  return (
    Number(row.item_amount) +
    (row.buyer_protection_included ? Number(row.buyer_protection_amount) : 0) +
    (includeDelivery ? Number(row.delivery_amount) : 0)
  );
}

async function recordRefundEvent(
  refundId: string,
  actorId: string | null,
  action: RefundEventAction,
  reason?: string | null,
) {
  const service = createServiceClient();
  const { error } = await service.from('refund_events').insert({
    refund_id: refundId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
  if (error) console.warn('[admin/refunds] event write failed', error.message);
}

async function loadRefundHistory(refundId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('refund_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('refund_id', refundId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const names = await getSellerMap(
    service,
    [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[],
  );

  const titles: Record<string, string> = {
    created: 'Refund queued for Finance',
    note: 'Internal note added',
    execute: 'Refund execution submitted',
    retry: 'Retry submitted',
    completed: 'Refund completed',
    failed: 'Refund failed',
    verify: 'Provider status verified',
  };

  return rows.map((row) => {
    const by = row.actor_id ? names.get(String(row.actor_id)) : null;
    const title = titles[String(row.action)] ?? String(row.action);
    const detailParts = [by ? `@${by}` : 'System'];
    if (row.reason) detailParts.push(String(row.reason));
    return {
      id: String(row.id),
      at: formatAt(String(row.created_at)),
      title,
      detail: detailParts.join(' · '),
    };
  });
}

function mapAdminRefund(
  row: Record<string, unknown>,
  extras: {
    buyerUsername: string;
    decidedByName?: string | null;
    processingByName?: string | null;
    completedByName?: string | null;
    orderStatus?: string;
    paymentProvider?: string | null;
    history?: { id: string; at: string; title: string; detail?: string }[];
  },
) {
  const status = String(row.status) as RefundDbStatus;
  const includeDelivery = row.include_delivery === null || row.include_delivery === undefined
    ? null
    : Boolean(row.include_delivery);
  const needsDelivery = Boolean(row.needs_delivery_determination);
  const deliveryStatus: 'include' | 'exclude' | 'in_question' | 'not_applicable' =
    Number(row.delivery_amount) <= 0
      ? 'not_applicable'
      : includeDelivery === true
        ? 'include'
        : includeDelivery === false
          ? 'exclude'
          : 'in_question';

  const totalFinal = row.total_amount != null ? Number(row.total_amount) : undefined;
  const totalLabel =
    totalFinal != null
      ? String(totalFinal)
      : needsDelivery && includeDelivery === null
        ? 'Not final'
        : String(
            computeTotal(
              {
                item_amount: Number(row.item_amount),
                buyer_protection_amount: Number(row.buyer_protection_amount),
                buyer_protection_included: Boolean(row.buyer_protection_included),
                delivery_amount: Number(row.delivery_amount),
              },
              includeDelivery === true,
            ),
          );

  const disputeId = row.dispute_id ? String(row.dispute_id) : undefined;
  const paymentId = row.payment_intent_id ? String(row.payment_intent_id) : '';

  return {
    id: String(row.id),
    orderId: String(row.order_id),
    buyer: extras.buyerUsername,
    createdAt: openLabel(String(row.created_at)),
    status: uiStatus(status),
    dbStatus: status,
    origin: 'Eligible dispute' as const,
    originDetail: String(row.origin_detail ?? ''),
    decisionId: disputeId,
    decidedBy: extras.decidedByName ?? undefined,
    decidedAt: row.decided_at ? openLabel(String(row.decided_at)) : undefined,
    itemAmount: Number(row.item_amount ?? 0),
    buyerProtectionAmount: Number(row.buyer_protection_amount ?? 0),
    buyerProtectionIncluded: Boolean(row.buyer_protection_included),
    deliveryAmount: Number(row.delivery_amount ?? 0),
    deliveryStatus,
    deliveryNote: needsDelivery ? 'Confirm whether delivery fee is refunded' : undefined,
    totalFinal,
    totalLabel,
    needsDeliveryDetermination: needsDelivery && includeDelivery === null,
    paymentId: paymentId || `PAY-${row.order_id}`,
    disputeId,
    orderStatusLabel: extras.orderStatus ?? '—',
    whyExists: String(row.origin_detail ?? 'Buyer-win dispute approved for refund'),
    linkedRecords: [
      ...(disputeId
        ? [
            {
              id: disputeId,
              kind: 'dispute' as const,
              label: 'Dispute',
              openLabel: 'Open decision',
            },
          ]
        : []),
      {
        id: String(row.order_id),
        kind: 'order' as const,
        label: 'Order',
        openLabel: 'Open order',
      },
      ...(paymentId
        ? [
            {
              id: paymentId,
              kind: 'payment' as const,
              label: 'Payment',
              openLabel: 'Open payment',
            },
          ]
        : []),
    ],
    history: extras.history ?? [],
    processingAt: row.processing_at ? openLabel(String(row.processing_at)) : undefined,
    processingBy: extras.processingByName ?? undefined,
    completedAt: row.completed_at ? openLabel(String(row.completed_at)) : undefined,
    completedBy: extras.completedByName ?? undefined,
    failedRetryAvailable: status === 'failed',
    paymentProvider: extras.paymentProvider ?? null,
  };
}

async function loadRefundDetailPayload(refundId: string) {
  const service = createServiceClient();
  const { data: row, error } = await service.from('refunds').select('*').eq('id', refundId).maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { data: order } = await service
    .from('orders')
    .select('status')
    .eq('id', row.order_id)
    .maybeSingle();

  let paymentProvider: string | null = null;
  if (row.payment_intent_id) {
    const { data: intent } = await service
      .from('payment_intents')
      .select('provider')
      .eq('id', row.payment_intent_id)
      .maybeSingle();
    paymentProvider = intent?.provider ? String(intent.provider) : null;
  }

  const profileIds = [row.buyer_id, row.decided_by, row.processing_by, row.completed_by]
    .filter(Boolean)
    .map(String);
  const names = await getSellerMap(service, profileIds);
  const history = await loadRefundHistory(String(row.id)).catch(() => []);

  return {
    refund: mapAdminRefund(row as Record<string, unknown>, {
      buyerUsername: names.get(String(row.buyer_id)) ?? 'unknown',
      decidedByName: row.decided_by ? `@${names.get(String(row.decided_by)) ?? 'staff'}` : null,
      processingByName: row.processing_by ? `@${names.get(String(row.processing_by)) ?? 'staff'}` : null,
      completedByName: row.completed_by ? `@${names.get(String(row.completed_by)) ?? 'staff'}` : null,
      orderStatus: order?.status ? String(order.status) : undefined,
      paymentProvider,
      history,
    }),
  };
}

async function runExecute(
  refundId: string,
  userId: string,
  adminRole: StaffRequest['adminRole'],
  reason: string,
  includeDelivery: boolean | undefined,
  isRetry: boolean,
) {
  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('refunds')
    .select('*')
    .eq('id', refundId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return { kind: 'not_found' as const };

  const status = String(existing.status) as RefundDbStatus;
  if (status === 'processing' || status === 'completed') {
    return { kind: 'already' as const };
  }
  if (isRetry && status !== 'failed') {
    return { kind: 'conflict' as const, message: 'Only failed refunds can be retried' };
  }
  if (!isRetry && status !== 'ready' && status !== 'awaiting_finance' && status !== 'uncertain') {
    return { kind: 'conflict' as const, message: 'Refund is not ready to execute' };
  }

  let include = existing.include_delivery as boolean | null;
  if (typeof includeDelivery === 'boolean') {
    include = includeDelivery;
  }
  if (Boolean(existing.needs_delivery_determination) && include === null) {
    return { kind: 'validation' as const, message: 'Delivery include/exclude is required' };
  }
  const includeFinal = include === true;

  const total = computeTotal(
    {
      item_amount: Number(existing.item_amount),
      buyer_protection_amount: Number(existing.buyer_protection_amount),
      buyer_protection_included: Boolean(existing.buyer_protection_included),
      delivery_amount: Number(existing.delivery_amount),
    },
    includeFinal,
  );

  const now = new Date().toISOString();

  let intentProvider: string | null = null;
  let txProviderRef: string | null = null;
  if (existing.payment_intent_id) {
    const { data: intent } = await service
      .from('payment_intents')
      .select('provider, provider_ref')
      .eq('id', existing.payment_intent_id)
      .maybeSingle();
    intentProvider = intent?.provider ? String(intent.provider) : null;
    txProviderRef = intent?.provider_ref ? String(intent.provider_ref) : null;
  }
  const provider = getProviderByName(intentProvider === 'flutterwave' ? 'flutterwave' : 'simulate');
  if (provider.name === 'flutterwave' && !txProviderRef) {
    return { kind: 'conflict' as const, message: 'Original Flutterwave transaction reference is missing' };
  }

  const { data: processingRow, error: processingError } = await service
    .from('refunds')
    .update({
      status: 'processing',
      include_delivery: includeFinal,
      needs_delivery_determination: false,
      total_amount: total,
      processing_at: now,
      processing_by: userId,
      failed_at: null,
    })
    .eq('id', refundId)
    .select('*')
    .single();
  if (processingError) throw processingError;

  await recordRefundEvent(refundId, userId, isRetry ? 'retry' : 'execute', reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: isRetry ? 'refund.retry' : 'refund.execute',
    resourceType: 'refund',
    resourceId: refundId,
    reason,
    sensitivity: 'High',
    meta: {
      orderId: processingRow.order_id,
      total,
      includeDelivery: includeFinal,
      provider: provider.name,
    },
  });

  let result: ProviderOpResult;
  try {
    result = await provider.refund({ refundId, txProviderRef: txProviderRef ?? '', amount: total });
  } catch (err) {
    result = failedResult(err);
  }
  await applyRefundOutcome(service, refundId, result, userId, provider.name);

  return { kind: 'ok' as const };
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const service = createServiceClient();
  const queue = String(req.query.queue ?? 'awaiting');
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const statuses = queueToStatuses(queue);

  let query = service.from('refunds').select('*').order('created_at', { ascending: false }).limit(200);
  if (statuses) query = query.in('status', statuses);

  const { data, error } = await query;
  if (error) return handleSupabaseError(res, error);

  const rows = data ?? [];
  const buyerIds = [...new Set(rows.map((r) => String(r.buyer_id)))];
  const names = await getSellerMap(service, buyerIds);

  let refunds = rows.map((row) =>
    mapAdminRefund(row as Record<string, unknown>, {
      buyerUsername: names.get(String(row.buyer_id)) ?? 'unknown',
    }),
  );

  if (q) {
    refunds = refunds.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q),
    );
  }

  const { data: allRows } = await service.from('refunds').select('status');
  const counts = {
    awaiting: 0,
    ready: 0,
    processing: 0,
    completed: 0,
    uncertain: 0,
  };
  for (const row of allRows ?? []) {
    const s = String(row.status);
    if (s === 'awaiting_finance') counts.awaiting += 1;
    else if (s === 'ready') counts.ready += 1;
    else if (s === 'processing') counts.processing += 1;
    else if (s === 'completed') counts.completed += 1;
    else if (s === 'uncertain' || s === 'failed') counts.uncertain += 1;
  }

  return res.json({ refunds, counts });
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const payload = await loadRefundDetailPayload(String(req.params.id));
    if (!payload) return sendError(res, 404, 'Refund not found', 'NOT_FOUND');
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string; code?: string });
    }
    return sendError(res, 500, 'Failed to load refund', 'ERROR');
  }
});

router.post('/:id/execute', requireStaffAuth, requireStaffAction('execute_refund'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = executeBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  try {
    const result = await runExecute(
      String(req.params.id),
      userId,
      adminRole,
      parsed.data.reason,
      parsed.data.includeDelivery,
      false,
    );
    if (result.kind === 'not_found') return sendError(res, 404, 'Refund not found', 'NOT_FOUND');
    if (result.kind === 'already') {
      return sendError(res, 409, 'Refund already executed', 'ALREADY_APPLIED');
    }
    if (result.kind === 'validation') return sendError(res, 400, result.message, 'VALIDATION');
    if (result.kind === 'conflict') return sendError(res, 409, result.message, 'CONFLICT');

    const payload = await loadRefundDetailPayload(String(req.params.id));
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string; code?: string });
    }
    return sendError(res, 500, 'Execute failed', 'ERROR');
  }
});

router.post('/:id/retry', requireStaffAuth, requireStaffAction('execute_refund'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  try {
    const result = await runExecute(String(req.params.id), userId, adminRole, parsed.data.reason, undefined, true);
    if (result.kind === 'not_found') return sendError(res, 404, 'Refund not found', 'NOT_FOUND');
    if (result.kind === 'already') {
      return sendError(res, 409, 'Refund already executed', 'ALREADY_APPLIED');
    }
    if (result.kind === 'validation') return sendError(res, 400, result.message, 'VALIDATION');
    if (result.kind === 'conflict') return sendError(res, 409, result.message, 'CONFLICT');

    const payload = await loadRefundDetailPayload(String(req.params.id));
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string; code?: string });
    }
    return sendError(res, 500, 'Retry failed', 'ERROR');
  }
});

router.post('/:id/note', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const refundId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error } = await service.from('refunds').select('id, order_id').eq('id', refundId).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!existing) return sendError(res, 404, 'Refund not found', 'NOT_FOUND');

  await recordRefundEvent(refundId, userId, 'note', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'refund.note',
    resourceType: 'refund',
    resourceId: refundId,
    reason: parsed.data.reason,
    sensitivity: 'Standard',
    meta: { orderId: existing.order_id },
  });

  const payload = await loadRefundDetailPayload(refundId);
  return res.json(payload);
});

router.post('/:id/verify', requireStaffAuth, requireStaffAction('execute_refund'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const refundId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error } = await service.from('refunds').select('*').eq('id', refundId).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!existing) return sendError(res, 404, 'Refund not found', 'NOT_FOUND');

  const status = String(existing.status);
  if (status === 'completed') {
    return sendError(res, 409, 'Refund already completed', 'ALREADY_APPLIED');
  }

  let note = 'Provider status checked · no provider refund id';
  if (existing.provider_ref) {
    const provider = providerForRef(String(existing.provider_ref));
    try {
      const result = await provider.refundStatus(String(existing.provider_ref));
      if (result.status !== 'pending') {
        await applyRefundOutcome(service, refundId, result, userId, provider.name);
      }
      note = `${provider.name} status: ${result.status}`;
    } catch (err) {
      note = err instanceof Error ? err.message : 'Provider status check failed';
    }
  } else if (status === 'processing' || status === 'uncertain' || status === 'failed') {
    const { error: updError } = await service
      .from('refunds')
      .update({ status: 'uncertain' })
      .eq('id', refundId);
    if (updError) return handleSupabaseError(res, updError);
  }

  await recordRefundEvent(refundId, userId, 'verify', note);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'refund.verify',
    resourceType: 'refund',
    resourceId: refundId,
    reason: 'Provider status checked',
    sensitivity: 'Standard',
    meta: { orderId: existing.order_id },
  });

  const payload = await loadRefundDetailPayload(refundId);
  return res.json(payload);
});

export default router;
