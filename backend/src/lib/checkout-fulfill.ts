import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buyerProtectionFee, shippingFee } from './listing-catalog.js';
import { getProfileById } from './mappers.js';
import { createServiceClient } from './supabase.js';
import type { DbRow } from './db-types.js';
import { orderPlacedBuyerEmail, orderPlacedSellerEmail } from './email/templates/orders.js';
import { notifyUser } from './notify.js';
import { notifySavedListingWatchers } from './saved-listing-alerts.js';

export type CheckoutPayload = {
  listingId: string;
  liveSessionId?: string | null;
  liveStreamProductId?: string | null;
  claimId?: string | null;
  offerId?: string | null;
  name: string;
  address: string;
  city: string;
  state?: string | null;
  phone: string;
  deliveryNote?: string | null;
  deliveryMethod: 'Standard' | 'Express';
};

export function paymentMode(): 'flutterwave' | 'simulate' {
  // Explicit flutterwave only — presence of FLW_* keys alone must not flip test builds
  // into a live provider path that leaves buyers stuck on "confirming payment".
  if (process.env.PAYMENT_MODE === 'flutterwave' && process.env.FLW_SECRET_KEY?.trim()) {
    return 'flutterwave';
  }
  return 'simulate';
}

export function newOrderId() {
  // Full UUID entropy — never derive from buyer-visible order counts (RLS collisions).
  return `ORD${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

export function computeCheckoutAmounts(itemPrice: number, deliveryMethod: 'Standard' | 'Express') {
  const deliveryFee = shippingFee(deliveryMethod);
  const protectionFee = buyerProtectionFee(itemPrice);
  const total = itemPrice + deliveryFee + protectionFee;
  return { itemPrice, deliveryFee, protectionFee, total };
}

function checkoutError(message: string, status = 400, code?: string) {
  return Object.assign(new Error(message), { status, code });
}

/** Active, unexpired claim owned by the buyer whose live product is this listing. */
async function loadCheckoutClaim(userId: string, claimId: string, listingId: string) {
  const service = createServiceClient();
  const { data: claim } = await service.from('live_claims').select('*').eq('id', claimId).maybeSingle();
  if (!claim || claim.user_id !== userId || claim.status !== 'active') {
    throw checkoutError('Invalid claim');
  }
  if (new Date(claim.expires_at).getTime() < Date.now()) {
    throw checkoutError('Claim expired', 400, 'CLAIM_EXPIRED');
  }
  if (!claim.live_stream_product_id) return { claim, product: null };
  const { data: product } = await service
    .from('live_stream_products')
    .select('*')
    .eq('id', claim.live_stream_product_id)
    .maybeSingle();
  if (!product || product.listing_id !== listingId || claim.listing_id !== listingId) {
    throw checkoutError('Claim does not match this listing');
  }
  return { claim, product };
}

async function loadCheckoutOffer(
  supabase: SupabaseClient,
  userId: string,
  offerId: string,
  listing: { id: string; seller_id: string },
) {
  const { data: offer } = await supabase.from('offers').select('*').eq('id', offerId).maybeSingle();
  if (
    !offer ||
    offer.status !== 'accepted' ||
    offer.buyer_id !== userId ||
    offer.listing_id !== listing.id ||
    offer.seller_id !== listing.seller_id
  ) {
    throw checkoutError('Offer not available for checkout');
  }
  return offer;
}

/**
 * Price the buyer will pay, without side effects. Must agree with resolveItemPrice so the
 * amount charged at payment init matches the order created after payment.
 */
export async function quoteItemPrice(
  supabase: SupabaseClient,
  userId: string,
  payload: CheckoutPayload,
  listing: { id: string; seller_id: string; price: number },
) {
  let itemPrice = listing.price;
  if (payload.offerId) {
    itemPrice = (await loadCheckoutOffer(supabase, userId, payload.offerId, listing)).amount;
  }
  if (payload.claimId) {
    const { product } = await loadCheckoutClaim(userId, payload.claimId, listing.id);
    if (product) itemPrice = product.live_price;
  } else if (payload.liveStreamProductId) {
    throw checkoutError('Claim this product before checkout');
  }
  return itemPrice;
}

export async function resolveItemPrice(
  supabase: SupabaseClient,
  userId: string,
  payload: CheckoutPayload,
  listing: { id: string; seller_id: string; price: number },
) {
  const listingPrice = listing.price;
  let itemPrice = listingPrice;
  let listedPrice: number | null = null;
  let offerId = payload.offerId ?? null;
  let claimId = payload.claimId ?? null;
  let liveStreamProductId = payload.liveStreamProductId ?? null;

  if (offerId) {
    const offer = await loadCheckoutOffer(supabase, userId, offerId, listing);
    itemPrice = offer.amount;
    listedPrice = listingPrice !== offer.amount ? listingPrice : null;
  }

  if (claimId) {
    await loadCheckoutClaim(userId, claimId, listing.id);
    const service = createServiceClient();
    const { data: claim, error } = await service.rpc('convert_live_claim', {
      p_claim_id: claimId,
      p_user_id: userId,
    });
    if (error) {
      const raw = error.message ?? '';
      if (raw.includes('CLAIM_EXPIRED')) throw Object.assign(new Error('Claim expired'), { status: 400, code: 'CLAIM_EXPIRED' });
      if (raw.includes('OUT_OF_STOCK')) throw Object.assign(new Error('Out of stock'), { status: 409, code: 'OUT_OF_STOCK' });
      throw Object.assign(new Error(error.message), { status: 400 });
    }
    liveStreamProductId = (claim as DbRow)?.live_stream_product_id
      ? String((claim as DbRow).live_stream_product_id)
      : liveStreamProductId;
    if (liveStreamProductId) {
      const { data: product } = await supabase
        .from('live_stream_products')
        .select('*')
        .eq('id', liveStreamProductId)
        .maybeSingle();
      if (product) itemPrice = product.live_price;
    }
  }

  return { itemPrice, listedPrice, offerId, claimId, liveStreamProductId };
}

export async function fulfillPaidCheckout(
  supabase: SupabaseClient,
  userId: string,
  payload: CheckoutPayload,
  paymentMeta?: { txRef?: string; providerRef?: string | null },
) {
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', payload.listingId)
    .maybeSingle();
  if (listingError) throw listingError;
  if (!listing) throw Object.assign(new Error('Listing unavailable'), { status: 400 });

  const resolved = await resolveItemPrice(supabase, userId, payload, listing);
  let { itemPrice, listedPrice, offerId, claimId, liveStreamProductId } = resolved;

  const { deliveryFee, protectionFee, total } = computeCheckoutAmounts(itemPrice, payload.deliveryMethod);
  // Always write via service role: buyer-scoped RLS count made every buyer mint ORD1001
  // and collide, which left verify failing into the permanent "confirming payment" UI.
  const service = createServiceClient();
  const orderId = newOrderId();

  if (!claimId) {
    if (listing.status === 'sold') throw Object.assign(new Error('Listing unavailable'), { status: 400 });
    const { data: soldRow, error: soldError } = await service
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing.id)
      .neq('status', 'sold')
      .select('id')
      .maybeSingle();
    if (soldError) throw soldError;
    if (!soldRow) throw Object.assign(new Error('Listing unavailable'), { status: 400 });
  }

  if (liveStreamProductId) {
    const { data: product } = await service
      .from('live_stream_products')
      .select('*')
      .eq('id', liveStreamProductId)
      .maybeSingle();
    if (product && product.sold_count + product.reserved_count >= product.stock && product.sold_count >= product.stock) {
      await service.from('listings').update({ status: 'sold' }).eq('id', listing.id);
    }
  }

  const { data, error } = await service
    .from('orders')
    .insert({
      id: orderId,
      listing_id: listing.id,
      listing_title: listing.title,
      buyer_id: userId,
      seller_id: listing.seller_id,
      name: payload.name.trim(),
      address: payload.address.trim(),
      city: payload.city.trim(),
      state: payload.state?.trim() || null,
      phone: payload.phone.trim(),
      delivery_note: payload.deliveryNote?.trim() || null,
      delivery_method: payload.deliveryMethod,
      delivery_fee: deliveryFee,
      protection_fee: protectionFee,
      item_price: itemPrice,
      listed_price: listedPrice,
      offer_id: offerId,
      total,
      from_live_id: payload.liveSessionId ?? null,
      live_stream_product_id: liveStreamProductId,
      claim_id: claimId,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_status: 'not_yet_eligible',
    })
    .select('*')
    .single();

  if (error) throw error;

  const buyer = await getProfileById(supabase, userId);
  const seller = await getProfileById(supabase, listing.seller_id);
  const fromLive = Boolean(data.from_live_id);
  const orderVars = {
    orderId: data.id,
    listingTitle: data.listing_title,
    total: data.total,
    buyerName: buyer?.name ?? buyer?.username ?? 'buyer',
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
  void notifySavedListingWatchers({
    listingId: String(listing.id),
    listingTitle: String(listing.title ?? data.listing_title),
    type: 'saved_listing_sold',
    title: 'Saved item sold',
    excludeUserIds: [userId, String(listing.seller_id)],
  });

  return {
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
    paymentTxRef: paymentMeta?.txRef ?? null,
    paymentProviderRef: paymentMeta?.providerRef ?? null,
    paidAt: data.paid_at ?? data.created_at,
    payoutStatus: data.payout_status ?? 'not_yet_eligible',
    trackingNumber: null,
    dispute: null,
  };
}

export function newTxRef() {
  return `THR-${Date.now()}-${randomUUID().slice(0, 8)}`;
}
