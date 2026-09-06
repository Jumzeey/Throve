import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import type { DbRow } from '../lib/db-types.js';
import {
  liveClaimReservedEmail,
  liveEndedWithClaimEmail,
  liveUpcomingEmail,
} from '../lib/email/templates/live.js';
import { notifyFollowersOfLive } from '../lib/follows.js';
import {
  attachPendingModerators,
  appointModerators,
  canModerateSession,
  listModeratorUsernames,
  removeModerator,
} from '../lib/live-moderators.js';
import { mapLiveClaim, mapLiveSession, mapLiveStreamProduct } from '../lib/live-mappers.js';
import { createSessionMediaCredentials, configuredMediaProvider } from '../lib/live-media.js';
import { ensureIvsChannelForSession, isIvsConfigured } from '../lib/ivs.js';
import { getProfileById, mapListing } from '../lib/mappers.js';
import { notifyUser } from '../lib/notify.js';
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

router.get('/host-access', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const profile = await getProfileById(supabase, userId);
  if (!profile || profile.deactivated) return sendError(res, 401, 'Unauthorized');
  return res.json({
    canHostLive: Boolean(profile.can_host_live),
    invitationOnly: true,
  });
});

/** Service-assisted grant: set LIVE_HOST_GRANT_KEY and pass it as x-live-grant-key. */
router.post('/host-access/grant', requireAuth, async (req, res) => {
  const grantKey = process.env.LIVE_HOST_GRANT_KEY?.trim();
  if (!grantKey || req.header('x-live-grant-key') !== grantKey) {
    return sendError(res, 403, 'Forbidden');
  }
  const parsed = z.object({ username: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'username required');

  const admin = createServiceClient();
  const { data: target } = await admin
    .from('profiles')
    .select('id, username, can_host_live')
    .ilike('username', parsed.data.username.trim().replace(/^@/, ''))
    .maybeSingle();
  if (!target) return sendError(res, 404, 'User not found');
  if (target.can_host_live) {
    return res.json({ ok: true, alreadyGranted: true, username: target.username });
  }

  const { error } = await admin.from('profiles').update({ can_host_live: true }).eq('id', target.id);
  if (error) return handleSupabaseError(res, error);

  const { liveHostAccessGrantedEmail } = await import('../lib/email/templates/live.js');
  void notifyUser({
    userId: String(target.id),
    category: 'live',
    type: 'live_host_access_granted',
    title: 'Live hosting unlocked',
    body: 'You’re cleared to host live sessions on Throve.',
    deepLink: 'live/host-access',
    email: liveHostAccessGrantedEmail(),
    skipPush: true,
  });

  return res.json({ ok: true, username: target.username });
});

router.get('/sessions', optionalAuth, async (req, res) => {
  const supabase = publicClient(req as AuthedRequest);
  const recentEndedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .or(`status.eq.live,status.eq.upcoming,and(status.eq.ended,ended_at.gte.${recentEndedCutoff})`)
    .order('created_at', { ascending: false });
  if (error) return handleSupabaseError(res, error);

  const hostIds = (data ?? []).map((row: DbRow) => row.host_id as string);
  const { data: hosts, error: hostError } = await supabase
    .from('profiles')
    .select('id, username, photo_url')
    .in('id', hostIds.length ? hostIds : ['00000000-0000-0000-0000-000000000000']);
  if (hostError) return handleSupabaseError(res, hostError);

  const hostMap = new Map(
    (hosts ?? []).map((row) => [
      row.id as string,
      {
        username: row.username as string,
        photoUrl: row.photo_url && String(row.photo_url).startsWith('http') ? String(row.photo_url) : null,
      },
    ]),
  );

  const sessions = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const host = hostMap.get(row.host_id as string);
      const products = await loadProducts(supabase, String(row.id));
      return mapLiveSession(
        row,
        host?.username ?? 'unknown',
        products,
        await listModeratorUsernames(String(row.id)),
        host?.photoUrl,
      );
    }),
  );

  const liveNow = sessions
    .filter((s) => s.status === 'live')
    .sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0));
  const upcoming = sessions
    .filter((s) => s.status === 'upcoming')
    .sort((a, b) => {
      const aTime = a.scheduledAt ? new Date(String(a.scheduledAt)).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledAt ? new Date(String(b.scheduledAt)).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  const recentlyEnded = sessions
    .filter((s) => s.status === 'ended')
    .sort((a, b) => {
      const aTime = a.endedAt ? new Date(String(a.endedAt)).getTime() : 0;
      const bTime = b.endedAt ? new Date(String(b.endedAt)).getTime() : 0;
      return bTime - aTime;
    });

  return res.json({
    liveNow,
    upcoming,
    recentlyEnded,
    all: [...liveNow, ...upcoming, ...recentlyEnded],
  });
});

router.get('/sessions/:id', optionalAuth, async (req, res) => {
  const supabase = publicClient(req as AuthedRequest);
  const { data, error } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Session not found');

  const host = await getProfileById(supabase, data.host_id);
  const products = await loadProducts(supabase, data.id);
  const photo =
    host?.photo_url && String(host.photo_url).startsWith('http') ? String(host.photo_url) : null;
  return res.json(
    mapLiveSession(data, host?.username ?? 'unknown', products, await listModeratorUsernames(data.id), photo),
  );
});

router.post('/sessions', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      title: z.string().min(1),
      department: z.enum(['Women', 'Men', 'Kids']),
      category: z.string().optional(),
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
      moderatorUsernames: z.array(z.string()).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const hostProfile = await getProfileById(supabase, userId);
  if (!hostProfile?.can_host_live) {
    return sendError(res, 403, 'Live hosting is invitation only', 'HOST_ACCESS_DENIED');
  }

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
      category: parsed.data.category?.trim() || null,
      description: parsed.data.description?.trim() ?? null,
      featured_listing_ids: productInputs.map((p) => p.listingId),
      scheduled_at: scheduled ? parsed.data.scheduledAt : null,
      status: scheduled ? 'upcoming' : 'live',
      viewers: scheduled ? null : 1,
      peak_viewers: scheduled ? 0 : 1,
      products_shown: productInputs.length > 0 ? 1 : 0,
      pinned_listing_id: productInputs.find((p) => p.isPinned)?.listingId ?? productInputs[0]?.listingId ?? null,
      thumbnail_url: parsed.data.thumbnailUrl ?? null,
      started_at: scheduled ? null : new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const roomName = `live_${data.id}`;
  const mediaProvider = configuredMediaProvider();
  await supabase
    .from('live_sessions')
    .update({ livekit_room_name: roomName, media_provider: mediaProvider })
    .eq('id', data.id);

  if (mediaProvider === 'ivs' && isIvsConfigured() && !scheduled) {
    try {
      await ensureIvsChannelForSession({ sessionId: String(data.id) });
    } catch (err) {
      console.warn('[live] ivs channel', err instanceof Error ? err.message : err);
    }
  }

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
    void notifyUser({
      userId,
      category: 'live',
      type: 'live_scheduled',
      title: 'Live scheduled',
      body: data.title,
      deepLink: `live/${data.id}`,
      data: { sessionId: data.id },
      email: liveUpcomingEmail({
        sessionId: data.id,
        hostUsername,
        title: data.title,
        startTimeLabel: formatStart(parsed.data.scheduledAt),
      }),
    });
    void notifyFollowersOfLive({
      sellerId: userId,
      sellerUsername: hostUsername,
      sessionId: data.id,
      title: data.title,
      kind: 'upcoming',
      startTimeLabel: formatStart(parsed.data.scheduledAt),
    });
  } else {
    void notifyFollowersOfLive({
      sellerId: userId,
      sellerUsername: hostUsername,
      sessionId: data.id,
      title: data.title,
      kind: 'started',
    });
  }

  await attachPendingModerators(userId, data.id);
  if (parsed.data.moderatorUsernames?.length) {
    try {
      await appointModerators({
        hostId: userId,
        usernames: parsed.data.moderatorUsernames,
        sessionId: data.id,
        sessionTitle: data.title,
      });
    } catch (err) {
      console.warn('[live] attach moderators', err instanceof Error ? err.message : err);
    }
  }

  const moderators = await listModeratorUsernames(data.id);
  return res.status(201).json(
    mapLiveSession({ ...data, livekit_room_name: roomName }, hostUsername, products, moderators),
  );
});

router.post('/moderators', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const parsed = z
    .object({
      usernames: z.array(z.string()).min(1),
      sessionId: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  let sessionTitle: string | undefined;
  if (parsed.data.sessionId) {
    const admin = createServiceClient();
    const { data: session } = await admin
      .from('live_sessions')
      .select('id, host_id, title')
      .eq('id', parsed.data.sessionId)
      .maybeSingle();
    if (!session || session.host_id !== userId) return sendError(res, 404, 'Session not found');
    sessionTitle = String(session.title);
  }

  try {
    const appointed = await appointModerators({
      hostId: userId,
      usernames: parsed.data.usernames,
      sessionId: parsed.data.sessionId,
      sessionTitle,
    });
    return res.json({ usernames: appointed });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message = err instanceof Error ? err.message : 'Could not appoint moderators.';
    if (code === 'LIMIT') return sendError(res, 400, message, 'LIMIT');
    if (code === 'NOT_FOUND') return sendError(res, 404, message, 'NOT_FOUND');
    console.warn('[live/moderators]', message);
    return sendError(res, 400, message);
  }
});

router.delete('/moderators/:username', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const username = String(req.params.username);
  const admin = createServiceClient();
  const { data: modProfile } = await admin
    .from('profiles')
    .select('id, username')
    .ilike('username', username.trim().replace(/^@/, ''))
    .maybeSingle();
  await removeModerator(userId, username, sessionId);
  if (modProfile?.id) {
    void notifyUser({
      userId: String(modProfile.id),
      category: 'live',
      type: 'live_moderator_removed',
      title: 'Moderator access removed',
      body: 'You’re no longer a live moderator for this host.',
      deepLink: '(tabs)/live',
      skipPush: true,
    });
  }
  return res.json({ ok: true });
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

  void notifyFollowersOfLive({
    sellerId: userId,
    sellerUsername: hostUsername,
    sessionId: data.id,
    title: data.title,
    kind: 'started',
  });

  return res.json(mapLiveSession(data, hostUsername, products));
});

router.post('/sessions/:id/end', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      peakViewers: z.number().int().nonnegative().optional(),
      reason: z.enum(['host', 'connection']).optional(),
    })
    .safeParse(req.body ?? {});

  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('host_id', userId)
    .maybeSingle();
  if (sessionError) return handleSupabaseError(res, sessionError);
  if (!session) return sendError(res, 404, 'Session not found');

  const endedAt = session.status === 'ended' && session.ended_at
    ? String(session.ended_at)
    : new Date().toISOString();
  const peakFromClient = parsed.success ? parsed.data.peakViewers : undefined;
  const peakViewers = Math.max(
    Number(session.peak_viewers ?? 0),
    Number(session.viewers ?? 0),
    peakFromClient ?? 0,
  );

  if (session.status !== 'ended') {
    const { error } = await supabase
      .from('live_sessions')
      .update({
        status: 'ended',
        ended_at: endedAt,
        peak_viewers: peakViewers,
        viewers: 0,
      })
      .eq('id', req.params.id)
      .eq('host_id', userId);
    if (error) return handleSupabaseError(res, error);

    const service = createServiceClient();
    const { data: openClaims } = await service
      .from('live_claims')
      .select('id, user_id, listing_id')
      .eq('live_session_id', req.params.id)
      .eq('status', 'active')
      .limit(100);
    for (const claim of openClaims ?? []) {
      let listingTitle = 'your item';
      if (claim.listing_id) {
        const { data: listing } = await service
          .from('listings')
          .select('title')
          .eq('id', claim.listing_id)
          .maybeSingle();
        if (listing?.title) listingTitle = String(listing.title);
      }
      void notifyUser({
        userId: String(claim.user_id),
        category: 'live',
        type: 'live_ended_with_claim',
        title: 'Live ended — finish checkout',
        body: listingTitle,
        deepLink: `live/${req.params.id}`,
        data: { sessionId: String(req.params.id), claimId: String(claim.id) },
        email: liveEndedWithClaimEmail({
          sessionId: String(req.params.id),
          listingTitle,
        }),
      });
    }
  }

  const products = await loadProducts(supabase, String(req.params.id));
  const productsSold = products.filter((p) => p.soldCount > 0).length;
  const productsShown = Math.max(Number(session.products_shown ?? 0), products.length);
  const startedMs = session.started_at ? new Date(String(session.started_at)).getTime() : Date.now();
  const endedMs = new Date(endedAt).getTime();
  const durationMinutes = Math.max(1, Math.round((endedMs - startedMs) / 60000));

  return res.json({
    sessionId: session.id,
    title: session.title,
    durationMinutes,
    peakViewers,
    productsShown,
    productsSold,
    endedReason: parsed.success ? parsed.data.reason ?? 'host' : 'host',
  });
});

router.post('/sessions/:id/viewers', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ viewers: z.number().int().nonnegative() }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid viewers');

  const { data: session, error } = await supabase
    .from('live_sessions')
    .select('id, host_id, peak_viewers, status')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status !== 'live') return res.json({ ok: true });

  const peak = Math.max(Number(session.peak_viewers ?? 0), parsed.data.viewers);
  const { error: updateError } = await supabase
    .from('live_sessions')
    .update({ viewers: parsed.data.viewers, peak_viewers: peak })
    .eq('id', req.params.id);
  if (updateError) return handleSupabaseError(res, updateError);
  return res.json({ ok: true, peakViewers: peak });
});

router.post('/sessions/:id/media', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;

  const { data: session, error } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status === 'ended') return sendError(res, 400, 'Session ended');

  const isHost = session.host_id === userId;
  const profile = await getProfileById(supabase, userId);
  const roomName = session.livekit_room_name ?? `live_${session.id}`;

  try {
    const credentials = await createSessionMediaCredentials({
      sessionId: String(session.id),
      userId,
      username: profile?.username ?? undefined,
      isHost,
      roomName,
    });
    return res.json(credentials);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'LIVEKIT_UNAVAILABLE' || code === 'MEDIA_PROVIDER_UNAVAILABLE' || code === 'IVS_UNAVAILABLE') {
      return sendError(res, 503, err instanceof Error ? err.message : 'Media unavailable', code);
    }
    return sendError(res, 500, err instanceof Error ? err.message : 'Media credentials failed');
  }
});

/** @deprecated Prefer POST /sessions/:id/media — kept for older clients / E2E. */
router.post('/sessions/:id/token', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;

  const { data: session, error } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status === 'ended') return sendError(res, 400, 'Session ended');

  const isHost = session.host_id === userId;
  const profile = await getProfileById(supabase, userId);
  const roomName = session.livekit_room_name ?? `live_${session.id}`;

  try {
    const credentials = await createSessionMediaCredentials({
      sessionId: String(session.id),
      userId,
      username: profile?.username ?? undefined,
      isHost,
      roomName,
    });
    // Legacy shape (LiveKit-only fields) for older clients.
    return res.json({
      provider: credentials.provider,
      token: credentials.token,
      url: credentials.url,
      roomName: credentials.roomName,
      role: credentials.role,
      canPublish: credentials.canPublish,
      ingestEndpoint: credentials.ingestEndpoint,
      streamKey: credentials.streamKey,
      playbackUrl: credentials.playbackUrl,
      rtmpsUrl: credentials.rtmpsUrl,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'LIVEKIT_UNAVAILABLE' || code === 'MEDIA_PROVIDER_UNAVAILABLE' || code === 'IVS_UNAVAILABLE') {
      return sendError(res, 503, err instanceof Error ? err.message : 'LiveKit is not configured', code);
    }
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
  const { supabase, userId } = req as AuthedRequest;
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

    const { data: session } = await supabase
      .from('live_sessions')
      .select('products_shown')
      .eq('id', req.params.id)
      .maybeSingle();
    await supabase
      .from('live_sessions')
      .update({ products_shown: Number(session?.products_shown ?? 0) + 1 })
      .eq('id', req.params.id)
      .eq('host_id', userId);

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

    void notifyUser({
      userId,
      category: 'live',
      type: 'live_claim_reserved',
      title: 'Item reserved',
      body: listingTitle,
      deepLink: `live/${req.params.id}`,
      data: { sessionId: String(req.params.id) },
      email: liveClaimReservedEmail({
        sessionId: String(req.params.id),
        listingTitle,
        expiresInMinutes: Math.round(CLAIM_TTL_SECONDS / 60),
      }),
    });

    const { data: liveSession } = await service
      .from('live_sessions')
      .select('host_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (liveSession?.host_id && liveSession.host_id !== userId) {
      void notifyUser({
        userId: String(liveSession.host_id),
        category: 'live',
        type: 'live_claim_host',
        title: 'New claim on your live',
        body: `${profile?.username ?? 'A viewer'} claimed ${listingTitle}`,
        deepLink: `live/${req.params.id}`,
        data: { sessionId: String(req.params.id) },
      });
    }

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

router.delete('/sessions/:id/comments/:commentId', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const sessionId = String(req.params.id);
  const commentId = String(req.params.commentId);
  const access = await canModerateSession(sessionId, userId);
  if (!access.session) return sendError(res, 404, 'Session not found');
  if (!access.ok) return sendError(res, 403, 'Only the host or moderators can remove comments', 'FORBIDDEN');

  const service = createServiceClient();
  const { data: comment, error: commentError } = await service
    .from('live_comments')
    .select('id, user_id, text, session_id')
    .eq('id', commentId)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (commentError) return handleSupabaseError(res, commentError);
  if (!comment) return sendError(res, 404, 'Comment not found');

  const { error } = await service.from('live_comments').delete().eq('id', commentId).eq('session_id', sessionId);
  if (error) return handleSupabaseError(res, error);

  if (comment.user_id && comment.user_id !== userId) {
    void notifyUser({
      userId: String(comment.user_id),
      category: 'live',
      type: 'live_comment_removed',
      title: 'Comment removed',
      body: 'A moderator removed your comment from the live.',
      deepLink: `live/${sessionId}`,
      data: { sessionId, commentId },
      skipPush: true,
    });
  }

  return res.json({ ok: true, id: commentId });
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

    void notifyUser({
      userId,
      category: 'live',
      type: 'live_claim_reserved',
      title: 'Item reserved',
      body: (listing?.title as string) || 'your item',
      deepLink: `live/${req.params.id}`,
      data: { sessionId: String(req.params.id) },
      email: liveClaimReservedEmail({
        sessionId: String(req.params.id),
        listingTitle: (listing?.title as string) || 'your item',
        expiresInMinutes: Math.round(CLAIM_TTL_SECONDS / 60),
      }),
    });

    const { data: liveSession } = await service
      .from('live_sessions')
      .select('host_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (liveSession?.host_id && liveSession.host_id !== userId) {
      void notifyUser({
        userId: String(liveSession.host_id),
        category: 'live',
        type: 'live_claim_host',
        title: 'New claim on your live',
        body: `${profile?.username ?? 'A viewer'} claimed ${(listing?.title as string) || 'an item'}`,
        deepLink: `live/${req.params.id}`,
        data: { sessionId: String(req.params.id) },
      });
    }

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

router.post('/sessions/:id/report', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      kind: z.enum(['session', 'user', 'listing']),
      listingId: z.string().uuid().optional().nullable(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid report');

  const { data: sessionRow, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, host_id')
    .eq('id', req.params.id)
    .maybeSingle();
  if (sessionError) return handleSupabaseError(res, sessionError);
  if (!sessionRow) return sendError(res, 404, 'Session not found');

  const host = await getProfileById(supabase, sessionRow.host_id as string);
  const listingId =
    parsed.data.kind === 'listing' ? parsed.data.listingId ?? null : null;
  if (parsed.data.kind === 'listing' && !listingId) {
    return sendError(res, 400, 'listingId required');
  }

  const { data, error } = await supabase
    .from('live_reports')
    .insert({
      reporter_id: userId,
      live_session_id: req.params.id,
      kind: parsed.data.kind,
      target_username: host?.username ?? null,
      listing_id: listingId,
    })
    .select('id')
    .single();
  if (error) return handleSupabaseError(res, error);
  return res.status(201).json({ id: data.id, ok: true });
});

export default router;
