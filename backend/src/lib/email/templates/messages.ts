import { deepLinks } from '../deep-links.js';
import { buildEmail, escapeHtml, truncateSubject, type EmailContent } from '../layout.js';

export function messageNewEmail(input: {
  conversationId: string;
  fromUsername: string;
  preview: string;
}): EmailContent {
  const preview = input.preview.trim().slice(0, 140);
  const link = deepLinks.chat(input.conversationId);
  return buildEmail({
    subject: truncateSubject(`New message from @${input.fromUsername}`),
    title: 'New message',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(input.fromUsername)}</strong> wrote: “${escapeHtml(preview)}${input.preview.length > 140 ? '…' : ''}”`,
    bodyText: `@${input.fromUsername}: ${preview}`,
    ctaLabel: 'Open chat',
    actionLink: link,
  });
}
