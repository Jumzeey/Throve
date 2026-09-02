import { deepLinks } from '../deep-links.js';
import { buildEmail, escapeHtml, formatNaira, truncateSubject, type EmailContent } from '../layout.js';

export type OrderEmailVars = {
  orderId: string;
  listingTitle: string;
  total: number;
  buyerName?: string;
  sellerName?: string;
  deliveryMethod?: string;
  tracking?: string;
  reason?: string;
  fromLive?: boolean;
};

export function orderPlacedBuyerEmail(vars: OrderEmailVars): EmailContent {
  const total = formatNaira(vars.total);
  const link = deepLinks.order(vars.orderId);
  const liveNote = vars.fromLive ? ' This purchase was made during a live session.' : '';
  return buildEmail({
    subject: truncateSubject('Order confirmed'),
    title: 'Order confirmed',
    bodyHtml: `Thanks for your order <strong style="color:#2B211F;">${escapeHtml(vars.orderId)}</strong>. <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> · ${escapeHtml(total)}${vars.deliveryMethod ? ` · ${escapeHtml(vars.deliveryMethod)} delivery` : ''}.${liveNote} Payment is simulated in this prototype.`,
    bodyText: `Order ${vars.orderId} confirmed. ${vars.listingTitle} · ${total}.${liveNote}`,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderPlacedSellerEmail(vars: OrderEmailVars): EmailContent {
  const total = formatNaira(vars.total);
  const link = deepLinks.order(vars.orderId);
  const buyer = vars.buyerName ? `@${vars.buyerName}` : 'A buyer';
  const liveNote = vars.fromLive ? ' Sold during a live session.' : '';
  return buildEmail({
    subject: truncateSubject(`You sold ${vars.listingTitle}`),
    title: 'You made a sale',
    bodyHtml: `<strong style="color:#2B211F;">${escapeHtml(buyer)}</strong> purchased <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> for ${escapeHtml(total)}.${liveNote} Ship when ready and mark the order as dispatched.`,
    bodyText: `${buyer} purchased ${vars.listingTitle} for ${total}.${liveNote}`,
    footnote: vars.deliveryMethod ? `Delivery: ${vars.deliveryMethod}` : undefined,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderDispatchedEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  return buildEmail({
    subject: truncateSubject('Your order is on the way'),
    title: 'Order on the way',
    bodyHtml: `Your order <strong style="color:#2B211F;">${escapeHtml(vars.orderId)}</strong> for <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> has been dispatched.${vars.tracking ? ` Tracking: ${escapeHtml(vars.tracking)}.` : ''}`,
    bodyText: `Order ${vars.orderId} for ${vars.listingTitle} has been dispatched.`,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderCompletedEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  const buyer = vars.buyerName ? `@${vars.buyerName}` : 'The buyer';
  return buildEmail({
    subject: truncateSubject('Order completed'),
    title: 'Order completed',
    bodyHtml: `${escapeHtml(buyer)} confirmed receipt of <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> (${escapeHtml(vars.orderId)}).`,
    bodyText: `${buyer} confirmed receipt of ${vars.listingTitle} (${vars.orderId}).`,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderCancelledEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  return buildEmail({
    subject: truncateSubject('Order cancelled'),
    title: 'Order cancelled',
    bodyHtml: `Order <strong style="color:#2B211F;">${escapeHtml(vars.orderId)}</strong> for <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> was cancelled.${vars.reason ? ` Reason: ${escapeHtml(vars.reason)}.` : ''} The listing may be available again.`,
    bodyText: `Order ${vars.orderId} for ${vars.listingTitle} was cancelled.${vars.reason ? ` Reason: ${vars.reason}.` : ''}`,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderReviewNudgeEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  return buildEmail({
    subject: truncateSubject('Leave a review'),
    title: 'How was your order?',
    bodyHtml: `Share a quick review for <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong>. It helps other buyers on Throve.`,
    bodyText: `Leave a review for ${vars.listingTitle}.`,
    ctaLabel: 'Leave a review',
    actionLink: link,
  });
}
