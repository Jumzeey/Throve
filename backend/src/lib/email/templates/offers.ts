import { deepLinks } from '../deep-links.js';
import { buildEmail, escapeHtml, formatNaira, truncateSubject, type EmailContent } from '../layout.js';

export type OfferEmailVars = {
  offerId: string;
  listingTitle: string;
  amount: number;
  otherUsername: string;
  expiresAt?: string;
};

export function offerReceivedEmail(vars: OfferEmailVars): EmailContent {
  const amount = formatNaira(vars.amount);
  const link = deepLinks.offer(vars.offerId);
  return buildEmail({
    subject: truncateSubject(`New offer on ${vars.listingTitle}`),
    title: 'New offer',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(vars.otherUsername)}</strong> offered <strong style="color:#2B211F;">${escapeHtml(amount)}</strong> on <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong>. Offers expire in 24 hours.`,
    bodyText: `@${vars.otherUsername} offered ${amount} on ${vars.listingTitle}. Offers expire in 24 hours.`,
    ctaLabel: 'View offer',
    actionLink: link,
  });
}

export function offerAcceptedEmail(vars: OfferEmailVars): EmailContent {
  const amount = formatNaira(vars.amount);
  const link = deepLinks.offer(vars.offerId);
  return buildEmail({
    subject: truncateSubject(`Your offer was accepted`),
    title: 'Offer accepted',
    bodyHtml: `Good news — your offer of <strong style="color:#2B211F;">${escapeHtml(amount)}</strong> on <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> was accepted. Complete checkout to secure the item.`,
    bodyText: `Your offer of ${amount} on ${vars.listingTitle} was accepted. Complete checkout to secure the item.`,
    ctaLabel: 'Continue to checkout',
    actionLink: link,
  });
}

export function offerRejectedEmail(vars: OfferEmailVars): EmailContent {
  const link = deepLinks.offer(vars.offerId);
  return buildEmail({
    subject: truncateSubject(`Offer update on ${vars.listingTitle}`),
    title: 'Offer update',
    bodyHtml: `Your offer on <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> wasn’t accepted this time. You can keep browsing or make another offer later.`,
    bodyText: `Your offer on ${vars.listingTitle} wasn’t accepted this time.`,
    ctaLabel: 'View offer',
    actionLink: link,
  });
}

export function offerWithdrawnEmail(vars: OfferEmailVars): EmailContent {
  const link = deepLinks.offersList();
  return buildEmail({
    subject: truncateSubject(`Offer withdrawn`),
    title: 'Offer withdrawn',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(vars.otherUsername)}</strong> withdrew their offer on <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong>.`,
    bodyText: `@${vars.otherUsername} withdrew their offer on ${vars.listingTitle}.`,
    ctaLabel: 'View offers',
    actionLink: link,
  });
}

export function offerExpiredEmail(vars: OfferEmailVars): EmailContent {
  const link = deepLinks.offer(vars.offerId);
  return buildEmail({
    subject: truncateSubject(`Offer expired`),
    title: 'Offer expired',
    bodyHtml: `The offer of <strong style="color:#2B211F;">${escapeHtml(formatNaira(vars.amount))}</strong> on <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> has expired.`,
    bodyText: `The offer of ${formatNaira(vars.amount)} on ${vars.listingTitle} has expired.`,
    ctaLabel: 'View offer',
    actionLink: link,
  });
}
