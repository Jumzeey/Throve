import { sendTransactionalEmail } from '../lib/email/send.js';
import { accountDeactivatedEmail } from '../lib/email/templates/account.js';
import { getProfileById, getProfileByUsername, mapProfile } from '../lib/mappers.js';
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

  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: parsed.data.name.trim(),
      username: parsed.data.username.trim(),
      bio: parsed.data.bio?.trim() ?? '',
      location: parsed.data.location?.trim() ?? '',
      photo_url: parsed.data.photoUri ?? null,
      dob: parsed.data.dob ?? null,
    })
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

  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: parsed.data.username.trim(),
      bio: parsed.data.bio?.trim() ?? '',
      location: parsed.data.location?.trim() ?? '',
      photo_url: parsed.data.photoUri ?? null,
      setup_complete: true,
    })
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
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 400, 'Invalid input');
  }

  const patch: Record<string, boolean> = {};
  if (parsed.data.notifOffers !== undefined) patch.notif_offers = parsed.data.notifOffers;
  if (parsed.data.notifMessages !== undefined) patch.notif_messages = parsed.data.notifMessages;

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
    photoUri: profile.photo_url ?? undefined,
  });
});

export default router;
