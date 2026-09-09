import { sendTransactionalEmail } from '../lib/email/send.js';
import { accountDeactivatedEmail } from '../lib/email/templates/account.js';
import { getFollowStats } from '../lib/follows.js';
import { getProfileById, getProfileByUsername, mapProfile, publicPhotoUrl, storedPhotoUrl } from '../lib/mappers.js';
import { notifyUser } from '../lib/notify.js';
import { createSupabaseClient } from '../lib/supabase.js';
import { type AuthedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';
import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const profile = await getProfileById(supabase, userId);
  if (!profile || profile.deactivated) {
    return sendError(res, 404, 'Profile not found', 'NOT_FOUND');
  }
  if (profile.photo_url && !publicPhotoUrl(profile.photo_url)) {
    await supabase.from('profiles').update({ photo_url: null }).eq('id', userId);
    profile.photo_url = null;
  }
  return res.json(mapProfile(profile));
});

router.put('/me', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      name: z.string().min(1),
      username: z.string().min(1),
      bio: z.string().optional(),
      location: z.string().optional(),
      photoUri: z.string().optional(),
      dob: z.string().optional(),
      phone: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 400, parsed.error.errors[0]?.message ?? 'Invalid input');
  }

  const taken = await supabase
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .neq('id', userId)
    .maybeSingle();

  if (taken.error) return handleSupabaseError(res, taken.error);
  if (taken.data) return sendError(res, 409, 'That username is taken. Try another.', 'USERNAME_TAKEN');

  const patch: Record<string, string | null> = {
    name: parsed.data.name.trim(),
    username: parsed.data.username.trim(),
    bio: parsed.data.bio?.trim() ?? '',
    location: parsed.data.location?.trim() ?? '',
  };
  if (parsed.data.dob !== undefined) patch.dob = parsed.data.dob || null;
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone.trim() || null;
  const photoUrl = storedPhotoUrl(parsed.data.photoUri);
  if (photoUrl !== undefined) patch.photo_url = photoUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);
  return res.json(mapProfile(data));
});

router.post('/me/setup', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      username: z.string().min(1),
      bio: z.string().optional(),
      location: z.string().optional(),
      photoUri: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 400, parsed.error.errors[0]?.message ?? 'Invalid input');
  }

  const taken = await supabase
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .neq('id', userId)
    .maybeSingle();

  if (taken.error) return handleSupabaseError(res, taken.error);
  if (taken.data) return sendError(res, 409, 'That username is taken. Try another.', 'USERNAME_TAKEN');

  const setupPatch: Record<string, string | boolean | null> = {
    username: parsed.data.username.trim(),
    bio: parsed.data.bio?.trim() ?? '',
    location: parsed.data.location?.trim() ?? '',
    setup_complete: true,
  };
  const setupPhoto = storedPhotoUrl(parsed.data.photoUri);
  if (setupPhoto !== undefined) setupPatch.photo_url = setupPhoto;

  const { data, error } = await supabase
    .from('profiles')
    .update(setupPatch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);
  return res.json(mapProfile(data));
});

router.patch('/me/settings', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      notifOffers: z.boolean().optional(),
      notifMessages: z.boolean().optional(),
      notifLive: z.boolean().optional(),
      notifListings: z.boolean().optional(),
      notifOrders: z.boolean().optional(),
      notifPushEnabled: z.boolean().optional(),
      notifMessageTone: z.enum(['default', 'note', 'chime', 'soft', 'none']).optional(),
      preferredLoginMethod: z.enum(['password', 'magic_link']).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 400, 'Invalid input');
  }

  const patch: Record<string, boolean | string> = {};
  if (parsed.data.notifOffers !== undefined) patch.notif_offers = parsed.data.notifOffers;
  if (parsed.data.notifMessages !== undefined) patch.notif_messages = parsed.data.notifMessages;
  if (parsed.data.notifLive !== undefined) patch.notif_live = parsed.data.notifLive;
  if (parsed.data.notifListings !== undefined) patch.notif_listings = parsed.data.notifListings;
  if (parsed.data.notifOrders !== undefined) patch.notif_orders = parsed.data.notifOrders;
  if (parsed.data.notifPushEnabled !== undefined) patch.notif_push_enabled = parsed.data.notifPushEnabled;
  if (parsed.data.notifMessageTone !== undefined) patch.notif_message_tone = parsed.data.notifMessageTone;
  if (parsed.data.preferredLoginMethod !== undefined) {
    patch.preferred_login_method = parsed.data.preferredLoginMethod;
  }

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  if (error) return handleSupabaseError(res, error);
  return res.json(mapProfile(data));
});

router.post('/me/heartbeat', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const now = new Date().toISOString();
  const { data: current } = await supabase.from('profiles').select('last_seen_at').eq('id', userId).maybeSingle();
  const last = current?.last_seen_at ? new Date(String(current.last_seen_at)).getTime() : 0;
  if (!last || Date.now() - last > 20_000) {
    const { error } = await supabase.from('profiles').update({ last_seen_at: now }).eq('id', userId);
    if (error) return handleSupabaseError(res, error);
  }
  return res.json({ ok: true, lastSeenAt: Date.now() });
});

router.post('/me/deactivate', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;

  await supabase
    .from('listings')
    .update({ status: 'hidden' })
    .eq('seller_id', userId)
    .in('status', ['available', 'draft']);

  // Send before deactivating — recipients skip deactivated profiles.
  await sendTransactionalEmail({
    toUserId: userId,
    content: accountDeactivatedEmail(),
  });

  const { error } = await supabase.from('profiles').update({ deactivated: true }).eq('id', userId);
  if (error) return handleSupabaseError(res, error);

  return res.json({ ok: true });
});

router.get('/search', requireAuth, async (req, res) => {
  const raw = String(req.query.q ?? '')
    .trim()
    .replace(/^@/, '');
  if (raw.length < 1) return res.json([]);

  const { supabase } = req as AuthedRequest;
  const escaped = raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const { data, error } = await supabase
    .from('profiles')
    .select('username, name, photo_url, deactivated, setup_complete, id')
    .eq('deactivated', false)
    .eq('setup_complete', true)
    .or(`username.ilike.%${escaped}%,name.ilike.%${escaped}%`)
    .order('username', { ascending: true })
    .limit(8);

  if (error) return handleSupabaseError(res, error);
  return res.json(
    (data ?? []).map((row) => ({
      username: row.username,
      name: row.name || row.username,
      photoUri: publicPhotoUrl(row.photo_url),
    })),
  );
});

router.get('/:username/public', optionalAuth, async (req, res) => {
  const supabase = (req as AuthedRequest).supabase ?? createSupabaseClient();
  const userId = (req as AuthedRequest).userId;
  const username = String(req.params.username);
  const profile = await getProfileByUsername(supabase, username);
  if (!profile || profile.deactivated) {
    return sendError(res, 404, 'Seller not found', 'NOT_FOUND');
  }
  const stats = await getFollowStats(profile.id, userId);
  return res.json({
    username: profile.username,
    userId: profile.id,
    bio: profile.bio,
    location: profile.location,
    photoUri: publicPhotoUrl(profile.photo_url),
    followerCount: stats.followerCount,
    followingCount: stats.followingCount,
    isFollowing: stats.isFollowing,
    lastSeenAt: profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : null,
  });
});

router.post('/:username/follow', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const username = String(req.params.username);
  const seller = await getProfileByUsername(supabase, username);
  if (!seller || seller.deactivated) {
    return sendError(res, 404, 'Seller not found', 'NOT_FOUND');
  }
  if (seller.id === userId) {
    return sendError(res, 400, 'You cannot follow yourself');
  }

  const { data: existingFollow } = await supabase
    .from('seller_follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('seller_id', seller.id)
    .maybeSingle();

  // RLS allows insert/delete only — no update — so do not upsert on conflict.
  if (!existingFollow) {
    const { error } = await supabase.from('seller_follows').insert({
      follower_id: userId,
      seller_id: seller.id,
    });
    if (error) return handleSupabaseError(res, error);

    const follower = await getProfileById(supabase, userId);
    if (follower?.username) {
      void notifyUser({
        userId: seller.id,
        category: 'account',
        type: 'new_follower',
        title: 'New follower',
        body: `@${follower.username} started following you`,
        deepLink: `seller/${follower.username}`,
        data: { followerUsername: follower.username },
      });
    }
  }

  const stats = await getFollowStats(seller.id, userId);
  return res.json({
    username: seller.username,
    followerCount: stats.followerCount,
    followingCount: stats.followingCount,
    isFollowing: true,
  });
});

router.delete('/:username/follow', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const username = String(req.params.username);
  const seller = await getProfileByUsername(supabase, username);
  if (!seller || seller.deactivated) {
    return sendError(res, 404, 'Seller not found', 'NOT_FOUND');
  }

  const { error } = await supabase
    .from('seller_follows')
    .delete()
    .eq('follower_id', userId)
    .eq('seller_id', seller.id);
  if (error) return handleSupabaseError(res, error);

  const stats = await getFollowStats(seller.id, userId);
  return res.json({
    username: seller.username,
    followerCount: stats.followerCount,
    followingCount: stats.followingCount,
    isFollowing: false,
  });
});

export default router;
