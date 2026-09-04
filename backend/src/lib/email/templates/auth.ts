import { buildEmail, escapeHtml, type EmailContent } from '../layout.js';

export type AuthEmailKind = 'magiclink' | 'signup' | 'recovery';

export function buildAuthEmail(kind: AuthEmailKind, actionLink: string, email: string): EmailContent {
  if (kind === 'signup') {
    return buildEmail({
      subject: 'Confirm your Throve account',
      title: 'Confirm your email',
      bodyHtml:
        'Welcome to Throve. Tap the button below to verify your email and finish creating your account.',
      bodyText: 'Welcome to Throve. Open this link to finish signup.',
      footnote: 'This link expires shortly and can only be used once.',
      ctaLabel: 'Confirm email address',
      actionLink,
    });
  }

  if (kind === 'recovery') {
    return buildEmail({
      subject: 'Recover your Throve account',
      title: 'Account recovery',
      bodyHtml: `We received a recovery request for <strong style="color:#2B211F;">${escapeHtml(email)}</strong>.`,
      bodyText: `We received a recovery request for ${email}.`,
      footnote: 'Tap the button below to continue. If you did not request this, you can ignore this email.',
      ctaLabel: 'Continue recovery',
      actionLink,
    });
  }

  return buildEmail({
    subject: 'Your Throve sign-in link',
    title: 'Your sign-in link',
    bodyHtml: 'Tap the button below to sign in to Throve. This link expires shortly and can only be used once.',
    bodyText: 'Open this link to sign in to Throve.',
    footnote: 'If you did not request this email, you can safely ignore it.',
    ctaLabel: 'Sign in to Throve',
    actionLink,
  });
}

export type PasswordOtpPurpose = 'setup' | 'change' | 'signup';

export function buildPasswordOtpEmail(purpose: PasswordOtpPurpose, otp: string, email: string): EmailContent {
  const codeBlock = `<div style="margin:20px 0;padding:18px 20px;border-radius:12px;background:#FFFCF8;border:1px solid #E2D7CC;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:32px;letter-spacing:8px;color:#5A1F45;font-weight:600;">${escapeHtml(otp)}</div>`;

  if (purpose === 'signup') {
    return buildEmail({
      subject: 'Your Throve verification code',
      title: 'Verify your email',
      bodyHtml: `Enter this code in the Throve app to finish creating your account for <strong style="color:#2B211F;">${escapeHtml(email)}</strong>.${codeBlock}`,
      bodyText: `Your Throve verification code is ${otp}. Enter it in the app to finish creating your account.`,
      footnote: 'This code expires shortly. If you did not create a Throve account, you can ignore this email.',
    });
  }

  if (purpose === 'change') {
    return buildEmail({
      subject: 'Your Throve password change code',
      title: 'Confirm password change',
      bodyHtml: `Use this code to confirm changing the password for <strong style="color:#2B211F;">${escapeHtml(email)}</strong>.${codeBlock}`,
      bodyText: `Your Throve password change code is ${otp}.`,
      footnote: 'This code expires shortly. If you did not request a password change, you can ignore this email.',
    });
  }

  return buildEmail({
    subject: 'Your Throve password setup code',
    title: 'Set up your password',
    bodyHtml: `Use this code to verify your email and create a password for <strong style="color:#2B211F;">${escapeHtml(email)}</strong>.${codeBlock}`,
    bodyText: `Your Throve password setup code is ${otp}. Enter it in the app to create your password.`,
    footnote: 'This code expires shortly. If you did not request this, you can ignore this email.',
  });
}
