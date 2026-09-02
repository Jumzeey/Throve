import { buildEmail, type EmailContent } from '../layout.js';

export function accountDeactivatedEmail(): EmailContent {
  return buildEmail({
    subject: 'Account deactivated',
    title: 'Account deactivated',
    bodyHtml:
      'Your Throve account has been deactivated. Active listings were hidden. Records needed for order and review history may be retained.',
    bodyText:
      'Your Throve account has been deactivated. Active listings were hidden. Records needed for order and review history may be retained.',
  });
}
