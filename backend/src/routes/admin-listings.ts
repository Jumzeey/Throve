import { Router } from 'express';
import { z } from 'zod';
import { listingPublishedEmail, listingRejectedEmail } from '../lib/email/templates/listings.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { notifyFollowersOfListing } from '../lib/follows.js';
import { getProfileById, getSellerMap, mapListing } from '../lib/mappers.js';
import { notifyUser } from '../lib/notify.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAuth,
  staffCanModerateListings,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();

async function recordReviewEvent(
  listingId: string,
  actorId: string,
  action: 'approved' | 'rejected',
  reason?: string | null,
) {
  const service = createServiceClient();
  await service.from('listing_review_events').insert({
    listing_id: listingId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
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

router.post('/:id/approve', requireStaffAuth, async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  if (!staffCanModerateListings(adminRole)) {
    return sendError(res, 403, 'Only Trust & Safety or Super Admin can approve listings', 'FORBIDDEN');
  }

  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Listing not found');
  if (String(existing.status) !== 'pending_review') {
    return sendError(res, 400, 'Only pending listings can be approved');
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

  void recordReviewEvent(data.id, userId, 'approved').catch(() => undefined);

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

  return res.json(mapListing(data as never, sellerUsername));
});

router.post('/:id/reject', requireStaffAuth, async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  if (!staffCanModerateListings(adminRole)) {
    return sendError(res, 403, 'Only Trust & Safety or Super Admin can reject listings', 'FORBIDDEN');
  }

  const parsed = z.object({ reason: z.string().trim().min(3) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required');

  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Listing not found');
  if (String(existing.status) !== 'pending_review') {
    return sendError(res, 400, 'Only pending listings can be rejected');
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

  void recordReviewEvent(data.id, userId, 'rejected', parsed.data.reason).catch(() => undefined);

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

  return res.json(mapListing(data as never, sellerUsername));
});

export default router;
