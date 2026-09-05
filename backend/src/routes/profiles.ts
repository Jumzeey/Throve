import { sendTransactionalEmail } from '../lib/email/send.js';
import { accountDeactivatedEmail } from '../lib/email/templates/account.js';
import { getProfileById, getProfileByUsername, mapProfile, publicPhotoUrl, storedPhotoUrl } from '../lib/mappers.js';
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
  if (taken.data) return sendError(res, 409, 'That username is unavailable', 'USERNAME_TAKEN');

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
  if (taken.data) return sendError(res, 409, 'That username is unavailable', 'USERNAME_TAKEN');

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
      preferredLoginMethod: z.enum(['password', 'magic_link']).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 400, 'Invalid input');
  }

  const patch: Record<string, boolean | string> = {};
  if (parsed.data.notifOffers !== undefined) patch.notif_offers = parsed.data.notifOffers;
  if (parsed.data.notifMessages !== undefined) patch.notif_messages = parsed.data.notifMessages;
  if (parsed.data.preferredLoginMethod !== undefined) {
    patch.preferred_login_method = parsed.data.preferredLoginMethod;
  }

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  if (error) return handleSupabaseError(res, error);
  return res.json(mapProfile(data));
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

router.get('/:username/public', optionalAuth, async (req, res) => {
  const supabase = (req as AuthedRequest).supabase ?? createSupabaseClient();
  const username = String(req.params.username);
  const profile = await getProfileByUsername(supabase, username);
  if (!profile || profile.deactivated) {
    return sendError(res, 404, 'Seller not found', 'NOT_FOUND');
  }
  return res.json({
    username: profile.username,
    bio: profile.bio,
    location: profile.location,
    photoUri: publicPhotoUrl(profile.photo_url),
  });
});

export default router;
