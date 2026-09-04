import { Router } from 'express';
import { z } from 'zod';
import { buildAuthEmail, buildPasswordOtpEmail } from '../lib/auth-email.js';
import { deepLinks } from '../lib/email/deep-links.js';
import { sendError } from '../lib/errors.js';
import { sendMailjetEmail } from '../lib/mailjet.js';
import { validatePassword } from '../lib/password.js';
import { createServiceClient, createSupabaseClient } from '../lib/supabase.js';
import { type AuthedRequest, optionalAuth } from '../middleware/auth.js';

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

  const hashedToken = linkResult.data?.properties?.hashed_token;
  if (linkResult.error || !hashedToken) {
    return sendError(res, 400, linkResult.error?.message ?? 'Could not generate auth link', 'AUTH_ERROR');
  }

  const verificationType =
    linkResult.data.properties.verification_type ||
    (type === 'recovery' ? 'recovery' : type === 'signup' ? 'signup' : 'magiclink');
  const emailActionLink = deepLinks.authCallback(
    `?token_hash=${encodeURIComponent(hashedToken)}&type=${encodeURIComponent(verificationType)}`,
  );

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
    const content = buildAuthEmail(type, emailActionLink, email);
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

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  username: z.string().min(1),
  dob: z.string().min(1),
  phone: z.string().min(8),
});

/** Create account with password, then email a typed OTP for verification. */
router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const name = parsed.data.name.trim();
  const username = parsed.data.username.trim();
  const dob = parsed.data.dob.trim();
  const phone = parsed.data.phone.trim();

  const passwordError = validatePassword(password);
  if (passwordError) return sendError(res, 400, passwordError, 'WEAK_PASSWORD');

  const admin = createServiceClient();

  const taken = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken.error) return sendError(res, 500, taken.error.message, 'DB_ERROR');
  if (taken.data) return sendError(res, 409, 'That username is taken. Try another.', 'USERNAME_TAKEN');

  const metadata = { name, username, dob, phone };
  const createResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: metadata,
  });

  if (createResult.error) {
    const msg = createResult.error.message.toLowerCase();
    if (msg.includes('already')) {
      return sendError(res, 409, 'An account with this email already exists. Log in instead.', 'EMAIL_TAKEN');
    }
    return sendError(res, 400, createResult.error.message, 'AUTH_ERROR');
  }

  const userId = createResult.data.user.id;
  await admin
    .from('profiles')
    .update({
      name,
      username,
      dob,
      phone,
      has_password: true,
      preferred_login_method: 'password',
    })
    .eq('id', userId);

  const otpResult = await sendOtpEmail(admin, email, 'signup');
  if (!otpResult.ok) {
    return sendError(res, otpResult.status, otpResult.message, otpResult.code);
  }

  return res.json({ ok: true, email });
});

router.post('/login-options', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createServiceClient();
  const { data, error } = await admin
    .from('profiles')
    .select('has_password, preferred_login_method, deactivated')
    .ilike('email', email)
    .maybeSingle();

  if (error) return sendError(res, 500, error.message, 'DB_ERROR');
  if (!data || data.deactivated) {
    return res.json({
      exists: false,
      hasPassword: false,
      preferredLoginMethod: 'password' as const,
    });
  }

  return res.json({
    exists: true,
    hasPassword: Boolean(data.has_password),
    preferredLoginMethod: data.preferred_login_method === 'magic_link' ? 'magic_link' : 'password',
  });
});

router.post('/password/send-otp', optionalAuth, async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email(),
      purpose: z.enum(['setup', 'change', 'signup']).default('setup'),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const email = parsed.data.email.trim().toLowerCase();
  const purpose = parsed.data.purpose;
  const authed = req as AuthedRequest;

  if (purpose === 'change') {
    if (!authed.userId) return sendError(res, 401, 'Sign in to change your password', 'UNAUTHORIZED');
    const admin = createServiceClient();
    const { data: profile } = await admin.from('profiles').select('email').eq('id', authed.userId).maybeSingle();
    if (!profile || profile.email.toLowerCase() !== email) {
      return sendError(res, 403, 'Email does not match your account', 'FORBIDDEN');
    }
  }

  if (purpose === 'setup' || purpose === 'change') {
    const admin = createServiceClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id, has_password, deactivated')
      .ilike('email', email)
      .maybeSingle();

    if (!profile || profile.deactivated) {
      return res.json({ ok: true, email });
    }
  }

  const admin = createServiceClient();
  const otpResult = await sendOtpEmail(admin, email, purpose === 'signup' ? 'signup' : purpose);
  if (!otpResult.ok) {
    return sendError(res, otpResult.status, otpResult.message, otpResult.code);
  }

  return res.json({ ok: true, email });
});

router.post('/password/set', optionalAuth, async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email(),
      otp: z.string().min(4).max(12),
      password: z.string().min(8),
      purpose: z.enum(['setup', 'change', 'signup']).default('setup'),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const email = parsed.data.email.trim().toLowerCase();
  const otp = parsed.data.otp.trim();
  const password = parsed.data.password;
  const purpose = parsed.data.purpose;

  const passwordError = validatePassword(password);
  if (passwordError) return sendError(res, 400, passwordError, 'WEAK_PASSWORD');

  // Anon client for verify/sign-in — service-role Authorization breaks verifyOtp.
  const authClient = createSupabaseClient();
  const admin = createServiceClient();

  const otpTypes =
    purpose === 'signup'
      ? (['email', 'magiclink'] as const)
      : (['recovery', 'email', 'magiclink'] as const);

  let userId: string | null = null;
  let lastOtpError: string | null = null;

  for (const otpType of otpTypes) {
    const verifyResult = await authClient.auth.verifyOtp({
      email,
      token: otp,
      type: otpType,
    });
    if (!verifyResult.error && verifyResult.data.user) {
      userId = verifyResult.data.user.id;
      break;
    }
    lastOtpError = verifyResult.error?.message ?? 'Invalid or expired code';
  }

  if (!userId) {
    return sendError(res, 400, lastOtpError ?? 'Invalid or expired code', 'OTP_INVALID');
  }

  const updateResult = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });

  if (updateResult.error) {
    return sendError(res, 400, updateResult.error.message, 'AUTH_ERROR');
  }

  await admin
    .from('profiles')
    .update({
      has_password: true,
      ...(purpose === 'setup' || purpose === 'signup' ? { preferred_login_method: 'password' } : {}),
    })
    .eq('id', userId);

  // Updating the password can invalidate the OTP session. Mint a fresh one.
  const signIn = await authClient.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) {
    return sendError(
      res,
      400,
      signIn.error?.message ?? 'Password saved, but sign-in failed. Try logging in.',
      'AUTH_ERROR',
    );
  }

  return res.json({
    ok: true,
    email,
    access_token: signIn.data.session.access_token,
    refresh_token: signIn.data.session.refresh_token,
  });
});

/** Confirm signup email with OTP (password already set at create). */
router.post('/signup/verify-otp', async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email(),
      otp: z.string().min(4).max(12),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const email = parsed.data.email.trim().toLowerCase();
  const otp = parsed.data.otp.trim();
  const authClient = createSupabaseClient();
  const admin = createServiceClient();

  const verifyResult = await authClient.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });

  if (verifyResult.error || !verifyResult.data.session) {
    return sendError(res, 400, verifyResult.error?.message ?? 'Invalid or expired code', 'OTP_INVALID');
  }

  const userId = verifyResult.data.user?.id;
  if (userId) {
    await admin.from('profiles').update({ has_password: true, preferred_login_method: 'password' }).eq('id', userId);
  }

  return res.json({
    access_token: verifyResult.data.session.access_token,
    refresh_token: verifyResult.data.session.refresh_token,
  });
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

async function sendOtpEmail(
  admin: ReturnType<typeof createServiceClient>,
  email: string,
  purpose: 'setup' | 'change' | 'signup',
): Promise<{ ok: true } | { ok: false; status: number; message: string; code: string }> {
  const linkResult = await admin.auth.admin.generateLink({
    // recovery OTPs are the right type for set/change password; signup stays magiclink elsewhere
    type: purpose === 'signup' ? 'magiclink' : 'recovery',
    email,
    options: { redirectTo: authRedirectUrl() },
  });

  if (linkResult.error) {
    return {
      ok: false,
      status: 400,
      message: linkResult.error.message,
      code: 'AUTH_ERROR',
    };
  }

  const otp = linkResult.data.properties?.email_otp;
  if (!otp) {
    return {
      ok: false,
      status: 400,
      message: 'Could not generate verification code',
      code: 'AUTH_ERROR',
    };
  }

  try {
    const content = buildPasswordOtpEmail(purpose, otp, email);
    await sendMailjetEmail({
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send email';
    return { ok: false, status: 502, message, code: 'MAIL_ERROR' };
  }

  return { ok: true };
}

export default router;
