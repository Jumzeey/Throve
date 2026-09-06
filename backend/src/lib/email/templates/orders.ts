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
  carrier?: string;
  reason?: string;
  fromLive?: boolean;
  responsePreview?: string;
  payoutStatus?: string;
};

export function orderPlacedBuyerEmail(vars: OrderEmailVars): EmailContent {
  const total = formatNaira(vars.total);
  const link = deepLinks.order(vars.orderId);
  const liveNote = vars.fromLive ? ' This purchase was made during a live session.' : '';
  return buildEmail({
    subject: truncateSubject('Order confirmed'),
    title: 'Order confirmed',
    bodyHtml: `Thanks for your order <strong style="color:#2B211F;">${escapeHtml(vars.orderId)}</strong>. <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> · ${escapeHtml(total)}${vars.deliveryMethod ? ` · ${escapeHtml(vars.deliveryMethod)} delivery` : ''}.${liveNote}`,
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

export function orderTrackingUpdatedEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  const tracking = vars.tracking ? escapeHtml(vars.tracking) : '';
  const carrier = vars.carrier ? ` (${escapeHtml(vars.carrier)})` : '';
  return buildEmail({
    subject: truncateSubject('Tracking updated'),
    title: 'Tracking updated',
    bodyHtml: `Tracking for <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> (${escapeHtml(vars.orderId)}) was updated${carrier}.${tracking ? ` Number: <strong style="color:#2B211F;">${tracking}</strong>.` : ''}`,
    bodyText: `Tracking for ${vars.listingTitle} (${vars.orderId}) was updated.${vars.tracking ? ` ${vars.tracking}` : ''}`,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderDeliveredEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  return buildEmail({
    subject: truncateSubject('Confirm you received your order'),
    title: 'Marked as delivered',
    bodyHtml: `<strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> (${escapeHtml(vars.orderId)}) was marked delivered. Confirm you received it so the seller can get paid.`,
    bodyText: `${vars.listingTitle} (${vars.orderId}) was marked delivered. Confirm receipt in the app.`,
    ctaLabel: 'Confirm received',
    actionLink: link,
  });
}

export function orderCompletedEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  const buyer = vars.buyerName ? `@${vars.buyerName}` : 'The buyer';
  return buildEmail({
    subject: truncateSubject('Order completed'),
    title: 'Order completed',
    bodyHtml: `${escapeHtml(buyer)} confirmed receipt of <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> (${escapeHtml(vars.orderId)}). Your payout is now eligible.`,
    bodyText: `${buyer} confirmed receipt of ${vars.listingTitle} (${vars.orderId}). Payout is eligible.`,
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

export function orderDisputeOpenedEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  const buyer = vars.buyerName ? `@${vars.buyerName}` : 'The buyer';
  return buildEmail({
    subject: truncateSubject('Dispute opened on your sale'),
    title: 'Dispute opened',
    bodyHtml: `${escapeHtml(buyer)} opened a dispute on <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> (${escapeHtml(vars.orderId)}).${vars.reason ? ` Reason: ${escapeHtml(vars.reason)}.` : ''} Your payout is on hold until this is resolved.`,
    bodyText: `${buyer} opened a dispute on ${vars.listingTitle} (${vars.orderId}).`,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderDisputeUpdatedEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.order(vars.orderId);
  return buildEmail({
    subject: truncateSubject('Dispute update'),
    title: 'Dispute update',
    bodyHtml: `There’s a new update on the dispute for <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> (${escapeHtml(vars.orderId)}).${vars.responsePreview ? ` “${escapeHtml(vars.responsePreview)}”` : ''}`,
    bodyText: `Dispute update on ${vars.listingTitle} (${vars.orderId}).`,
    ctaLabel: 'View order',
    actionLink: link,
  });
}

export function orderPayoutStatusEmail(vars: OrderEmailVars): EmailContent {
  const link = deepLinks.ordersList();
  const status = vars.payoutStatus ?? 'updated';
  const title =
    status === 'eligible'
      ? 'Payout eligible'
      : status === 'on_hold'
        ? 'Payout on hold'
        : status === 'paid'
          ? 'Payout sent'
          : 'Payout update';
  return buildEmail({
    subject: truncateSubject(title),
    title,
    bodyHtml: `Payout status for <strong style="color:#2B211F;">${escapeHtml(vars.listingTitle)}</strong> (${escapeHtml(vars.orderId)}) is now <strong style="color:#2B211F;">${escapeHtml(status.replaceAll('_', ' '))}</strong>.`,
    bodyText: `Payout for ${vars.listingTitle} (${vars.orderId}) is now ${status}.`,
    ctaLabel: 'View orders',
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
