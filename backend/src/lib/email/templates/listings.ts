import { deepLinks } from '../deep-links.js';
import { buildEmail, escapeHtml, formatNaira, truncateSubject, type EmailContent } from '../layout.js';

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

export function followerNewListingEmail(input: {
  listingId: string;
  title: string;
  sellerUsername: string;
  price: number;
  brand?: string;
  size?: string;
  condition?: string;
  photoUrl?: string;
}): EmailContent {
  const link = deepLinks.product(input.listingId);
  const price = formatNaira(input.price);
  const metaBits = [input.brand, input.size, input.condition].filter(Boolean).map(String);
  const metaLine = metaBits.length ? metaBits.join(' · ') : '';
  const photo =
    input.photoUrl && /^https?:\/\//i.test(input.photoUrl)
      ? `<div style="margin:16px 0 12px;">
          <img src="${escapeHtml(input.photoUrl)}" alt="${escapeHtml(input.title)}" width="240" style="display:block;width:100%;max-width:240px;height:auto;border-radius:12px;border:1px solid #E2D7CC;" />
        </div>`
      : '';

  const detailsHtml = `
    ${photo}
    <strong style="color:#2B211F;">@${escapeHtml(input.sellerUsername)}</strong> just listed
    <strong style="color:#2B211F;">${escapeHtml(input.title)}</strong>
    for <strong style="color:#2B211F;">${escapeHtml(price)}</strong>.
    ${metaLine ? `<br /><span style="color:#7A6A64;">${escapeHtml(metaLine)}</span>` : ''}
  `;

  const detailsText = `@${input.sellerUsername} just listed ${input.title} for ${price}.${
    metaLine ? ` ${metaLine}.` : ''
  }`;

  return buildEmail({
    subject: truncateSubject(`@${input.sellerUsername} posted ${input.title}`),
    title: 'New from someone you follow',
    bodyHtml: detailsHtml,
    bodyText: detailsText,
    ctaLabel: 'View product',
    actionLink: link,
    footnote: 'You’re getting this because you follow this seller. Manage email alerts in Settings.',
  });
}
