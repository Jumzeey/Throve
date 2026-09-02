import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import type { DbRow } from '../lib/db-types.js';
import { queueEmail } from '../lib/email/send.js';
import { listingPublishedEmail } from '../lib/email/templates/listings.js';
import { getProfileById, getSellerMap, mapListing } from '../lib/mappers.js';
import { type AuthedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

async function enrichListings(supabase: ReturnType<typeof import('../lib/supabase.js').createSupabaseClient>, rows: any[], userId?: string) {
  const sellerMap = await getSellerMap(
    supabase,
    rows.map((row) => row.seller_id as string),
  );

  let savedIds = new Set<string>();
  let currentUsername: string | undefined;
  if (userId) {
    const [{ data }, profile] = await Promise.all([
      supabase.from('saved_listings').select('listing_id').eq('user_id', userId),
      getProfileById(supabase, userId),
    ]);
    savedIds = new Set((data ?? []).map((row) => row.listing_id as string));
    currentUsername = profile?.username;
  }

  return rows.map((row) => {
    const seller = sellerMap.get(row.seller_id) ?? 'unknown';
    const savedBy = savedIds.has(row.id) && currentUsername ? [currentUsername] : [];
    return mapListing(row, seller, savedBy);
  });
}

router.get('/', optionalAuth, async (req, res) => {
  const supabase = (req as AuthedRequest).supabase ?? (await import('../lib/supabase.js')).createSupabaseClient();
  const userId = (req as AuthedRequest).userId;

  let query = supabase.from('listings').select('*').neq('status', 'draft').neq('status', 'hidden');

  const { department, category, brand, condition, sort } = req.query;
  if (department) query = query.eq('department', String(department));
  if (category) query = query.eq('category', String(category));
  if (brand) query = query.eq('brand', String(brand));
  if (condition) query = query.eq('condition', String(condition));

  if (sort === 'Lowest price') query = query.order('price', { ascending: true });
  else if (sort === 'Highest price') query = query.order('price', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return handleSupabaseError(res, error);

  let rows = data ?? [];
  const priceBand = req.query.price ? String(req.query.price) : '';
  if (priceBand === 'Under 15k') rows = rows.filter((row: DbRow) => Number(row.price) < 15000);
  if (priceBand === '15k-30k') rows = rows.filter((row: DbRow) => Number(row.price) >= 15000 && Number(row.price) <= 30000);
  if (priceBand === 'Over 30k') rows = rows.filter((row: DbRow) => Number(row.price) > 30000);

  const listings = await enrichListings(supabase, rows, userId);
  return res.json(listings);
});

router.get('/saved/me', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data: saves, error: saveError } = await supabase.from('saved_listings').select('listing_id').eq('user_id', userId);
  if (saveError) return handleSupabaseError(res, saveError);

  const ids = (saves ?? []).map((row: DbRow) => row.listing_id as string);
  if (!ids.length) return res.json([]);

  const { data, error } = await supabase.from('listings').select('*').in('id', ids);
  if (error) return handleSupabaseError(res, error);

  const listings = await enrichListings(supabase, data ?? [], userId);
  return res.json(listings);
});

router.get('/seller/:username', optionalAuth, async (req, res) => {
  const supabase = (req as AuthedRequest).supabase ?? (await import('../lib/supabase.js')).createSupabaseClient();
  const userId = (req as AuthedRequest).userId;

  const { data: seller, error: sellerError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', req.params.username)
    .maybeSingle();

  if (sellerError) return handleSupabaseError(res, sellerError);
  if (!seller) return sendError(res, 404, 'Seller not found');

  const { data, error } = await supabase.from('listings').select('*').eq('seller_id', seller.id).neq('status', 'draft');
  if (error) return handleSupabaseError(res, error);

  const listings = await enrichListings(supabase, data ?? [], userId);
  return res.json(listings);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const supabase = (req as AuthedRequest).supabase ?? (await import('../lib/supabase.js')).createSupabaseClient();
  const userId = (req as AuthedRequest).userId;

  const { data, error } = await supabase.from('listings').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Listing not found');

  const [listing] = await enrichListings(supabase, [data], userId);
  return res.json(listing);
});

const listingBody = z.object({
  title: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().optional(),
  size: z.string().optional(),
  condition: z.string().optional(),
  department: z.enum(['Women', 'Men', 'Kids']).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  colour: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
});

router.post('/draft', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = listingBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const payload = {
    seller_id: userId,
    title: parsed.data.title?.trim() || 'Untitled draft',
    brand: parsed.data.brand?.trim() || 'Unbranded',
    price: parsed.data.price ?? 0,
    size: parsed.data.size?.trim() || '—',
    condition: parsed.data.condition?.trim() || 'Good',
    department: parsed.data.department ?? 'Women',
    category: parsed.data.category ?? 'Clothing',
    description: parsed.data.description?.trim() || 'No description provided.',
    colour: parsed.data.colour ?? null,
    photo_urls: parsed.data.photoUrls ?? [],
    status: 'draft',
  };

  const { data, error } = await supabase.from('listings').insert(payload).select('*').single();
  if (error) return handleSupabaseError(res, error);

  const profile = await getProfileById(supabase, userId);
  return res.json(mapListing(data, profile?.username ?? 'unknown'));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = listingBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title.trim();
  if (parsed.data.brand !== undefined) patch.brand = parsed.data.brand.trim() || 'Unbranded';
  if (parsed.data.price !== undefined) patch.price = parsed.data.price;
  if (parsed.data.size !== undefined) patch.size = parsed.data.size.trim() || '—';
  if (parsed.data.condition !== undefined) patch.condition = parsed.data.condition;
  if (parsed.data.department !== undefined) patch.department = parsed.data.department;
  if (parsed.data.category !== undefined) patch.category = parsed.data.category;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description.trim();
  if (parsed.data.colour !== undefined) patch.colour = parsed.data.colour;
  if (parsed.data.photoUrls !== undefined) patch.photo_urls = parsed.data.photoUrls;

  const { data, error } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', req.params.id)
    .eq('seller_id', userId)
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);
  const profile = await getProfileById(supabase, userId);
  return res.json(mapListing(data, profile?.username ?? 'unknown'));
});

router.post('/:id/publish', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;

  const { data: existing, error: existingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .eq('seller_id', userId)
    .maybeSingle();

  if (existingError) return handleSupabaseError(res, existingError);
  if (!existing) return sendError(res, 404, 'Listing not found');
  if (!existing.title || !existing.category || !existing.condition || existing.price <= 0) {
    return sendError(res, 400, 'Listing is missing required fields');
  }
  if ((existing.photo_urls ?? []).length < 1) {
    return sendError(res, 400, 'Add at least one photo before publishing');
  }

  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'available' })
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);
  const profile = await getProfileById(supabase, userId);

  queueEmail({
    toUserId: userId,
    content: listingPublishedEmail({
      listingId: data.id,
      title: data.title,
    }),
  });

  return res.json(mapListing(data, profile?.username ?? 'unknown'));
});

router.post('/:id/save', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { error } = await supabase.from('saved_listings').upsert(
    { user_id: userId, listing_id: req.params.id },
    { onConflict: 'user_id,listing_id' },
  );
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true, saved: true });
});

router.delete('/:id/save', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { error } = await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', req.params.id);
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true, saved: false });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;

  const { data: existing } = await supabase
    .from('listings')
    .select('status')
    .eq('id', req.params.id)
    .eq('seller_id', userId)
    .maybeSingle();

  if (!existing) return sendError(res, 404, 'Listing not found');
  if (existing.status === 'reserved') return sendError(res, 400, 'Cannot delete a reserved listing');

  const { error } = await supabase.from('listings').delete().eq('id', req.params.id).eq('seller_id', userId);
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true });
});

router.post('/:id/reserve', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (listingError) return handleSupabaseError(res, listingError);
  if (!listing) return sendError(res, 404, 'Listing not found');
  if (listing.status === 'sold') return sendError(res, 400, 'Listing already sold');
  if (listing.status === 'reserved') return sendError(res, 400, 'Listing already reserved');

  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'reserved' })
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  if (req.body.liveSessionId) {
    await supabase.from('live_claims').upsert({
      session_id: req.body.liveSessionId,
      listing_id: req.params.id,
      user_id: userId,
      expires_at: expiresAt,
    });
  }

  const profile = await getProfileById(supabase, listing.seller_id);
  return res.json(mapListing(data, profile?.username ?? 'unknown'));
});

router.post('/:id/release', requireAuth, async (req, res) => {
  const { supabase } = req as AuthedRequest;
  const { error } = await supabase.from('listings').update({ status: 'available' }).eq('id', req.params.id);
  if (error) return handleSupabaseError(res, error);
  await supabase.from('live_claims').delete().eq('listing_id', req.params.id);
  return res.json({ ok: true });
});

router.post('/:id/sold', requireAuth, async (req, res) => {
  const { supabase } = req as AuthedRequest;
  const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', req.params.id);
  if (error) return handleSupabaseError(res, error);
  await supabase.from('live_claims').delete().eq('listing_id', req.params.id);
  return res.json({ ok: true });
});

export default router;
