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
    title: 'Live now',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(input.hostUsername)}</strong> is live with <strong style="color:#2B211F;">${escapeHtml(input.title)}</strong>.`,
    bodyText: `@${input.hostUsername} is live with ${input.title}.`,
    ctaLabel: 'Open live room',
    actionLink: link,
  });
}

export function followerLiveStartedEmail(input: {
  sessionId: string;
  hostUsername: string;
  title: string;
}): EmailContent {
  const link = deepLinks.live(input.sessionId);
  return buildEmail({
    subject: truncateSubject(`@${input.hostUsername} is live now`),
    title: 'Someone you follow is live',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(input.hostUsername)}</strong> just went live with <strong style="color:#2B211F;">${escapeHtml(input.title)}</strong>.`,
    bodyText: `@${input.hostUsername} just went live with ${input.title}.`,
    ctaLabel: 'Watch live',
    actionLink: link,
    footnote: 'You’re getting this because you follow this seller. Manage alerts in Settings.',
  });
}

export function followerLiveUpcomingEmail(input: {
  sessionId: string;
  hostUsername: string;
  title: string;
  startTimeLabel: string;
}): EmailContent {
  const link = deepLinks.live(input.sessionId);
  return buildEmail({
    subject: truncateSubject(`@${input.hostUsername} goes live soon`),
    title: 'Live starting soon',
    bodyHtml: `<strong style="color:#2B211F;">@${escapeHtml(input.hostUsername)}</strong> starts <strong style="color:#2B211F;">${escapeHtml(input.title)}</strong> at ${escapeHtml(input.startTimeLabel)}.`,
    bodyText: `@${input.hostUsername} starts ${input.title} at ${input.startTimeLabel}.`,
    ctaLabel: 'Open live room',
    actionLink: link,
    footnote: 'You’re getting this because you follow this seller. Manage alerts in Settings.',
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

export function liveClaimExpiredEmail(input: {
  sessionId: string;
  listingTitle: string;
}): EmailContent {
  const link = deepLinks.live(input.sessionId);
  return buildEmail({
    subject: truncateSubject('Your claim expired'),
    title: 'Claim expired',
    bodyHtml: `Your hold on <strong style="color:#2B211F;">${escapeHtml(input.listingTitle)}</strong> expired. Someone else can claim it now.`,
    bodyText: `Your hold on ${input.listingTitle} expired.`,
    ctaLabel: 'Back to live',
    actionLink: link,
  });
}

export function liveEndedWithClaimEmail(input: {
  sessionId: string;
  listingTitle: string;
}): EmailContent {
  const link = deepLinks.live(input.sessionId);
  return buildEmail({
    subject: truncateSubject('Live ended — finish checkout'),
    title: 'Live ended',
    bodyHtml: `The live ended while you still had a hold on <strong style="color:#2B211F;">${escapeHtml(input.listingTitle)}</strong>. Complete checkout soon before it expires.`,
    bodyText: `The live ended while you still had a hold on ${input.listingTitle}. Complete checkout soon.`,
    ctaLabel: 'Continue checkout',
    actionLink: link,
  });
}

export function liveHostAccessGrantedEmail(): EmailContent {
  const link = deepLinks.liveList();
  return buildEmail({
    subject: truncateSubject('You can host live on Throve'),
    title: 'Live hosting unlocked',
    bodyHtml: `You’re cleared to host live sessions on Throve. Open Live to prepare your first broadcast.`,
    bodyText: `You’re cleared to host live sessions on Throve.`,
    ctaLabel: 'Open Live',
    actionLink: link,
  });
}
