import { Router } from 'express';
import { z } from 'zod';
import { sendError } from '../lib/errors.js';
import { createServiceClient } from '../lib/supabase.js';

const router = Router();

function devSimulateEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH_SIMULATE === 'true';
}

router.post('/dev/simulate-link', async (req, res) => {
  if (!devSimulateEnabled()) {
    return sendError(res, 404, 'Not found', 'NOT_FOUND');
  }

  const parsed = z
    .object({
      email: z.string().email(),
      name: z.string().optional(),
      username: z.string().optional(),
      dob: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 400, 'Invalid input');
  }

  const email = parsed.data.email.trim().toLowerCase();
  const metadata: Record<string, string> = {};
  if (parsed.data.name?.trim()) metadata.name = parsed.data.name.trim();
  if (parsed.data.username?.trim()) metadata.username = parsed.data.username.trim();
  if (parsed.data.dob?.trim()) metadata.dob = parsed.data.dob.trim();

  const admin = createServiceClient();
  const linkOptions = Object.keys(metadata).length ? { data: metadata } : undefined;

  let linkResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: linkOptions,
  });

  if (linkResult.error) {
    const createResult = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (createResult.error && !createResult.error.message.toLowerCase().includes('already')) {
      return sendError(res, 400, createResult.error.message, 'AUTH_ERROR');
    }

    linkResult = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: linkOptions,
    });
  }

  if (linkResult.error || !linkResult.data?.properties?.hashed_token) {
    return sendError(res, 400, linkResult.error?.message ?? 'Could not generate auth link', 'AUTH_ERROR');
  }

  const userId = linkResult.data.user?.id;
  if (userId) {
    const profilePatch: Record<string, string> = {};
    if (metadata.name) profilePatch.name = metadata.name;
    if (metadata.username) profilePatch.username = metadata.username;
    if (metadata.dob) profilePatch.dob = metadata.dob;

    if (Object.keys(profilePatch).length) {
      await admin.from('profiles').update(profilePatch).eq('id', userId);
    }
  }

  const verifyResult = await admin.auth.verifyOtp({
    token_hash: linkResult.data.properties.hashed_token,
    type: 'email',
  });

  if (verifyResult.error || !verifyResult.data.session) {
    return sendError(res, 400, verifyResult.error?.message ?? 'Could not create session', 'AUTH_ERROR');
  }

  return res.json({
    access_token: verifyResult.data.session.access_token,
    refresh_token: verifyResult.data.session.refresh_token,
  });
});

export default router;
