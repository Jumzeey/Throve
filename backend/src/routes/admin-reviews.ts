import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import {
  buildEligibility,
  commentSummary,
  deriveStatus,
  loadReviewEvents,
  mapEventsToHistory,
  matchesQueue,
  openLabel,
  recordReviewEvent,
  type AdminReviewDto,
  type EligibilityContext,
  type ReviewQueue,
  type ReviewRow,
} from '../lib/admin-reviews.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.reviews;
const MERGE_LIMIT = 300;
const reasonBody = z.object({ reason: z.string().trim().min(3) });

async function fetchUsernameMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const service = createServiceClient();
  const { data, error } = await service.from('profiles').select('id, username').in('id', unique);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(String(row.id), String(row.username));
  }
  return map;
}

type OrderLite = { id: string; status: string; buyer_id: string; seller_id: string };

function buildDto(
  row: ReviewRow,
  names: Map<string, string>,
  order: OrderLite | null,
  reviewsForOrder: number,
  sellerStats: { avg: number; count: number },
  history: AdminReviewDto['history'] = [],
): AdminReviewDto {
  const ctx: EligibilityContext = {
    orderStatus: order?.status ?? null,
    orderBuyerId: order?.buyer_id ?? null,
    reviewsForOrder,
  };
  const eligibility = buildEligibility(row, ctx);
  const derived = deriveStatus(row, eligibility);
  const hasComment = Boolean(String(row.comment ?? '').trim()) || row.comment_hidden;
  const seller = names.get(row.seller_id) ?? 'unknown';
  const buyer = names.get(row.buyer_id) ?? 'unknown';
  const orderId = row.order_id ?? '—';
  const submittedAt = openLabel(row.created_at);

  const linkedRecords: AdminReviewDto['linkedRecords'] = [];
  if (derived.reported) {
    linkedRecords.push({
      id: 'reports',
      kind: 'report',
      label: 'review under review',
      openLabel: 'Open reports',
    });
  }
  if (row.order_id) {
    linkedRecords.push({
      id: row.order_id,
      kind: 'order',
      label: order?.status ?? 'order',
      openLabel: 'Open order',
    });
  }
  linkedRecords.push({
    id: `@${seller}`,
    kind: 'user',
    label: 'seller account',
    openLabel: 'Open user',
  });

  let headerMeta = `Submitted ${submittedAt}`;
  if (derived.status === 'Hidden') headerMeta = `Comment hidden · ${headerMeta}`;
  else if (derived.reported) headerMeta = `Under review · ${headerMeta}`;
  else if (derived.eligibilityAnomaly) headerMeta = `Eligibility anomaly · ${headerMeta}`;
  else if (derived.duplicateAnomaly) headerMeta = `Duplicate anomaly · ${headerMeta}`;

  return {
    id: row.id,
    orderId,
    seller,
    buyer,
    rating: Number(row.rating),
    comment: String(row.comment ?? ''),
    commentSummary: commentSummary(row),
    status: derived.status,
    flagged: derived.flagged,
    reported: derived.reported,
    hasComment,
    eligibilityAnomaly: derived.eligibilityAnomaly,
    duplicateAnomaly: derived.duplicateAnomaly,
    submittedAt,
    headerMeta,
    aiSummary: '',
    aiUnavailable: true,
    eligibility,
    linkedRecords,
    sellerAvg: sellerStats.avg,
    sellerReviewCount: sellerStats.count,
    sellerRatingNote:
      sellerStats.count > 0
        ? `${sellerStats.avg.toFixed(1)} avg across ${sellerStats.count} review${sellerStats.count === 1 ? '' : 's'} (hidden comments still count)`
        : 'No other reviews yet',
    history,
    createdAt: submittedAt,
  };
}

async function loadOrdersAndCounts(rows: ReviewRow[]) {
  const service = createServiceClient();
  const orderIds = [...new Set(rows.map((r) => r.order_id).filter(Boolean) as string[])];
  const orders = new Map<string, OrderLite>();
  if (orderIds.length) {
    const { data, error } = await service
      .from('orders')
      .select('id, status, buyer_id, seller_id')
      .in('id', orderIds);
    if (error) throw error;
    for (const o of data ?? []) {
      orders.set(String(o.id), {
        id: String(o.id),
        status: String(o.status),
        buyer_id: String(o.buyer_id),
        seller_id: String(o.seller_id),
      });
    }
  }

  const countByOrder = new Map<string, number>();
  for (const row of rows) {
    if (!row.order_id) continue;
    countByOrder.set(row.order_id, (countByOrder.get(row.order_id) ?? 0) + 1);
  }
  // Also count siblings outside the merge window
  if (orderIds.length) {
    const { data, error } = await service
      .from('reviews')
      .select('order_id')
      .in('order_id', orderIds);
    if (error) throw error;
    const full = new Map<string, number>();
    for (const r of data ?? []) {
      const oid = String(r.order_id);
      full.set(oid, (full.get(oid) ?? 0) + 1);
    }
    for (const [k, v] of full) countByOrder.set(k, v);
  }

  return { orders, countByOrder };
}

async function sellerStatsMap(sellerIds: string[]) {
  const unique = [...new Set(sellerIds)];
  const map = new Map<string, { avg: number; count: number }>();
  if (!unique.length) return map;
  const service = createServiceClient();
  const { data, error } = await service.from('reviews').select('seller_id, rating').in('seller_id', unique);
  if (error) throw error;
  const buckets = new Map<string, number[]>();
  for (const r of data ?? []) {
    const sid = String(r.seller_id);
    const list = buckets.get(sid) ?? [];
    list.push(Number(r.rating));
    buckets.set(sid, list);
  }
  for (const [sid, ratings] of buckets) {
    const count = ratings.length;
    const avg = count ? ratings.reduce((a, b) => a + b, 0) / count : 0;
    map.set(sid, { avg, count });
  }
  return map;
}

async function mergeReviews(queue: ReviewQueue, q: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('reviews')
    .select(
      'id, seller_id, buyer_id, order_id, rating, comment, created_at, comment_hidden, hidden_at, hidden_by, escalated_at',
    )
    .order('created_at', { ascending: false })
    .limit(MERGE_LIMIT);
  if (error) throw error;

  const rows = (data ?? []).map((r) => ({
    ...r,
    comment_hidden: Boolean(r.comment_hidden),
    hidden_at: r.hidden_at ? String(r.hidden_at) : null,
    hidden_by: r.hidden_by ? String(r.hidden_by) : null,
    escalated_at: r.escalated_at ? String(r.escalated_at) : null,
    order_id: r.order_id ? String(r.order_id) : null,
    comment: String(r.comment ?? ''),
    created_at: String(r.created_at),
    id: String(r.id),
    seller_id: String(r.seller_id),
    buyer_id: String(r.buyer_id),
    rating: Number(r.rating),
  })) as ReviewRow[];

  const names = await fetchUsernameMap([
    ...rows.map((r) => r.seller_id),
    ...rows.map((r) => r.buyer_id),
  ]);
  const { orders, countByOrder } = await loadOrdersAndCounts(rows);
  const sellerStats = await sellerStatsMap(rows.map((r) => r.seller_id));

  const reviews = rows.map((row) =>
    buildDto(
      row,
      names,
      row.order_id ? orders.get(row.order_id) ?? null : null,
      row.order_id ? countByOrder.get(row.order_id) ?? 1 : 1,
      sellerStats.get(row.seller_id) ?? { avg: 0, count: 0 },
    ),
  );

  const counts = {
    all: reviews.length,
    flagged: reviews.filter((r) => matchesQueue(r, 'flagged')).length,
    reported: reviews.filter((r) => matchesQueue(r, 'reported')).length,
    eligibility: reviews.filter((r) => matchesQueue(r, 'eligibility')).length,
    with_comment: reviews.filter((r) => matchesQueue(r, 'with_comment')).length,
  };

  const qLower = q.trim().toLowerCase();
  const filtered = reviews.filter((r) => {
    if (!matchesQueue(r, queue)) return false;
    if (!qLower) return true;
    return (
      r.id.toLowerCase().includes(qLower) ||
      r.orderId.toLowerCase().includes(qLower) ||
      r.seller.toLowerCase().includes(qLower) ||
      r.buyer.toLowerCase().includes(qLower) ||
      r.comment.toLowerCase().includes(qLower) ||
      r.commentSummary.toLowerCase().includes(qLower)
    );
  });

  return { reviews: filtered, counts };
}

async function loadOne(id: string): Promise<AdminReviewDto | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('reviews')
    .select(
      'id, seller_id, buyer_id, order_id, rating, comment, created_at, comment_hidden, hidden_at, hidden_by, escalated_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row: ReviewRow = {
    id: String(data.id),
    seller_id: String(data.seller_id),
    buyer_id: String(data.buyer_id),
    order_id: data.order_id ? String(data.order_id) : null,
    rating: Number(data.rating),
    comment: String(data.comment ?? ''),
    created_at: String(data.created_at),
    comment_hidden: Boolean(data.comment_hidden),
    hidden_at: data.hidden_at ? String(data.hidden_at) : null,
    hidden_by: data.hidden_by ? String(data.hidden_by) : null,
    escalated_at: data.escalated_at ? String(data.escalated_at) : null,
  };

  const names = await fetchUsernameMap([row.seller_id, row.buyer_id]);
  const { orders, countByOrder } = await loadOrdersAndCounts([row]);
  const sellerStats = await sellerStatsMap([row.seller_id]);
  const events = await loadReviewEvents(row.id);
  const actorNames = await fetchUsernameMap(
    events.map((e) => e.actor_id).filter(Boolean) as string[],
  );
  const history = mapEventsToHistory(events, actorNames, row.created_at);

  return buildDto(
    row,
    names,
    row.order_id ? orders.get(row.order_id) ?? null : null,
    row.order_id ? countByOrder.get(row.order_id) ?? 1 : 1,
    sellerStats.get(row.seller_id) ?? { avg: 0, count: 0 },
    history,
  );
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const queue = String(req.query.queue ?? 'flagged') as ReviewQueue;
  const q = String(req.query.q ?? '');
  try {
    const { reviews, counts } = await mergeReviews(queue, q);
    return res.json({ reviews, counts });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const review = await loadOne(String(req.params.id));
    if (!review) return sendError(res, 404, 'Review not found');
    return res.json({ review });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

router.post(
  '/:id/note',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const staff = req as StaffRequest;
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');
    const id = String(req.params.id);

    try {
      const existing = await loadOne(id);
      if (!existing) return sendError(res, 404, 'Review not found');

      await recordReviewEvent(id, staff.userId, 'note', body.data.reason);
      await writeAdminAudit(createServiceClient(), {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'review.note',
        resourceType: 'review',
        resourceId: id,
        reason: body.data.reason,
      });
      const review = await loadOne(id);
      return res.json({ review });
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/escalate',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const staff = req as StaffRequest;
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');
    const id = String(req.params.id);

    try {
      const service = createServiceClient();
      const { data: row, error } = await service
        .from('reviews')
        .select('id, escalated_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return sendError(res, 404, 'Review not found');
      if (row.escalated_at) {
        return sendError(res, 409, 'Already escalated', 'ALREADY_APPLIED');
      }

      const { error: updErr } = await service
        .from('reviews')
        .update({ escalated_at: new Date().toISOString() })
        .eq('id', id)
        .is('escalated_at', null);
      if (updErr) throw updErr;

      await recordReviewEvent(id, staff.userId, 'escalated', body.data.reason);
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'review.escalate',
        resourceType: 'review',
        resourceId: id,
        reason: body.data.reason,
        sensitivity: 'High',
      });
      const review = await loadOne(id);
      return res.json({ review });
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/hide',
  requireStaffAuth,
  requireStaffAction('hide_review'),
  async (req, res) => {
    const staff = req as StaffRequest;
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');
    const id = String(req.params.id);

    try {
      const service = createServiceClient();
      const { data: row, error } = await service
        .from('reviews')
        .select('id, comment, comment_hidden')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return sendError(res, 404, 'Review not found');
      if (row.comment_hidden) {
        return sendError(res, 409, 'Comment already hidden', 'ALREADY_APPLIED');
      }
      if (!String(row.comment ?? '').trim()) {
        return sendError(res, 409, 'No written comment to hide', 'CONFLICT');
      }

      const { error: updErr } = await service
        .from('reviews')
        .update({
          comment_hidden: true,
          hidden_at: new Date().toISOString(),
          hidden_by: staff.userId,
        })
        .eq('id', id)
        .eq('comment_hidden', false);
      if (updErr) throw updErr;

      await recordReviewEvent(id, staff.userId, 'comment_hidden', body.data.reason);
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'review.hide',
        resourceType: 'review',
        resourceId: id,
        reason: body.data.reason,
        sensitivity: 'High',
      });
      const review = await loadOne(id);
      return res.json({ review });
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

export default router;
