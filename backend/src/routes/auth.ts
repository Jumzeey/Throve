import { Router } from 'express';
import { z } from 'zod';
import { buildAuthEmail } from '../lib/auth-email.js';
import { sendError } from '../lib/errors.js';
import { sendMailjetEmail } from '../lib/mailjet.js';
import { createServiceClient } from '../lib/supabase.js';

const router = Router();

function authRedirectUrl() {
  return process.env.AUTH_REDIRECT_URL?.trim() || 'throveapp://auth/callback';
}

function devSimulateEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH_SIMULATE === 'true';
}

const sendLinkSchema = z.object({
  email: z.string().email(),
  type: z.enum(['magiclink', 'signup', 'recovery']).default('magiclink'),
  name: z.string().optional(),
  username: z.string().optional(),
  dob: z.string().optional(),
});

/**
 * Generate a Supabase auth link (no email from Supabase), then deliver it via Mailjet.
 * This bypasses Supabase SMTP entirely.
 */
router.post('/send-link', async (req, res) => {
  const parsed = sendLinkSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const email = parsed.data.email.trim().toLowerCase();
  const type = parsed.data.type;
  const metadata: Record<string, string> = {};
  if (parsed.data.name?.trim()) metadata.name = parsed.data.name.trim();
  if (parsed.data.username?.trim()) metadata.username = parsed.data.username.trim();
  if (parsed.data.dob?.trim()) metadata.dob = parsed.data.dob.trim();

  const admin = createServiceClient();
  const redirectTo = authRedirectUrl();

  const linkType = type === 'recovery' ? 'recovery' : 'magiclink';
  const linkOptions = {
    redirectTo,
    ...(Object.keys(metadata).length ? { data: metadata } : {}),
  };

  let linkResult = await admin.auth.admin.generateLink({
    type: linkType,
    email,
    options: linkOptions,
  });

  // For signup/login, ensure the user exists if generateLink fails for missing user.
  if (linkResult.error && type !== 'recovery') {
    const createResult = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
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

  const actionLink = linkResult.data?.properties?.action_link;
  if (linkResult.error || !actionLink) {
    return sendError(res, 400, linkResult.error?.message ?? 'Could not generate auth link', 'AUTH_ERROR');
  }

  const userId = linkResult.data.user?.id;
  if (userId && Object.keys(metadata).length) {
    const profilePatch: Record<string, string> = {};
    if (metadata.name) profilePatch.name = metadata.name;
    if (metadata.username) profilePatch.username = metadata.username;
    if (metadata.dob) profilePatch.dob = metadata.dob;
    if (Object.keys(profilePatch).length) {
      await admin.from('profiles').update(profilePatch).eq('id', userId);
    }
  }

  try {
    const content = buildAuthEmail(type, actionLink, email);
    await sendMailjetEmail({
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send email';
    return sendError(res, 502, message, 'MAIL_ERROR');
  }

  return res.json({ ok: true, email });
});

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
