import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import { listingPublishedEmail, listingRejectedEmail } from '../lib/email/templates/listings.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { notifyFollowersOfListing } from '../lib/follows.js';
import { getProfileById, getSellerMap, mapListing } from '../lib/mappers.js';
import { notifyUser } from '../lib/notify.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();

type ReviewEventAction =
  | 'submitted'
  | 'resubmitted'
  | 'approved'
  | 'rejected'
  | 'hidden'
  | 'restored'
  | 'note'
  | 'escalated';

const reasonBody = z.object({ reason: z.string().trim().min(3) });
const optionalReasonBody = z.object({
  reason: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length >= 3 ? trimmed : undefined;
    }),
});

async function recordReviewEvent(
  listingId: string,
  actorId: string,
  action: ReviewEventAction,
  reason?: string | null,
) {
  const service = createServiceClient();
  const { error } = await service.from('listing_review_events').insert({
    listing_id: listingId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
  if (error) {
    console.warn('[admin/listings] review event write failed', error.message);
  }
}

function formatHistoryAt(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

function mapHistoryEvent(row: {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  actor_id: string | null;
  actor_username?: string | null;
}) {
  const actor = row.actor_username ? `@${row.actor_username}` : row.actor_id ? 'Staff' : 'System';
  const reason = row.reason?.trim() || null;
  const titles: Record<string, { title: string; tone?: 'ok' | 'warn' | 'danger' }> = {
    submitted: { title: 'Submitted for review' },
    resubmitted: { title: 'Resubmitted for review' },
    approved: { title: 'Approved · now live', tone: 'ok' },
    rejected: { title: 'Rejected · needs changes', tone: 'danger' },
    hidden: { title: 'Removed from public marketplace', tone: 'danger' },
    restored: { title: 'Visibility restored', tone: 'ok' },
    note: { title: 'Internal note added' },
    escalated: { title: 'Escalated', tone: 'warn' },
  };
  const meta = titles[row.action] ?? { title: row.action };
  const detailParts = [actor];
  if (reason) detailParts.push(reason);
  return {
    id: row.id,
    at: formatHistoryAt(row.created_at),
    title: meta.title,
    detail: detailParts.join(' · '),
    tone: meta.tone,
  };
}

async function loadListingHistory(listingId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('listing_review_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await service.from('profiles').select('id, username').in('id', actorIds);
    for (const p of profiles ?? []) {
      names.set(String(p.id), String(p.username));
    }
  }

  return rows.map((row) =>
    mapHistoryEvent({
      id: String(row.id),
      action: String(row.action),
      reason: row.reason ? String(row.reason) : null,
      created_at: String(row.created_at),
      actor_id: row.actor_id ? String(row.actor_id) : null,
      actor_username: row.actor_id ? names.get(String(row.actor_id)) ?? null : null,
    }),
  );
}

router.get('/', requireStaffAuth, async (req, res) => {
  const { adminRole } = req as StaffRequest;
  const service = createServiceClient();
  const queue = String(req.query.queue ?? 'pending');
  const q = String(req.query.q ?? '').trim().toLowerCase();

  let query = service.from('listings').select('*').order('review_submitted_at', { ascending: true, nullsFirst: false });

  if (queue === 'pending') query = query.eq('status', 'pending_review');
  else if (queue === 'rejected') query = query.eq('status', 'rejected');
  else if (queue === 'available') query = query.eq('status', 'available');
  else if (queue === 'reserved') query = query.eq('status', 'reserved');
  else if (queue === 'sold') query = query.eq('status', 'sold');
  else if (queue === 'hidden') query = query.eq('status', 'hidden');
  else if (queue === 'removed') query = query.eq('status', 'removed');
  else if (queue === 'all') {
    /* no status filter */
  } else {
    query = query.eq('status', 'pending_review');
  }

  const { data, error } = await query.limit(200);
  if (error) return handleSupabaseError(res, error);

  const rows = data ?? [];
  const sellerMap = await getSellerMap(
    service,
    rows.map((row) => String(row.seller_id)),
  );

  let listings = rows.map((row) => mapListing(row as never, sellerMap.get(String(row.seller_id)) ?? 'unknown'));

  if (q) {
    listings = listings.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.seller.toLowerCase().includes(q),
    );
  }

  const pendingCount = (
    await service.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending_review')
  ).count;

  return res.json({
    listings,
    counts: {
      pending: pendingCount ?? 0,
    },
    viewerRole: adminRole,
  });
});

router.get('/:id', requireStaffAuth, async (req, res) => {
  const service = createServiceClient();
  const { data, error } = await service.from('listings').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Listing not found', 'NOT_FOUND');

  const seller = await getProfileById(service, String(data.seller_id));
  const sellerUsername = seller?.username ?? 'unknown';
  let history: ReturnType<typeof mapHistoryEvent>[] = [];
  try {
    history = await loadListingHistory(String(data.id));
  } catch (err) {
    console.warn('[admin/listings] history load failed', err instanceof Error ? err.message : err);
  }

  return res.json({
    listing: mapListing(data as never, sellerUsername),
    history,
  });
});

router.post('/:id/approve', requireStaffAuth, requireStaffAction('approve_listing'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = optionalReasonBody.safeParse(req.body ?? {});
  if (!parsed.success) return sendError(res, 400, 'Invalid body', 'VALIDATION');
  const note = parsed.data.reason;

  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Listing not found', 'NOT_FOUND');
  if (String(existing.status) !== 'pending_review') {
    return sendError(res, 409, 'Only pending listings can be approved', 'CONFLICT');
  }

  const now = new Date().toISOString();
  const { data, error } = await service
    .from('listings')
    .update({
      status: 'available',
      review_reason: null,
      reviewed_at: now,
      reviewed_by: userId,
    })
    .eq('id', req.params.id)
    .eq('status', 'pending_review')
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  const seller = await getProfileById(service, String(data.seller_id));
  const sellerUsername = seller?.username ?? 'unknown';

  void recordReviewEvent(data.id, userId, 'approved', note ?? null);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'listing.approve',
    resourceType: 'listing',
    resourceId: String(data.id),
    reason: note ?? null,
    sensitivity: 'Standard',
    meta: { title: data.title, sellerId: data.seller_id },
  });

  void notifyUser({
    userId: String(data.seller_id),
    category: 'account',
    type: 'listing_published',
    title: 'Listing approved · now live',
    body: data.title,
    deepLink: `product/${data.id}`,
    data: { listingId: data.id },
    email: listingPublishedEmail({
      listingId: data.id,
      title: data.title,
    }),
  });

  void notifyFollowersOfListing({
    sellerId: String(data.seller_id),
    sellerUsername,
    listingId: data.id,
    listingTitle: data.title,
    price: Number(data.price) || 0,
    brand: data.brand ? String(data.brand) : undefined,
    size: data.size ? String(data.size) : undefined,
    condition: data.condition ? String(data.condition) : undefined,
    photoUrl: Array.isArray(data.photo_urls) ? data.photo_urls[0] : undefined,
  }).catch((err) => {
    console.warn('[admin/listings] follower notify failed', err instanceof Error ? err.message : err);
  });

  const history = await loadListingHistory(String(data.id)).catch(() => []);
  return res.json({ listing: mapListing(data as never, sellerUsername), history });
});

router.post('/:id/reject', requireStaffAuth, requireStaffAction('reject_listing'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;

  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Listing not found', 'NOT_FOUND');
  if (String(existing.status) !== 'pending_review') {
    return sendError(res, 409, 'Only pending listings can be rejected', 'CONFLICT');
  }

  const now = new Date().toISOString();
  const { data, error } = await service
    .from('listings')
    .update({
      status: 'rejected',
      review_reason: parsed.data.reason,
      reviewed_at: now,
      reviewed_by: userId,
    })
    .eq('id', req.params.id)
    .eq('status', 'pending_review')
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  const seller = await getProfileById(service, String(data.seller_id));
  const sellerUsername = seller?.username ?? 'unknown';

  void recordReviewEvent(data.id, userId, 'rejected', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'listing.reject',
    resourceType: 'listing',
    resourceId: String(data.id),
    reason: parsed.data.reason,
    sensitivity: 'Standard',
    meta: { title: data.title, sellerId: data.seller_id },
  });

  void notifyUser({
    userId: String(data.seller_id),
    category: 'account',
    type: 'listing_rejected',
    title: 'Listing needs changes',
    body: parsed.data.reason,
    deepLink: `sell/${data.id}`,
    data: { listingId: data.id, reason: parsed.data.reason },
    email: listingRejectedEmail({
      listingId: data.id,
      title: data.title,
      reason: parsed.data.reason,
    }),
  });

  const history = await loadListingHistory(String(data.id)).catch(() => []);
  return res.json({ listing: mapListing(data as never, sellerUsername), history });
});

router.post('/:id/hide', requireStaffAuth, requireStaffAction('hide_listing'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Listing not found', 'NOT_FOUND');

  const status = String(existing.status);
  if (status === 'hidden' || status === 'removed') {
    return sendError(res, 409, 'Listing is already off the marketplace', 'CONFLICT');
  }
  if (status === 'pending_review' || status === 'rejected' || status === 'draft') {
    return sendError(res, 409, 'Only public listings can be hidden', 'CONFLICT');
  }

  const { data, error } = await service
    .from('listings')
    .update({ status: 'hidden' })
    .eq('id', req.params.id)
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  const seller = await getProfileById(service, String(data.seller_id));
  const sellerUsername = seller?.username ?? 'unknown';

  void recordReviewEvent(data.id, userId, 'hidden', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'listing.hide',
    resourceType: 'listing',
    resourceId: String(data.id),
    reason: parsed.data.reason,
    sensitivity: 'High',
    meta: { title: data.title, previousStatus: status, sellerId: data.seller_id },
  });

  const history = await loadListingHistory(String(data.id)).catch(() => []);
  return res.json({ listing: mapListing(data as never, sellerUsername), history });
});

router.post('/:id/restore', requireStaffAuth, requireStaffAction('restore_listing'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Listing not found', 'NOT_FOUND');

  const status = String(existing.status);
  if (status !== 'hidden' && status !== 'removed') {
    return sendError(res, 409, 'Only hidden or removed listings can be restored', 'CONFLICT');
  }

  const { data, error } = await service
    .from('listings')
    .update({ status: 'available' })
    .eq('id', req.params.id)
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  const seller = await getProfileById(service, String(data.seller_id));
  const sellerUsername = seller?.username ?? 'unknown';

  void recordReviewEvent(data.id, userId, 'restored', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'listing.restore',
    resourceType: 'listing',
    resourceId: String(data.id),
    reason: parsed.data.reason,
    sensitivity: 'Standard',
    meta: { title: data.title, previousStatus: status, sellerId: data.seller_id },
  });

  const history = await loadListingHistory(String(data.id)).catch(() => []);
  return res.json({ listing: mapListing(data as never, sellerUsername), history });
});

router.post(
  '/:id/note',
  requireStaffAuth,
  requireStaffRole('super_admin', 'trust_safety', 'support'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

    const service = createServiceClient();
    const { data: existing, error: existingError } = await service
      .from('listings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (existingError) return handleSupabaseError(res, existingError);
    if (!existing) return sendError(res, 404, 'Listing not found', 'NOT_FOUND');

    const seller = await getProfileById(service, String(existing.seller_id));
    const sellerUsername = seller?.username ?? 'unknown';

    await recordReviewEvent(String(existing.id), userId, 'note', parsed.data.reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'listing.note',
      resourceType: 'listing',
      resourceId: String(existing.id),
      reason: parsed.data.reason,
      sensitivity: 'Standard',
      meta: { title: existing.title, sellerId: existing.seller_id },
    });

    const history = await loadListingHistory(String(existing.id)).catch(() => []);
    return res.json({ listing: mapListing(existing as never, sellerUsername), history });
  },
);

router.post(
  '/:id/escalate',
  requireStaffAuth,
  requireStaffRole('super_admin', 'trust_safety', 'support'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

    const service = createServiceClient();
    const { data: existing, error: existingError } = await service
      .from('listings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (existingError) return handleSupabaseError(res, existingError);
    if (!existing) return sendError(res, 404, 'Listing not found', 'NOT_FOUND');

    const seller = await getProfileById(service, String(existing.seller_id));
    const sellerUsername = seller?.username ?? 'unknown';

    await recordReviewEvent(String(existing.id), userId, 'escalated', parsed.data.reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'listing.escalate',
      resourceType: 'listing',
      resourceId: String(existing.id),
      reason: parsed.data.reason,
      sensitivity: 'High',
      meta: { title: existing.title, sellerId: existing.seller_id },
    });

    const history = await loadListingHistory(String(existing.id)).catch(() => []);
    return res.json({ listing: mapListing(existing as never, sellerUsername), history });
  },
);

export default router;
