import { Router } from 'express';
import { z } from 'zod';
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
import { getProfileById, getProfileByUsername } from '../lib/mappers.js';
import { notifyUser } from '../lib/notify.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { buyerProtectionFee, shippingFee } from '../lib/listing-catalog.js';
import { autoCompleteAtFrom, mapOrderJson, runAutoCompleteDueOrders } from '../lib/order-map.js';

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

  // Non-live path: reserve catalog listing
  if (!liveStreamProductId) {
    if (listing.status === 'reserved') {
      const { data: claim } = await supabase
        .from('live_claims')
        .select('*')
        .eq('listing_id', listingId)
        .eq('status', 'active')
        .maybeSingle();
      if (claim && claim.user_id !== userId) return sendError(res, 400, 'Listing reserved by another buyer');
    } else if (listing.status === 'available') {
      await supabase.from('listings').update({ status: 'reserved' }).eq('id', listingId);
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
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid checkout details');

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', parsed.data.listingId)
    .maybeSingle();

  if (listingError) return handleSupabaseError(res, listingError);
  if (!listing) return sendError(res, 400, 'Listing unavailable');

  let itemPrice = listing.price;
  const listedPrice = listing.price;
  let claimId = parsed.data.claimId ?? null;
  let liveStreamProductId = parsed.data.liveStreamProductId ?? null;
  let offerId = parsed.data.offerId ?? null;

  if (offerId) {
    const { data: offer, error: offerError } = await supabase.from('offers').select('*').eq('id', offerId).maybeSingle();
    if (offerError) return handleSupabaseError(res, offerError);
    if (!offer || offer.status !== 'accepted' || offer.buyer_id !== userId || offer.listing_id !== listing.id) {
      return sendError(res, 400, 'Offer not available for checkout');
    }
    itemPrice = offer.amount;
  }

  if (claimId) {
    try {
      const service = createServiceClient();
      const { data: claim, error } = await service.rpc('convert_live_claim', {
        p_claim_id: claimId,
        p_user_id: userId,
      });
      if (error) {
        const raw = error.message ?? '';
        if (raw.includes('CLAIM_EXPIRED')) return sendError(res, 400, 'Claim expired', 'CLAIM_EXPIRED');
        if (raw.includes('OUT_OF_STOCK')) return sendError(res, 409, 'Out of stock', 'OUT_OF_STOCK');
        return sendError(res, 400, error.message);
      }
      liveStreamProductId = (claim as DbRow)?.live_stream_product_id
        ? String((claim as DbRow).live_stream_product_id)
        : liveStreamProductId;
    } catch (err) {
      return sendError(res, 500, err instanceof Error ? err.message : 'Claim convert failed');
    }

    if (liveStreamProductId) {
      const { data: product } = await supabase
        .from('live_stream_products')
        .select('*')
        .eq('id', liveStreamProductId)
        .maybeSingle();
      if (product) itemPrice = product.live_price;
    }
  } else if (listing.status === 'sold') {
    return sendError(res, 400, 'Listing unavailable');
  } else {
    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
  }

  // For live multi-stock products, only mark listing sold when fully sold out
  if (liveStreamProductId) {
    const { data: product } = await supabase
      .from('live_stream_products')
      .select('*')
      .eq('id', liveStreamProductId)
      .maybeSingle();
    if (product && product.sold_count + product.reserved_count >= product.stock && product.sold_count >= product.stock) {
      await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
    }
  }

  const deliveryFee = shippingFee(parsed.data.deliveryMethod);
  const protectionFee = buyerProtectionFee(itemPrice);
  const total = itemPrice + deliveryFee + protectionFee;

  const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const orderId = `ORD${1001 + (count ?? 0)}`;

  const { data, error } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      listing_id: listing.id,
      listing_title: listing.title,
      buyer_id: userId,
      seller_id: listing.seller_id,
      name: parsed.data.name.trim(),
      address: parsed.data.address.trim(),
      city: parsed.data.city.trim(),
      state: parsed.data.state?.trim() || null,
      phone: parsed.data.phone.trim(),
      delivery_note: parsed.data.deliveryNote?.trim() || null,
      delivery_method: parsed.data.deliveryMethod,
      delivery_fee: deliveryFee,
      protection_fee: protectionFee,
      item_price: itemPrice,
      listed_price: offerId && listedPrice !== itemPrice ? listedPrice : null,
      offer_id: offerId,
      total,
      from_live_id: parsed.data.liveSessionId ?? null,
      live_stream_product_id: liveStreamProductId,
      claim_id: claimId,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_status: 'not_yet_eligible',
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const buyer = await getProfileById(supabase, userId);
  const seller = await getProfileById(supabase, listing.seller_id);
  const fromLive = Boolean(data.from_live_id);
  const orderVars = {
    orderId: data.id,
    listingTitle: data.listing_title,
    total: data.total,
    buyerName: buyer?.username ?? 'buyer',
    sellerName: seller?.username ?? 'seller',
    deliveryMethod: data.delivery_method,
    fromLive,
  };

  void notifyUser({
    userId,
    category: 'order',
    type: 'order_placed',
    title: 'Order confirmed',
    body: data.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(data.id)}`,
    data: { orderId: data.id },
    email: orderPlacedBuyerEmail(orderVars),
  });
  void notifyUser({
    userId: listing.seller_id,
    category: 'order',
    type: 'order_placed_seller',
    title: 'You made a sale',
    body: data.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(data.id)}`,
    data: { orderId: data.id },
    email: orderPlacedSellerEmail(orderVars),
  });

  return res.status(201).json({
    id: data.id,
    listingId: data.listing_id,
    listingTitle: data.listing_title,
    buyer: buyer?.username ?? 'unknown',
    seller: seller?.username ?? 'unknown',
    name: data.name,
    address: data.address,
    city: data.city,
    state: data.state ?? null,
    phone: data.phone,
    deliveryMethod: data.delivery_method,
    deliveryFee: data.delivery_fee,
    protectionFee: data.protection_fee ?? 0,
    itemPrice: data.item_price,
    listedPrice: data.listed_price ?? null,
    offerId: data.offer_id ?? null,
    total: data.total,
    fromLiveId: data.from_live_id,
    liveStreamProductId: data.live_stream_product_id ?? undefined,
    claimId: data.claim_id ?? undefined,
    createdAt: data.created_at,
    status: data.status,
    reviewed: data.reviewed,
  });
});

router.post('/orders/:id/dispatch', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const now = new Date().toISOString();
  const { data, error } = await supabase
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

  const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
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
  const { error } = await supabase
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
  const { data, error } = await supabase
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
    skipPush: true,
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
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancel_reason: parsed.data.reason,
      cancelled_at: now,
      payout_status: 'not_yet_eligible',
    })
    .eq('id', req.params.id);
  if (error) return handleSupabaseError(res, error);

  if (!order.live_stream_product_id) {
    await supabase.from('listings').update({ status: 'available' }).eq('id', order.listing_id);
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

  const { data: dispute, error } = await supabase
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

  await supabase
    .from('orders')
    .update({ payout_status: 'on_hold', auto_complete_at: null })
    .eq('id', order.id);

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
    skipPush: true,
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

  const { error } = await supabase
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
  const { error } = await supabase.from('order_disputes').update({ evidence_urls: merged }).eq('id', dispute.id);
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

  const { error: reviewError } = await supabase.from('reviews').insert({
    seller_id: order.seller_id,
    buyer_id: userId,
    order_id: order.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment.trim(),
  });
  if (reviewError) return handleSupabaseError(res, reviewError);

  await supabase.from('orders').update({ reviewed: true }).eq('id', order.id);

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
      return {
        buyer: buyer?.username ?? 'unknown',
        rating: row.rating,
        comment: row.comment,
        date: new Date(row.created_at).toLocaleDateString(),
      };
    }),
  );

  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  return res.json({ reviews, avg, count });
});

export default router;
