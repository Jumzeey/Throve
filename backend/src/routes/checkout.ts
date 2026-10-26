import { Router } from 'express';
import { z } from 'zod';
import { ensurePayoutForOrder } from '../lib/admin-payouts.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import type { DbRow } from '../lib/db-types.js';
import {
  orderCancelledEmail,
  orderCompletedEmail,
  orderDeliveredEmail,
  orderDispatchedEmail,
  orderDisputeOpenedEmail,
  orderDisputeUpdatedEmail,
  orderPlacedBuyerEmail,
  orderPlacedSellerEmail,
  orderPayoutStatusEmail,
  orderTrackingUpdatedEmail,
} from '../lib/email/templates/orders.js';
import { getProfileById, getProfileByUsername, listingAvailableQuantity } from '../lib/mappers.js';
import { notifyUser } from '../lib/notify.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { buyerProtectionFee, shippingFee } from '../lib/listing-catalog.js';
import { autoCompleteAtFrom, mapOrderJson, runAutoCompleteDueOrders } from '../lib/order-map.js';
import { fulfillPaidCheckout, paymentMode } from '../lib/checkout-fulfill.js';

const router = Router();
const RESERVE_MS = 10 * 60 * 1000;

router.get('/orders', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  await runAutoCompleteDueOrders(createServiceClient());

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return handleSupabaseError(res, error);

  const mapped = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const isSeller = row.seller_id === userId;
      const seller = isSeller ? await getProfileById(supabase, userId) : null;
      return mapOrderJson(supabase, row, {
        includeSellerFinance: isSeller,
        sellerPayoutVerified: Boolean(seller?.payout_verified),
      });
    }),
  );

  return res.json(mapped);
});

router.get('/orders/:id', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  await runAutoCompleteDueOrders(createServiceClient());

  const { data, error } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Order not found');
  if (data.buyer_id !== userId && data.seller_id !== userId) return sendError(res, 403, 'Forbidden');

  const isSeller = data.seller_id === userId;
  const seller = isSeller ? await getProfileById(supabase, userId) : null;
  return res.json(
    await mapOrderJson(supabase, data, {
      includeSellerFinance: isSeller,
      sellerPayoutVerified: Boolean(seller?.payout_verified),
    }),
  );
});

router.post('/start', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      listingId: z.string().optional(),
      liveSessionId: z.string().nullable().optional(),
      liveStreamProductId: z.string().nullable().optional(),
      claimId: z.string().nullable().optional(),
      offerId: z.string().uuid().optional().nullable(),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  let listingId = parsed.data.listingId;
  let itemPrice: number | undefined;
  let listedPrice: number | undefined;
  let offerId = parsed.data.offerId ?? null;
  let liveStreamProductId = parsed.data.liveStreamProductId ?? undefined;
  let claimId = parsed.data.claimId ?? undefined;
  let liveSessionId = parsed.data.liveSessionId ?? null;

  if (claimId) {
    const { data: claim } = await supabase.from('live_claims').select('*').eq('id', claimId).maybeSingle();
    if (!claim || claim.user_id !== userId || claim.status !== 'active') {
      return sendError(res, 400, 'Invalid claim');
    }
    if (new Date(claim.expires_at).getTime() < Date.now()) {
      return sendError(res, 400, 'Claim expired', 'CLAIM_EXPIRED');
    }
    liveStreamProductId = claim.live_stream_product_id;
    listingId = claim.listing_id;
    liveSessionId = claim.live_session_id ?? claim.session_id;
  }

  if (liveStreamProductId) {
    const { data: product } = await supabase
      .from('live_stream_products')
      .select('*')
      .eq('id', liveStreamProductId)
      .maybeSingle();
    if (!product) return sendError(res, 404, 'Live product not found');
    listingId = product.listing_id;
    itemPrice = product.live_price;
    liveSessionId = product.live_session_id;

    if (!claimId) {
      const { data: claim } = await supabase
        .from('live_claims')
        .select('*')
        .eq('live_stream_product_id', liveStreamProductId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (!claim) return sendError(res, 400, 'Claim this product before checkout');
      claimId = claim.id;
    }
  }

  if (offerId) {
    const { data: offer, error: offerError } = await supabase.from('offers').select('*').eq('id', offerId).maybeSingle();
    if (offerError) return handleSupabaseError(res, offerError);
    if (!offer || offer.status !== 'accepted' || offer.buyer_id !== userId) {
      return sendError(res, 400, 'Offer not available for checkout');
    }
    listingId = offer.listing_id;
    itemPrice = offer.amount;
  }

  if (!listingId) return sendError(res, 400, 'listingId or liveStreamProductId required');

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) return handleSupabaseError(res, listingError);
  if (!listing) return sendError(res, 404, 'Listing not found');
  if (listing.status === 'sold' && !liveStreamProductId) return sendError(res, 400, 'Listing already sold');

  listedPrice = listing.price;
  if (itemPrice == null) itemPrice = listing.price;

  // Offers and live claims fix the quantity; a normal checkout lets the buyer choose up to what's left.
  let fixedQuantity: number | null = null;
  if (claimId) {
    const { data: claim } = await supabase.from('live_claims').select('quantity').eq('id', claimId).maybeSingle();
    fixedQuantity = Number(claim?.quantity ?? 1);
  } else if (offerId) {
    const { data: offer } = await supabase.from('offers').select('quantity').eq('id', offerId).maybeSingle();
    fixedQuantity = Number(offer?.quantity ?? 1);
  }
  const quantityAvailable = listingAvailableQuantity(listing);
  if (fixedQuantity == null && quantityAvailable < 1) {
    return Number(listing.quantity_held ?? 0) > 0
      ? sendError(res, 409, 'The last ones are being bought right now. Try again in a few minutes.', 'OUT_OF_STOCK')
      : sendError(res, 409, 'This item is sold out', 'OUT_OF_STOCK');
  }

  // Catalog stays available until claim (live) or paid order fulfillment.
  // Do not reserve on checkout start — that made “Add to cart” / shipping feel like a hold.
  if (!liveStreamProductId && listing.status === 'reserved') {
    const { data: claim } = await supabase
      .from('live_claims')
      .select('*')
      .eq('listing_id', listingId)
      .eq('status', 'active')
      .maybeSingle();
    if (claim && claim.user_id !== userId) {
      return sendError(res, 400, 'Listing reserved by another buyer');
    }
  }

  const expiresAt = Date.now() + RESERVE_MS;
  const buyer = await getProfileById(supabase, userId);
  return res.json({
    listingId,
    liveSessionId,
    liveStreamProductId: liveStreamProductId ?? null,
    claimId: claimId ?? null,
    offerId,
    itemPrice,
    unitPrice: itemPrice,
    quantity: fixedQuantity ?? 1,
    quantityFixed: fixedQuantity != null,
    quantityAvailable: fixedQuantity ?? quantityAvailable,
    listedPrice: offerId && listedPrice !== itemPrice ? listedPrice : null,
    buyer: buyer?.username ?? 'unknown',
    name: '',
    address: '',
    city: '',
    state: 'Lagos',
    phone: '',
    deliveryNote: '',
    deliveryMethod: null,
    expiresAt,
  });
});

router.post('/complete', requireAuth, async (req, res) => {
  // Creates a paid order without a payment; only for local simulate tooling.
  if (paymentMode() !== 'simulate' || process.env.ALLOW_DIRECT_COMPLETE !== 'true') {
    return sendError(res, 410, 'Use /checkout/payments/init and /checkout/payments/verify', 'GONE');
  }
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      listingId: z.string(),
      liveSessionId: z.string().nullable().optional(),
      liveStreamProductId: z.string().nullable().optional(),
      claimId: z.string().nullable().optional(),
      name: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1).optional(),
      phone: z.string().min(1),
      deliveryNote: z.string().optional().nullable(),
      deliveryMethod: z.enum(['Standard', 'Express']),
      offerId: z.string().uuid().optional().nullable(),
      quantity: z.number().int().positive().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid checkout details');

  try {
    return res.json(await fulfillPaidCheckout(supabase, userId, parsed.data));
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    return sendError(res, e.status ?? 500, e.message ?? 'Could not complete order', e.code);
  }
});

router.post('/orders/:id/dispatch', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const now = new Date().toISOString();
  const { data, error } = await createServiceClient()
    .from('orders')
    .update({ status: 'dispatched', dispatched_at: now })
    .eq('id', req.params.id)
    .eq('seller_id', userId)
    .eq('status', 'paid')
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 400, 'Order not eligible');

  void notifyUser({
    userId: data.buyer_id,
    category: 'order',
    type: 'order_dispatched',
    title: 'Your order is on the way',
    body: data.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(data.id)}`,
    data: { orderId: data.id },
    email: orderDispatchedEmail({
      orderId: data.id,
      listingTitle: data.listing_title,
      total: data.total,
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/tracking', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      trackingNumber: z.string().min(3).max(80),
      carrier: z.string().max(80).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Tracking number required');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (orderError) return handleSupabaseError(res, orderError);
  if (!order || order.seller_id !== userId) return sendError(res, 403, 'Forbidden');
  if (!['paid', 'dispatched', 'in_transit', 'delivered'].includes(order.status)) {
    return sendError(res, 400, 'Order not eligible');
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    tracking_number: parsed.data.trackingNumber.trim(),
    tracking_carrier: parsed.data.carrier?.trim() || null,
  };
  if (order.status === 'paid') {
    patch.status = 'in_transit';
    patch.dispatched_at = order.dispatched_at ?? now;
    patch.in_transit_at = now;
  } else if (order.status === 'dispatched') {
    patch.status = 'in_transit';
    patch.in_transit_at = now;
  }

  const { error } = await createServiceClient().from('orders').update(patch).eq('id', order.id);
  if (error) return handleSupabaseError(res, error);

  const tracking = parsed.data.trackingNumber.trim();
  void notifyUser({
    userId: order.buyer_id,
    category: 'order',
    type: 'order_tracking_updated',
    title: 'Tracking updated',
    body: `${order.listing_title} · ${tracking}`,
    deepLink: `checkout/order?id=${encodeURIComponent(order.id)}`,
    data: { orderId: order.id },
    email: orderTrackingUpdatedEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
      tracking,
      carrier: parsed.data.carrier?.trim(),
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/mark-delivered', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (orderError) return handleSupabaseError(res, orderError);
  if (!order || order.seller_id !== userId) return sendError(res, 403, 'Forbidden');
  if (!['dispatched', 'in_transit'].includes(order.status)) {
    return sendError(res, 400, 'Order not eligible');
  }

  const now = new Date().toISOString();
  const { error } = await createServiceClient()
    .from('orders')
    .update({
      status: 'delivered',
      delivered_at: now,
      auto_complete_at: autoCompleteAtFrom(now),
    })
    .eq('id', order.id);
  if (error) return handleSupabaseError(res, error);

  void notifyUser({
    userId: order.buyer_id,
    category: 'order',
    type: 'order_delivered',
    title: 'Confirm you received your order',
    body: order.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(order.id)}`,
    data: { orderId: order.id },
    email: orderDeliveredEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/confirm-received', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const now = new Date().toISOString();
  const { data, error } = await createServiceClient()
    .from('orders')
    .update({
      status: 'completed',
      completed_at: now,
      auto_complete_at: null,
      payout_status: 'eligible',
    })
    .eq('id', req.params.id)
    .eq('buyer_id', userId)
    .eq('status', 'delivered')
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 400, 'Order not eligible — confirm after delivery');

  void ensurePayoutForOrder(createServiceClient(), {
    orderId: String(data.id),
    intent: 'eligible',
  }).catch((err) => {
    console.warn('[checkout] payout ensure failed', err instanceof Error ? err.message : err);
  });

  const buyer = await getProfileById(supabase, userId);
  void notifyUser({
    userId: data.seller_id,
    category: 'order',
    type: 'order_completed',
    title: 'Order completed',
    body: data.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(data.id)}`,
    data: { orderId: data.id },
    email: orderCompletedEmail({
      orderId: data.id,
      listingTitle: data.listing_title,
      total: data.total,
      buyerName: buyer?.username ?? 'buyer',
    }),
  });
  void notifyUser({
    userId: data.seller_id,
    category: 'order',
    type: 'payout_eligible',
    title: 'Payout eligible',
    body: data.listing_title,
    deepLink: 'profile/orders',
    data: { orderId: data.id },
    email: orderPayoutStatusEmail({
      orderId: data.id,
      listingTitle: data.listing_title,
      total: data.total,
      payoutStatus: 'eligible',
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/cancel', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ reason: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason required');

  const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (orderError) return handleSupabaseError(res, orderError);
  if (!order || order.status !== 'paid') return sendError(res, 400, 'Order not eligible');
  if (order.buyer_id !== userId && order.seller_id !== userId) return sendError(res, 403, 'Forbidden');

  const now = new Date().toISOString();
  const service = createServiceClient();
  const { data: cancelled, error } = await service
    .from('orders')
    .update({
      status: 'cancelled',
      cancel_reason: parsed.data.reason,
      cancelled_at: now,
      payout_status: 'not_yet_eligible',
    })
    .eq('id', req.params.id)
    .eq('status', 'paid')
    .select('id')
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!cancelled) return sendError(res, 400, 'Order not eligible');

  // Give the units back to the listing (and to the live product they came from).
  const quantity = Number(order.quantity ?? 1);
  const { error: restoreError } = await service.rpc('restore_listing_stock', {
    p_listing_id: order.listing_id,
    p_qty: quantity,
  });
  if (restoreError) console.warn('[checkout] restore stock failed', order.id, restoreError.message);
  if (order.live_stream_product_id) {
    const { data: product } = await service
      .from('live_stream_products')
      .select('sold_count')
      .eq('id', order.live_stream_product_id)
      .maybeSingle();
    if (product) {
      await service
        .from('live_stream_products')
        .update({ sold_count: Math.max(0, Number(product.sold_count) - quantity) })
        .eq('id', order.live_stream_product_id);
    }
  }

  const otherId = order.buyer_id === userId ? order.seller_id : order.buyer_id;
  void notifyUser({
    userId: otherId,
    category: 'order',
    type: 'order_cancelled',
    title: 'Order cancelled',
    body: order.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(order.id)}`,
    data: { orderId: order.id },
    email: orderCancelledEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
      reason: parsed.data.reason,
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/dispute', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      reason: z.string().min(3).max(120),
      note: z.string().max(1000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Dispute reason required');

  const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (orderError) return handleSupabaseError(res, orderError);
  if (!order || order.buyer_id !== userId) return sendError(res, 403, 'Forbidden');
  if (order.status !== 'delivered') {
    return sendError(res, 400, 'Disputes can be opened once the order is Delivered');
  }
  if (!order.delivered_at) return sendError(res, 400, 'Delivery time missing');

  const windowMs = 48 * 60 * 60 * 1000;
  if (Date.now() - new Date(order.delivered_at).getTime() > windowMs) {
    return sendError(res, 400, 'Dispute window has closed (48 hours after delivery)');
  }

  const { data: existing } = await supabase.from('order_disputes').select('id').eq('order_id', order.id).maybeSingle();
  if (existing) return sendError(res, 409, 'A dispute is already open for this order', 'DISPUTE_EXISTS');

  const { data: dispute, error } = await createServiceClient()
    .from('order_disputes')
    .insert({
      order_id: order.id,
      opened_by: userId,
      reason: parsed.data.reason.trim(),
      buyer_note: parsed.data.note?.trim() ?? '',
      status: 'under_review',
    })
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  await createServiceClient()
    .from('orders')
    .update({ payout_status: 'on_hold', auto_complete_at: null })
    .eq('id', order.id);

  void ensurePayoutForOrder(createServiceClient(), {
    orderId: String(order.id),
    intent: 'on_hold',
    disputeId: String(dispute.id),
    actorId: userId,
    reason: parsed.data.reason.trim(),
  }).catch((err) => {
    console.warn('[checkout] payout hold ensure failed', err instanceof Error ? err.message : err);
  });

  const buyer = await getProfileById(supabase, userId);
  void notifyUser({
    userId: order.seller_id,
    category: 'order',
    type: 'dispute_opened',
    title: 'Dispute opened on your sale',
    body: order.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(order.id)}`,
    data: { orderId: order.id },
    email: orderDisputeOpenedEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
      buyerName: buyer?.username ?? 'buyer',
      reason: parsed.data.reason.trim(),
    }),
  });
  void notifyUser({
    userId: order.seller_id,
    category: 'order',
    type: 'payout_on_hold',
    title: 'Payout on hold',
    body: order.listing_title,
    deepLink: 'profile/orders',
    data: { orderId: order.id },
    email: orderPayoutStatusEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
      payoutStatus: 'on_hold',
    }),
  });

  return res.json({ ok: true, disputeId: dispute.id });
});

router.post('/orders/:id/dispute/respond', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ response: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Response required');

  const { data: order } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (!order || order.seller_id !== userId) return sendError(res, 403, 'Forbidden');

  const { data: dispute } = await supabase.from('order_disputes').select('*').eq('order_id', order.id).maybeSingle();
  if (!dispute || !['open', 'under_review'].includes(dispute.status)) {
    return sendError(res, 400, 'No open dispute');
  }

  const { error } = await createServiceClient()
    .from('order_disputes')
    .update({ seller_response: parsed.data.response.trim(), status: 'under_review' })
    .eq('id', dispute.id);
  if (error) return handleSupabaseError(res, error);

  const preview = parsed.data.response.trim().slice(0, 120);
  void notifyUser({
    userId: order.buyer_id,
    category: 'order',
    type: 'dispute_response',
    title: 'Seller responded to your dispute',
    body: order.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(order.id)}`,
    data: { orderId: order.id },
    email: orderDisputeUpdatedEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
      responsePreview: preview,
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/dispute/evidence', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ evidenceUrls: z.array(z.string().url()).min(1).max(8) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Evidence URLs required');

  const { data: order } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (!order || (order.buyer_id !== userId && order.seller_id !== userId)) return sendError(res, 403, 'Forbidden');

  const { data: dispute } = await supabase.from('order_disputes').select('*').eq('order_id', order.id).maybeSingle();
  if (!dispute || !['open', 'under_review'].includes(dispute.status)) {
    return sendError(res, 400, 'No open dispute');
  }

  const merged = [...(dispute.evidence_urls ?? []), ...parsed.data.evidenceUrls].slice(0, 12);
  const { error } = await createServiceClient().from('order_disputes').update({ evidence_urls: merged }).eq('id', dispute.id);
  if (error) return handleSupabaseError(res, error);

  const otherId = order.buyer_id === userId ? order.seller_id : order.buyer_id;
  void notifyUser({
    userId: otherId,
    category: 'order',
    type: 'dispute_evidence',
    title: 'New dispute evidence',
    body: order.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(order.id)}`,
    data: { orderId: order.id },
    email: orderDisputeUpdatedEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
      responsePreview: 'New evidence was added.',
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/review', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ rating: z.number().min(1).max(5), comment: z.string() }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid review');

  const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (orderError) return handleSupabaseError(res, orderError);
  if (!order || order.buyer_id !== userId || order.status !== 'completed' || order.reviewed) {
    return sendError(res, 400, 'Order not eligible for review');
  }

  const service = createServiceClient();
  // Claim the order's single review slot first so parallel requests cannot post twice.
  const { data: claimed, error: claimError } = await service
    .from('orders')
    .update({ reviewed: true })
    .eq('id', order.id)
    .eq('reviewed', false)
    .select('id')
    .maybeSingle();
  if (claimError) return handleSupabaseError(res, claimError);
  if (!claimed) return sendError(res, 400, 'Order not eligible for review');

  const { error: reviewError } = await service.from('reviews').insert({
    seller_id: order.seller_id,
    buyer_id: userId,
    order_id: order.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment.trim(),
  });
  if (reviewError) {
    await service.from('orders').update({ reviewed: false }).eq('id', order.id);
    return handleSupabaseError(res, reviewError);
  }

  const buyer = await getProfileById(supabase, userId);
  void notifyUser({
    userId: order.seller_id,
    category: 'order',
    type: 'review_received',
    title: 'New review on your sale',
    body: `${buyer?.username ?? 'A buyer'} rated you ${parsed.data.rating}★`,
    deepLink: `checkout/order?id=${encodeURIComponent(order.id)}`,
    data: { orderId: order.id },
  });

  return res.json({ ok: true });
});

router.get('/reviews/:username', async (req, res) => {
  const supabase = (await import('../lib/supabase.js')).createSupabaseClient();
  const seller = await getProfileByUsername(supabase, String(req.params.username));
  const sellerId = seller?.id;

  if (!sellerId) return res.json({ reviews: [], avg: 0, count: 0 });

  const { data, error } = await supabase.from('reviews').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
  if (error) return handleSupabaseError(res, error);

  const reviews = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const buyer = await getProfileById(supabase, row.buyer_id);
      const hidden = Boolean(row.comment_hidden);
      return {
        buyer: buyer?.username ?? 'unknown',
        rating: row.rating,
        comment: hidden ? '' : String(row.comment ?? ''),
        date: new Date(row.created_at).toLocaleDateString(),
      };
    }),
  );

  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  return res.json({ reviews, avg, count });
});

export default router;
