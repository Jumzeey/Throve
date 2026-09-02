import { deepLinks } from '../deep-links.js';
import { buildEmail, escapeHtml, truncateSubject, type EmailContent } from '../layout.js';

export function listingPublishedEmail(input: { listingId: string; title: string }): EmailContent {
  const link = deepLinks.product(input.listingId);
  return buildEmail({
    subject: truncateSubject('Listing is live'),
    title: 'Listing published',
    bodyHtml: `<strong style="color:#2B211F;">${escapeHtml(input.title)}</strong> is now live on Throve. Shoppers can find and buy it.`,
    bodyText: `${input.title} is now live on Throve.`,
    ctaLabel: 'View listing',
    actionLink: link,
  });
}
