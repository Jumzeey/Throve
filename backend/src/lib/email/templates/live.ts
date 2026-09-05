import { deepLinks } from '../deep-links.js';
import { buildEmail, escapeHtml, truncateSubject, type EmailContent } from '../layout.js';

export function liveUpcomingEmail(input: {
  sessionId: string;
  hostUsername: string;
  title: string;
  startTimeLabel: string;
}): EmailContent {
  const link = deepLinks.live(input.sessionId);
  return buildEmail({
    subject: truncateSubject(`${input.hostUsername} goes live soon`),
    title: 'Going live soon',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(input.hostUsername)}</strong> starts <strong style="color:#2B211F;">${escapeHtml(input.title)}</strong> at ${escapeHtml(input.startTimeLabel)}.`,
    bodyText: `@${input.hostUsername} starts ${input.title} at ${input.startTimeLabel}.`,
    ctaLabel: 'Open live room',
    actionLink: link,
  });
}

export function liveStartedEmail(input: {
  sessionId: string;
  hostUsername: string;
  title: string;
}): EmailContent {
  const link = deepLinks.live(input.sessionId);
  return buildEmail({
    subject: truncateSubject(`${input.hostUsername} is live now`),
    title: 'You’re live',
    bodyHtml: `<strong style="color:#2B211F;">${escapeHtml(input.title)}</strong> is live now. Hop in and start selling.`,
    bodyText: `${input.title} is live now.`,
    ctaLabel: 'Open live room',
    actionLink: link,
  });
}

export function liveModeratorAppointedEmail(input: {
  hostUsername: string;
  sessionId?: string;
  liveTitle?: string;
}): EmailContent {
  const link = input.sessionId ? deepLinks.live(input.sessionId) : deepLinks.liveList();
  const titleBit = input.liveTitle
    ? ` <strong style="color:#2B211F;">${escapeHtml(input.liveTitle)}</strong>`
    : ' a live';
  return buildEmail({
    subject: truncateSubject(`@${input.hostUsername} appointed you as a live moderator`),
    title: 'You’re a live moderator',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(input.hostUsername)}</strong> appointed you as a moderator for${titleBit}. You can help with comments only — no video, products, orders, or ending the live.`,
    bodyText: `@${input.hostUsername} appointed you as a moderator${input.liveTitle ? ` for ${input.liveTitle}` : ''}. You can help with comments only.`,
    ctaLabel: input.sessionId ? 'Open live room' : 'Open Throve Live',
    actionLink: link,
    footnote: 'A moderator is not a co-host.',
  });
}

export function liveClaimReservedEmail(input: {
  sessionId: string;
  listingTitle: string;
  expiresInMinutes: number;
}): EmailContent {
  const link = deepLinks.live(input.sessionId);
  return buildEmail({
    subject: truncateSubject('Item reserved for 5 minutes'),
    title: 'Item reserved',
    bodyHtml: `<strong style="color:#2B211F;">${escapeHtml(input.listingTitle)}</strong> is reserved for you for about ${input.expiresInMinutes} minutes. Complete checkout before it expires.`,
    bodyText: `${input.listingTitle} is reserved for about ${input.expiresInMinutes} minutes. Complete checkout soon.`,
    ctaLabel: 'Continue checkout',
    actionLink: link,
  });
}
