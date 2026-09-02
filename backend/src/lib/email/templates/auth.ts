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
