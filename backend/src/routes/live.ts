import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import type { DbRow } from '../lib/db-types.js';
import { queueEmail } from '../lib/email/send.js';
import {
  liveClaimReservedEmail,
  liveStartedEmail,
  liveUpcomingEmail,
} from '../lib/email/templates/live.js';
import { mapLiveClaim, mapLiveSession, mapLiveStreamProduct } from '../lib/live-mappers.js';
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from '../lib/livekit.js';
import { getProfileById, getSellerMap, mapListing } from '../lib/mappers.js';
import { createServiceClient, createSupabaseClient } from '../lib/supabase.js';
import { type AuthedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const CLAIM_TTL_SECONDS = 5 * 60;

function formatStart(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function publicClient(req: AuthedRequest) {
  return req.supabase ?? createSupabaseClient();
}

async function loadProducts(supabase: ReturnType<typeof createSupabaseClient>, sessionId: string) {
  const { data, error } = await supabase
    .from('live_stream_products')
    .select('*')
    .eq('live_session_id', sessionId)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const listingIds = (data ?? []).map((row: DbRow) => row.listing_id as string);
  const listingsById = new Map<string, DbRow>();
  if (listingIds.length) {
    const { data: listings } = await supabase.from('listings').select('*').in('id', listingIds);
    for (const listing of listings ?? []) listingsById.set(listing.id, listing);
  }

  return (data ?? []).map((row: DbRow) => mapLiveStreamProduct(row, listingsById.get(String(row.listing_id))));
}

function rpcErrorMessage(error: { message?: string; details?: string; hint?: string } | null) {
  const raw = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`;
  if (raw.includes('OUT_OF_STOCK')) return { status: 409, message: 'Out of stock', code: 'OUT_OF_STOCK' };
  if (raw.includes('FORBIDDEN')) return { status: 403, message: 'Forbidden', code: 'FORBIDDEN' };
  if (raw.includes('PRODUCT_NOT_FOUND')) return { status: 404, message: 'Product not found', code: 'NOT_FOUND' };
  if (raw.includes('CLAIM_NOT_FOUND')) return { status: 404, message: 'Claim not found', code: 'NOT_FOUND' };
  if (raw.includes('CLAIM_EXPIRED')) return { status: 400, message: 'Claim expired', code: 'CLAIM_EXPIRED' };
  if (raw.includes('CLAIM_NOT_ACTIVE')) return { status: 400, message: 'Claim not active', code: 'CLAIM_NOT_ACTIVE' };
  return { status: 400, message: error?.message ?? 'Request failed', code: 'RPC_ERROR' };
}

router.get('/sessions', optionalAuth, async (req, res) => {
  const supabase = publicClient(req as AuthedRequest);
  const { data, error } = await supabase.from('live_sessions').select('*').order('created_at', { ascending: false });
  if (error) return handleSupabaseError(res, error);

  const hostMap = await getSellerMap(
    supabase,
    (data ?? []).map((row: DbRow) => row.host_id as string),
  );

  const sessions = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const products = await loadProducts(supabase, String(row.id));
      return mapLiveSession(row, hostMap.get(row.host_id as string) ?? 'unknown', products);
    }),
  );

  return res.json({
    liveNow: sessions.filter((s) => s.status === 'live'),
    upcoming: sessions.filter((s) => s.status === 'upcoming'),
    all: sessions,
  });
});

router.get('/sessions/:id', optionalAuth, async (req, res) => {
  const supabase = publicClient(req as AuthedRequest);
  const { data, error } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Session not found');

  const host = await getProfileById(supabase, data.host_id);
  const products = await loadProducts(supabase, data.id);
  return res.json(mapLiveSession(data, host?.username ?? 'unknown', products));
});

router.post('/sessions', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      title: z.string().min(1),
      department: z.enum(['Women', 'Men', 'Kids']),
      description: z.string().optional(),
      featuredListingIds: z.array(z.string()).default([]),
      products: z
        .array(
          z.object({
            listingId: z.string(),
            livePrice: z.number().int().nonnegative(),
            stock: z.number().int().positive(),
            isPinned: z.boolean().optional(),
          }),
        )
        .optional(),
      scheduledAt: z.string().optional(),
      thumbnailUrl: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const scheduled = Boolean(parsed.data.scheduledAt?.trim());
  const productInputs =
    parsed.data.products?.length
      ? parsed.data.products
      : parsed.data.featuredListingIds.map((listingId, index) => ({
          listingId,
          livePrice: 0,
          stock: 1,
          isPinned: index === 0,
        }));

  // Resolve prices from catalog when livePrice is 0
  const listingIds = productInputs.map((p) => p.listingId);
  const { data: listings } = listingIds.length
    ? await supabase.from('listings').select('id, price, seller_id').in('id', listingIds)
    : { data: [] as DbRow[] };
  const listingMap = new Map((listings ?? []).map((row: DbRow) => [String(row.id), row]));

  for (const p of productInputs) {
    const listing = listingMap.get(p.listingId);
    if (!listing) return sendError(res, 400, `Listing ${p.listingId} not found`);
    if (listing.seller_id !== userId) return sendError(res, 403, 'You can only feature your own listings');
  }

  const { data, error } = await supabase
    .from('live_sessions')
    .insert({
      host_id: userId,
      title: parsed.data.title.trim(),
      department: parsed.data.department,
      description: parsed.data.description?.trim() ?? null,
      featured_listing_ids: productInputs.map((p) => p.listingId),
      scheduled_at: scheduled ? parsed.data.scheduledAt : null,
      status: scheduled ? 'upcoming' : 'live',
      viewers: scheduled ? null : 1,
      pinned_listing_id: productInputs.find((p) => p.isPinned)?.listingId ?? productInputs[0]?.listingId ?? null,
      thumbnail_url: parsed.data.thumbnailUrl ?? null,
      started_at: scheduled ? null : new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const roomName = `live_${data.id}`;
  await supabase.from('live_sessions').update({ livekit_room_name: roomName }).eq('id', data.id);

  if (productInputs.length) {
    const rows = productInputs.map((p, index) => {
      const listing = listingMap.get(p.listingId)!;
      return {
        live_session_id: data.id,
        listing_id: p.listingId,
        live_price: p.livePrice > 0 ? p.livePrice : Number(listing.price),
        stock: p.stock,
        is_pinned: Boolean(p.isPinned) || index === 0,
        sort_order: index,
      };
    });
    // Ensure only first pinned
    let pinnedSeen = false;
    for (const row of rows) {
      if (row.is_pinned) {
        if (pinnedSeen) row.is_pinned = false;
        else pinnedSeen = true;
      }
    }
    if (!pinnedSeen && rows[0]) rows[0].is_pinned = true;

    const { error: productError } = await supabase.from('live_stream_products').insert(rows);
    if (productError) return handleSupabaseError(res, productError);
  }

  const host = await getProfileById(supabase, userId);
  const products = await loadProducts(supabase, data.id);
  const hostUsername = host?.username ?? 'unknown';

  if (scheduled && parsed.data.scheduledAt) {
    queueEmail({
      toUserId: userId,
      content: liveUpcomingEmail({
        sessionId: data.id,
        hostUsername,
        title: data.title,
        startTimeLabel: formatStart(parsed.data.scheduledAt),
      }),
    });
  } else {
    queueEmail({
      toUserId: userId,
      content: liveStartedEmail({
        sessionId: data.id,
        hostUsername,
        title: data.title,
      }),
    });
  }

  return res.status(201).json(
    mapLiveSession({ ...data, livekit_room_name: roomName }, hostUsername, products),
  );
});

router.post('/sessions/:id/start', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data, error } = await supabase
    .from('live_sessions')
    .update({ status: 'live', started_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('host_id', userId)
    .select('*')
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Session not found');
  const host = await getProfileById(supabase, userId);
  const products = await loadProducts(supabase, data.id);
  const hostUsername = host?.username ?? 'unknown';

  queueEmail({
    toUserId: userId,
    content: liveStartedEmail({
      sessionId: data.id,
      hostUsername,
      title: data.title,
    }),
  });

  return res.json(mapLiveSession(data, hostUsername, products));
});

router.post('/sessions/:id/end', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { error } = await supabase
    .from('live_sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('host_id', userId);
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true });
});

router.post('/sessions/:id/token', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  if (!isLiveKitConfigured()) {
    return sendError(res, 503, 'LiveKit is not configured', 'LIVEKIT_UNAVAILABLE');
  }

  const { data: session, error } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status === 'ended') return sendError(res, 400, 'Session ended');

  const isHost = session.host_id === userId;
  const profile = await getProfileById(supabase, userId);
  const roomName = session.livekit_room_name ?? `live_${session.id}`;

  try {
    const token = await createLiveKitToken({
      roomName,
      identity: userId,
      name: profile?.username ?? userId,
      canPublish: isHost,
      canSubscribe: true,
    });
    return res.json({
      token,
      url: getLiveKitUrl(),
      roomName,
      role: isHost ? 'host' : 'viewer',
      canPublish: isHost,
    });
  } catch (err) {
    return sendError(res, 500, err instanceof Error ? err.message : 'Token failed');
  }
});

router.post('/sessions/:id/products', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      listingId: z.string(),
      livePrice: z.number().int().nonnegative(),
      stock: z.number().int().positive(),
      isPinned: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const { data: session } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).maybeSingle();
  if (!session || session.host_id !== userId) return sendError(res, 403, 'Forbidden');

  const { data: listing } = await supabase.from('listings').select('*').eq('id', parsed.data.listingId).maybeSingle();
  if (!listing || listing.seller_id !== userId) return sendError(res, 400, 'Invalid listing');

  const { count } = await supabase
    .from('live_stream_products')
    .select('*', { count: 'exact', head: true })
    .eq('live_session_id', req.params.id);

  const { data, error } = await supabase
    .from('live_stream_products')
    .insert({
      live_session_id: req.params.id,
      listing_id: parsed.data.listingId,
      live_price: parsed.data.livePrice || listing.price,
      stock: parsed.data.stock,
      is_pinned: false,
      sort_order: count ?? 0,
    })
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  if (parsed.data.isPinned) {
    const service = createServiceClient();
    const { error: pinError } = await service.rpc('pin_live_product', {
      p_product_id: data.id,
      p_user_id: userId,
    });
    if (pinError) {
      const mapped = rpcErrorMessage(pinError);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
  }

  const products = await loadProducts(supabase, String(req.params.id));
  return res.status(201).json(products.find((p) => p.id === data.id) ?? mapLiveStreamProduct(data, listing));
});

router.patch('/sessions/:id/products/:productId', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      livePrice: z.number().int().nonnegative().optional(),
      stock: z.number().int().nonnegative().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const { data: session } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).maybeSingle();
  if (!session || session.host_id !== userId) return sendError(res, 403, 'Forbidden');

  const patch: Record<string, number> = {};
  if (parsed.data.livePrice !== undefined) patch.live_price = parsed.data.livePrice;
  if (parsed.data.stock !== undefined) patch.stock = parsed.data.stock;

  const { data, error } = await supabase
    .from('live_stream_products')
    .update(patch)
    .eq('id', req.params.productId)
    .eq('live_session_id', req.params.id)
    .select('*')
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Product not found');

  const { data: listing } = await supabase.from('listings').select('*').eq('id', data.listing_id).maybeSingle();
  return res.json(mapLiveStreamProduct(data, listing));
});

router.post('/sessions/:id/products/:productId/pin', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('pin_live_product', {
      p_product_id: req.params.productId,
      p_user_id: userId,
    });
    if (error) {
      const mapped = rpcErrorMessage(error);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
    return res.json(mapLiveStreamProduct(data as DbRow));
  } catch (err) {
    return sendError(res, 500, err instanceof Error ? err.message : 'Pin failed');
  }
});

router.post('/sessions/:id/products/:productId/claim', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ quantity: z.number().int().positive().default(1) }).safeParse(req.body ?? {});
  const qty = parsed.success ? parsed.data.quantity : 1;

  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('claim_live_product', {
      p_product_id: req.params.productId,
      p_user_id: userId,
      p_qty: qty,
      p_ttl_seconds: CLAIM_TTL_SECONDS,
    });
    if (error) {
      const mapped = rpcErrorMessage(error);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
    const profile = await getProfileById(supabase, userId);
    const claim = data as DbRow;

    let listingTitle = 'your item';
    const productId = claim.live_stream_product_id ? String(claim.live_stream_product_id) : req.params.productId;
    if (productId) {
      const { data: product } = await supabase
        .from('live_stream_products')
        .select('listing_id')
        .eq('id', productId)
        .maybeSingle();
      if (product?.listing_id) {
        const { data: listing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', product.listing_id)
          .maybeSingle();
        if (listing?.title) listingTitle = String(listing.title);
      }
    }

    queueEmail({
      toUserId: userId,
      content: liveClaimReservedEmail({
        sessionId: String(req.params.id),
        listingTitle,
        expiresInMinutes: Math.round(CLAIM_TTL_SECONDS / 60),
      }),
    });

    return res.json(mapLiveClaim(claim, profile?.username ?? 'unknown'));
  } catch (err) {
    return sendError(res, 500, err instanceof Error ? err.message : 'Claim failed');
  }
});

router.post('/sessions/:id/products/:productId/release', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ claimId: z.string() }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'claimId required');

  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('release_live_claim', {
      p_claim_id: parsed.data.claimId,
      p_user_id: userId,
    });
    if (error) {
      const mapped = rpcErrorMessage(error);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
    const profile = await getProfileById(supabase, userId);
    return res.json(mapLiveClaim(data as DbRow, profile?.username ?? 'unknown'));
  } catch (err) {
    return sendError(res, 500, err instanceof Error ? err.message : 'Release failed');
  }
});

router.get('/sessions/:id/claims/me', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data, error } = await supabase
    .from('live_claims')
    .select('*')
    .eq('live_session_id', req.params.id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) return handleSupabaseError(res, error);
  const profile = await getProfileById(supabase, userId);
  return res.json((data ?? []).map((row: DbRow) => mapLiveClaim(row, profile?.username ?? 'unknown')));
});

router.get('/sessions/:id/comments', optionalAuth, async (req, res) => {
  const supabase = publicClient(req as AuthedRequest);
  const { data, error } = await supabase
    .from('live_comments')
    .select('*')
    .eq('session_id', req.params.id)
    .order('created_at', { ascending: true });

  if (error) return handleSupabaseError(res, error);

  const mapped = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const user = await getProfileById(supabase, row.user_id as string);
      return {
        id: row.id,
        user: user?.username ?? 'unknown',
        text: row.text,
        clientId: row.client_id ?? undefined,
      };
    }),
  );

  return res.json(mapped);
});

router.post('/sessions/:id/comments', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ text: z.string().min(1), clientId: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Comment required');

  const { data, error } = await supabase
    .from('live_comments')
    .insert({
      session_id: req.params.id,
      user_id: userId,
      text: parsed.data.text.trim(),
      client_id: parsed.data.clientId ?? null,
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const user = await getProfileById(supabase, userId);
  return res.status(201).json({
    id: data.id,
    user: user?.username ?? 'unknown',
    text: data.text,
    clientId: data.client_id ?? undefined,
  });
});

// Legacy pin by listing id → pin matching stream product
router.post('/sessions/:id/pin/:listingId', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data: product } = await supabase
    .from('live_stream_products')
    .select('id')
    .eq('live_session_id', req.params.id)
    .eq('listing_id', req.params.listingId)
    .maybeSingle();
  if (!product) return sendError(res, 404, 'Product not found in session');

  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('pin_live_product', {
      p_product_id: product.id,
      p_user_id: userId,
    });
    if (error) {
      const mapped = rpcErrorMessage(error);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
    return res.json({ ok: true, product: mapLiveStreamProduct(data as DbRow) });
  } catch (err) {
    return sendError(res, 500, err instanceof Error ? err.message : 'Pin failed');
  }
});

// Legacy claim by listing id
router.post('/sessions/:id/claim/:listingId', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data: product } = await supabase
    .from('live_stream_products')
    .select('id')
    .eq('live_session_id', req.params.id)
    .eq('listing_id', req.params.listingId)
    .maybeSingle();
  if (!product) return sendError(res, 404, 'Product not found in session');

  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('claim_live_product', {
      p_product_id: product.id,
      p_user_id: userId,
      p_qty: 1,
      p_ttl_seconds: CLAIM_TTL_SECONDS,
    });
    if (error) {
      const mapped = rpcErrorMessage(error);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
    const profile = await getProfileById(supabase, userId);
    const { data: listing } = await supabase
      .from('listings')
      .select('title')
      .eq('id', req.params.listingId)
      .maybeSingle();

    queueEmail({
      toUserId: userId,
      content: liveClaimReservedEmail({
        sessionId: String(req.params.id),
        listingTitle: (listing?.title as string) || 'your item',
        expiresInMinutes: Math.round(CLAIM_TTL_SECONDS / 60),
      }),
    });

    return res.json(mapLiveClaim(data as DbRow, profile?.username ?? 'unknown'));
  } catch (err) {
    return sendError(res, 500, err instanceof Error ? err.message : 'Claim failed');
  }
});

router.get('/sessions/:id/claim', optionalAuth, async (req, res) => {
  const supabase = publicClient(req as AuthedRequest);
  const userId = (req as AuthedRequest).userId;
  let query = supabase
    .from('live_claims')
    .select('*')
    .eq('live_session_id', req.params.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return res.json(null);

  const user = await getProfileById(supabase, data.user_id);
  return res.json(mapLiveClaim(data, user?.username ?? 'unknown'));
});

router.get('/sessions/:id/listing/:listingId', optionalAuth, async (req, res) => {
  const supabase = publicClient(req as AuthedRequest);
  const { data, error } = await supabase.from('listings').select('*').eq('id', req.params.listingId).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Listing not found');
  const seller = await getProfileById(supabase, data.seller_id);
  return res.json(mapListing(data, seller?.username ?? 'unknown'));
});

export default router;
