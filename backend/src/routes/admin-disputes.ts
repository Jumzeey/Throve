import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import { ensurePayoutForOrder } from '../lib/admin-payouts.js';
import { createRefundFromDispute } from '../lib/admin-refunds.js';
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

type DisputeDbStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'closed';
type DecisionOutcome = 'refund_buyer' | 'release_seller' | 'close';
type DisputeEventAction =
  | 'opened'
  | 'seller_responded'
  | 'evidence_added'
  | 'note'
  | 'escalated'
  | 'decided';

const reasonBody = z.object({ reason: z.string().trim().min(3) });
const decideBody = z.object({
  outcome: z.enum(['refund_buyer', 'release_seller', 'close']),
  reason: z.string().trim().min(3),
});

const routeRoles = ROUTE_ROLES.disputes;

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

function uiStatus(status: DisputeDbStatus): string {
  if (status === 'open') return 'Open';
  if (status === 'under_review') return 'With T&S';
  if (status === 'resolved_buyer') return 'Approved for refund';
  if (status === 'resolved_seller') return 'Denied';
  return 'Closed';
}

function uiDecision(decision: string | null | undefined): string | undefined {
  if (decision === 'refund_buyer') return 'Refund buyer';
  if (decision === 'release_seller') return 'Release to seller';
  if (decision === 'close') return 'Close';
  return undefined;
}

function deriveQueue(row: {
  status: string;
  seller_response: string;
  evidence_urls: string[] | null;
}): 'open' | 'decision_ready' | 'evidence_incomplete' | 'awaiting_buyer' {
  const status = String(row.status);
  const evidence = Array.isArray(row.evidence_urls) ? row.evidence_urls : [];
  const sellerResponse = String(row.seller_response ?? '').trim();
  if (status !== 'open' && status !== 'under_review') return 'open';
  if (status === 'under_review' && sellerResponse && evidence.length >= 1) return 'decision_ready';
  if (status === 'under_review' && sellerResponse && evidence.length === 0) return 'awaiting_buyer';
  if (status === 'under_review' && evidence.length === 0) return 'evidence_incomplete';
  return 'open';
}

function matchesQueue(
  row: { status: string; seller_response: string; evidence_urls: string[] | null },
  queue: string,
) {
  const status = String(row.status);
  const derived = deriveQueue(row);
  if (queue === 'open') return status === 'open' || status === 'under_review';
  if (queue === 'decision_ready') return derived === 'decision_ready';
  if (queue === 'evidence_incomplete') return derived === 'evidence_incomplete';
  if (queue === 'awaiting_buyer') return derived === 'awaiting_buyer';
  if (queue === 'all') return true;
  return status === 'open' || status === 'under_review';
}

async function recordDisputeEvent(
  disputeId: string,
  actorId: string | null,
  action: DisputeEventAction,
  reason?: string | null,
) {
  const service = createServiceClient();
  const { error } = await service.from('dispute_events').insert({
    dispute_id: disputeId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
  if (error) {
    console.warn('[admin/disputes] event write failed', error.message);
  }
}

function mapHistoryEvent(row: {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  actor_username?: string | null;
}) {
  const by = row.actor_username ? `@${row.actor_username}` : 'Staff';
  const titles: Record<string, string> = {
    opened: 'Dispute opened',
    seller_responded: 'Seller responded',
    evidence_added: 'Evidence added',
    note: 'Internal note added',
    escalated: 'Escalated to Trust & Safety',
    decided: 'Decision recorded',
  };
  const title = titles[row.action] ?? row.action;
  const detail = row.reason?.trim() ? `${title} — ${row.reason.trim()}` : title;
  return {
    at: formatAt(row.created_at),
    text: detail,
    by,
  };
}

async function loadDisputeHistory(disputeId: string, openedAt?: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('dispute_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const names = await getSellerMap(service, actorIds);

  const history = rows.map((row) =>
    mapHistoryEvent({
      id: String(row.id),
      action: String(row.action),
      reason: row.reason ? String(row.reason) : null,
      created_at: String(row.created_at),
      actor_username: row.actor_id ? names.get(String(row.actor_id)) ?? null : null,
    }),
  );

  if (history.length === 0 && openedAt) {
    history.push({
      at: formatAt(openedAt),
      text: 'Dispute opened',
      by: 'System',
    });
  }

  return history;
}

function buildTimeline(order: Record<string, unknown>, disputeCreatedAt: string) {
  const entries: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[] =
    [];
  const push = (id: string, iso: unknown, title: string, tone?: 'default' | 'warn' | 'danger' | 'ok', detail?: string) => {
    if (!iso) return;
    entries.push({ id, at: formatAt(String(iso)), title, detail, tone });
  };
  push('created', order.created_at, 'Order created');
  push('paid', order.paid_at, 'Paid', 'ok');
  push('dispatched', order.dispatched_at, 'Dispatched');
  push('transit', order.in_transit_at, 'In transit');
  push('delivered', order.delivered_at, 'Delivered', 'ok');
  push('dispute', disputeCreatedAt, 'Dispute opened', 'warn', String(order.id ?? ''));
  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

function mapAdminDispute(
  row: Record<string, unknown>,
  order: Record<string, unknown> | null,
  names: Map<string, string>,
  extras?: {
    history?: { at: string; text: string; by: string }[];
    timeline?: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
    decidedByName?: string | null;
  },
) {
  const status = String(row.status) as DisputeDbStatus;
  const evidenceUrls = Array.isArray(row.evidence_urls) ? (row.evidence_urls as string[]) : [];
  const sellerResponse = String(row.seller_response ?? '');
  const buyerNote = String(row.buyer_note ?? '');
  const buyerId = order ? String(order.buyer_id) : '';
  const sellerId = order ? String(order.seller_id) : '';
  const buyer = buyerId ? names.get(buyerId) ?? 'unknown' : 'unknown';
  const seller = sellerId ? names.get(sellerId) ?? 'unknown' : 'unknown';
  const amount = order ? Number(order.item_price ?? 0) : 0;
  const payoutStatus = order ? String(order.payout_status ?? '') : '';
  const queue = deriveQueue({
    status,
    seller_response: sellerResponse,
    evidence_urls: evidenceUrls,
  });
  const decision = uiDecision(row.decision ? String(row.decision) : null);
  const createdAt = String(row.created_at);

  const statements: { party: 'buyer' | 'seller'; handle: string; at: string; text: string }[] = [];
  if (buyerNote.trim()) {
    statements.push({
      party: 'buyer',
      handle: buyer,
      at: formatAt(createdAt),
      text: buyerNote,
    });
  }
  if (sellerResponse.trim()) {
    statements.push({
      party: 'seller',
      handle: seller,
      at: formatAt(String(row.updated_at ?? createdAt)),
      text: sellerResponse,
    });
  }

  const evidenceThumbs = evidenceUrls.map((url, i) => ({
    id: `ev-${i}`,
    label: `Evidence ${i + 1}`,
    url,
  }));
  const evidenceLinks = evidenceUrls.map((url, i) => ({
    id: `link-${i}`,
    label: `Open evidence ${i + 1}`,
    url,
  }));
  const evidence = evidenceUrls.map((url, i) => ({
    id: `file-${i}`,
    label: `Evidence ${i + 1}`,
    url,
  }));

  return {
    id: String(row.id),
    orderId: String(row.order_id),
    listingId: order?.listing_id ? String(order.listing_id) : undefined,
    paymentId: order?.id ? `PAY-${String(order.id)}` : undefined,
    reason: String(row.reason ?? ''),
    status: uiStatus(status),
    dbStatus: status,
    queue,
    openedAt: createdAt,
    openLabel: openLabel(createdAt),
    buyer,
    seller,
    amount,
    priority: 'P2' as const,
    aiPriority: 'Med' as const,
    payoutOnHold: payoutStatus === 'on_hold',
    evidenceComplete: evidenceUrls.length > 0,
    decisionReady: queue === 'decision_ready',
    aiSummary: '',
    aiRecommendation: '',
    aiConfidence: 'medium' as const,
    suggestedOutcome: '—',
    statements,
    evidenceThumbs,
    evidenceLinks,
    evidence,
    timeline: extras?.timeline ?? (order ? buildTimeline(order, createdAt) : []),
    history: extras?.history ?? [],
    decision,
    defaultReason: row.decision_reason ? String(row.decision_reason) : undefined,
    decidedBy: extras?.decidedByName ?? undefined,
    decidedAt: row.resolved_at ? openLabel(String(row.resolved_at)) : undefined,
    unassigned: false,
  };
}

async function loadOrderMap(orderIds: string[]) {
  const service = createServiceClient();
  if (!orderIds.length) return new Map<string, Record<string, unknown>>();
  const { data, error } = await service.from('orders').select('*').in('id', orderIds);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [String(row.id), row as Record<string, unknown>]));
}

async function loadDisputeDetailPayload(disputeId: string) {
  const service = createServiceClient();
  const { data: row, error } = await service.from('order_disputes').select('*').eq('id', disputeId).maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const orderMap = await loadOrderMap([String(row.order_id)]);
  const order = orderMap.get(String(row.order_id)) ?? null;
  const profileIds = [
    order ? String(order.buyer_id) : '',
    order ? String(order.seller_id) : '',
    row.resolved_by ? String(row.resolved_by) : '',
  ].filter(Boolean);
  const names = await getSellerMap(service, profileIds);
  const history = await loadDisputeHistory(String(row.id), String(row.created_at)).catch(() => []);
  const timeline = order ? buildTimeline(order, String(row.created_at)) : [];
  const decidedByName = row.resolved_by ? names.get(String(row.resolved_by)) ?? null : null;

  return {
    dispute: mapAdminDispute(row as Record<string, unknown>, order, names, {
      history,
      timeline,
      decidedByName: decidedByName ? `@${decidedByName}` : null,
    }),
  };
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const service = createServiceClient();
  const queue = String(req.query.queue ?? 'open');
  const q = String(req.query.q ?? '').trim().toLowerCase();

  const { data, error } = await service
    .from('order_disputes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return handleSupabaseError(res, error);

  const rows = data ?? [];
  const orderMap = await loadOrderMap(rows.map((r) => String(r.order_id)));
  const profileIds = new Set<string>();
  for (const order of orderMap.values()) {
    if (order.buyer_id) profileIds.add(String(order.buyer_id));
    if (order.seller_id) profileIds.add(String(order.seller_id));
  }
  const names = await getSellerMap(service, [...profileIds]);

  let disputes = rows
    .filter((row) =>
      matchesQueue(
        {
          status: String(row.status),
          seller_response: String(row.seller_response ?? ''),
          evidence_urls: Array.isArray(row.evidence_urls) ? (row.evidence_urls as string[]) : [],
        },
        queue,
      ),
    )
    .map((row) => {
      const order = orderMap.get(String(row.order_id)) ?? null;
      return mapAdminDispute(row as Record<string, unknown>, order, names);
    });

  if (q) {
    disputes = disputes.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.orderId.toLowerCase().includes(q) ||
        d.buyer.toLowerCase().includes(q) ||
        d.seller.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q),
    );
  }

  const allForCounts = rows.map((row) => ({
    status: String(row.status),
    seller_response: String(row.seller_response ?? ''),
    evidence_urls: Array.isArray(row.evidence_urls) ? (row.evidence_urls as string[]) : [],
  }));

  return res.json({
    disputes,
    counts: {
      open: allForCounts.filter((r) => r.status === 'open' || r.status === 'under_review').length,
      decision_ready: allForCounts.filter((r) => deriveQueue(r) === 'decision_ready').length,
      evidence_incomplete: allForCounts.filter((r) => deriveQueue(r) === 'evidence_incomplete').length,
      awaiting_buyer: allForCounts.filter((r) => deriveQueue(r) === 'awaiting_buyer').length,
    },
  });
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const id = String(req.params.id);
    const payload = await loadDisputeDetailPayload(id);
    if (!payload) return sendError(res, 404, 'Dispute not found', 'NOT_FOUND');
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string; code?: string });
    }
    return sendError(res, 500, 'Failed to load dispute', 'ERROR');
  }
});

router.post('/:id/decide', requireStaffAuth, requireStaffAction('decide_dispute'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = decideBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Outcome and reason are required', 'VALIDATION');

  const disputeId = String(req.params.id);
  const outcome = parsed.data.outcome as DecisionOutcome;
  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('order_disputes')
    .select('*')
    .eq('id', disputeId)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Dispute not found', 'NOT_FOUND');

  const status = String(existing.status);
  if (status !== 'open' && status !== 'under_review') {
    return sendError(res, 409, 'Dispute already decided', 'CONFLICT');
  }

  const nextStatus: DisputeDbStatus =
    outcome === 'refund_buyer' ? 'resolved_buyer' : outcome === 'release_seller' ? 'resolved_seller' : 'closed';
  const now = new Date().toISOString();

  const { data, error } = await service
    .from('order_disputes')
    .update({
      status: nextStatus,
      decision: outcome,
      decision_reason: parsed.data.reason,
      resolved_at: now,
      resolved_by: userId,
    })
    .eq('id', disputeId)
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  if (outcome === 'release_seller' || outcome === 'close') {
    const { data: order } = await service
      .from('orders')
      .select('id, payout_status')
      .eq('id', data.order_id)
      .maybeSingle();
    if (order && String(order.payout_status) === 'on_hold') {
      const { error: payoutError } = await service
        .from('orders')
        .update({ payout_status: 'eligible' })
        .eq('id', order.id);
      if (payoutError) {
        console.warn('[admin/disputes] payout release failed', payoutError.message);
      }
    }
    void ensurePayoutForOrder(service, {
      orderId: String(data.order_id),
      intent: 'eligible',
      disputeId: String(data.id),
      actorId: userId,
      reason: parsed.data.reason,
    }).catch((err) => {
      console.warn('[admin/disputes] payout ensure failed', err instanceof Error ? err.message : err);
    });
  }

  await recordDisputeEvent(String(data.id), userId, 'decided', `${outcome}: ${parsed.data.reason}`);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'dispute.decide',
    resourceType: 'dispute',
    resourceId: String(data.id),
    reason: parsed.data.reason,
    sensitivity: 'High',
    meta: { outcome, orderId: data.order_id, status: nextStatus },
  });

  if (outcome === 'refund_buyer') {
    void createRefundFromDispute(service, {
      disputeId: String(data.id),
      orderId: String(data.order_id),
      decidedBy: userId,
      decidedAt: now,
      decisionReason: parsed.data.reason,
    }).catch((err) => {
      console.warn('[admin/disputes] refund create failed', err instanceof Error ? err.message : err);
    });
    void ensurePayoutForOrder(service, {
      orderId: String(data.order_id),
      intent: 'cancelled',
      disputeId: String(data.id),
      actorId: userId,
      reason: parsed.data.reason,
    }).catch((err) => {
      console.warn('[admin/disputes] payout cancel failed', err instanceof Error ? err.message : err);
    });
  }

  const payload = await loadDisputeDetailPayload(String(data.id));
  return res.json(payload);
});

router.post('/:id/note', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const disputeId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('order_disputes')
    .select('id, order_id')
    .eq('id', disputeId)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Dispute not found', 'NOT_FOUND');

  await recordDisputeEvent(String(existing.id), userId, 'note', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'dispute.note',
    resourceType: 'dispute',
    resourceId: String(existing.id),
    reason: parsed.data.reason,
    sensitivity: 'Standard',
    meta: { orderId: existing.order_id },
  });

  const payload = await loadDisputeDetailPayload(String(existing.id));
  return res.json(payload);
});

router.post('/:id/escalate', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const disputeId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('order_disputes')
    .select('*')
    .eq('id', disputeId)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Dispute not found', 'NOT_FOUND');

  if (String(existing.status) === 'open') {
    const { error: statusError } = await service
      .from('order_disputes')
      .update({ status: 'under_review' })
      .eq('id', existing.id);
    if (statusError) return handleSupabaseError(res, statusError);
  }

  await recordDisputeEvent(String(existing.id), userId, 'escalated', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'dispute.escalate',
    resourceType: 'dispute',
    resourceId: String(existing.id),
    reason: parsed.data.reason,
    sensitivity: 'High',
    meta: { orderId: existing.order_id },
  });

  const payload = await loadDisputeDetailPayload(String(existing.id));
  return res.json(payload);
});

export default router;
