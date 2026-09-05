import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import type { DbRow } from '../lib/db-types.js';
import { queueEmail } from '../lib/email/send.js';
import {
  orderCancelledEmail,
  orderCompletedEmail,
  orderDispatchedEmail,
  orderPlacedBuyerEmail,
  orderPlacedSellerEmail,
} from '../lib/email/templates/orders.js';
import { getProfileById, getProfileByUsername } from '../lib/mappers.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import { buyerProtectionFee, shippingFee } from '../lib/listing-catalog.js';

const router = Router();
const RESERVE_MS = 10 * 60 * 1000;

router.get('/orders', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return handleSupabaseError(res, error);

  const mapped = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const buyer = await getProfileById(supabase, row.buyer_id);
      const seller = await getProfileById(supabase, row.seller_id);
      return {
        id: row.id,
        listingId: row.listing_id,
        listingTitle: row.listing_title,
        buyer: buyer?.username ?? 'unknown',
        seller: seller?.username ?? 'unknown',
        name: row.name,
        address: row.address,
        city: row.city,
        state: row.state ?? null,
        phone: row.phone,
        deliveryMethod: row.delivery_method,
        deliveryFee: row.delivery_fee,
        protectionFee: row.protection_fee ?? 0,
        itemPrice: row.item_price,
        listedPrice: row.listed_price ?? null,
        offerId: row.offer_id ?? null,
        total: row.total,
        fromLiveId: row.from_live_id,
        liveStreamProductId: row.live_stream_product_id ?? undefined,
        claimId: row.claim_id ?? undefined,
        createdAt: row.created_at,
        status: row.status,
        reviewed: row.reviewed,
        cancelReason: row.cancel_reason ?? undefined,
      };
    }),
  );

  return res.json(mapped);
});

router.get('/orders/:id', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data, error } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Order not found');
  if (data.buyer_id !== userId && data.seller_id !== userId) return sendError(res, 403, 'Forbidden');

  const buyer = await getProfileById(supabase, data.buyer_id);
  const seller = await getProfileById(supabase, data.seller_id);

  return res.json({
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
    cancelReason: data.cancel_reason ?? undefined,
  });
});

router.post('/start', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      listingId: z.string().optional(),
      liveSessionId: z.string().nullable().optional(),
      liveStreamProductId: z.string().optional(),
      claimId: z.string().optional(),
      offerId: z.string().uuid().optional().nullable(),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  let listingId = parsed.data.listingId;
  let itemPrice: number | undefined;
  let listedPrice: number | undefined;
  let offerId = parsed.data.offerId ?? null;
  let liveStreamProductId = parsed.data.liveStreamProductId;
  let claimId = parsed.data.claimId;
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

  queueEmail({
    toUserId: userId,
    content: orderPlacedBuyerEmail(orderVars),
  });
  queueEmail({
    toUserId: listing.seller_id,
    content: orderPlacedSellerEmail(orderVars),
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
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'dispatched' })
    .eq('id', req.params.id)
    .eq('seller_id', userId)
    .eq('status', 'paid')
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 400, 'Order not eligible');

  queueEmail({
    toUserId: data.buyer_id,
    content: orderDispatchedEmail({
      orderId: data.id,
      listingTitle: data.listing_title,
      total: data.total,
    }),
  });

  return res.json({ ok: true });
});

router.post('/orders/:id/confirm-received', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', req.params.id)
    .eq('buyer_id', userId)
    .in('status', ['dispatched', 'in_transit'])
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 400, 'Order not eligible');

  const buyer = await getProfileById(supabase, userId);
  queueEmail({
    toUserId: data.seller_id,
    content: orderCompletedEmail({
      orderId: data.id,
      listingTitle: data.listing_title,
      total: data.total,
      buyerName: buyer?.username ?? 'buyer',
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

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', cancel_reason: parsed.data.reason })
    .eq('id', req.params.id);
  if (error) return handleSupabaseError(res, error);

  if (!order.live_stream_product_id) {
    await supabase.from('listings').update({ status: 'available' }).eq('id', order.listing_id);
  }

  const otherId = order.buyer_id === userId ? order.seller_id : order.buyer_id;
  queueEmail({
    toUserId: otherId,
    content: orderCancelledEmail({
      orderId: order.id,
      listingTitle: order.listing_title,
      total: order.total,
      reason: parsed.data.reason,
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
