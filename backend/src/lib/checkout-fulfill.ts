import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buyerProtectionFee, shippingFee } from './listing-catalog.js';
import { getProfileById } from './mappers.js';
import { createServiceClient } from './supabase.js';
import type { DbRow } from './db-types.js';
import { queueEmail } from './email/send.js';
import { orderPlacedBuyerEmail, orderPlacedSellerEmail } from './email/templates/orders.js';

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
  if (process.env.PAYMENT_MODE === 'simulate') return 'simulate';
  if (process.env.PAYMENT_MODE === 'flutterwave') return 'flutterwave';
  return process.env.FLW_SECRET_KEY ? 'flutterwave' : 'simulate';
}

export function computeCheckoutAmounts(itemPrice: number, deliveryMethod: 'Standard' | 'Express') {
  const deliveryFee = shippingFee(deliveryMethod);
  const protectionFee = buyerProtectionFee(itemPrice);
  const total = itemPrice + deliveryFee + protectionFee;
  return { itemPrice, deliveryFee, protectionFee, total };
}

export async function resolveItemPrice(
  supabase: SupabaseClient,
  userId: string,
  payload: CheckoutPayload,
  listingPrice: number,
) {
  let itemPrice = listingPrice;
  let listedPrice: number | null = null;
  let offerId = payload.offerId ?? null;
  let claimId = payload.claimId ?? null;
  let liveStreamProductId = payload.liveStreamProductId ?? null;

  if (offerId) {
    const { data: offer } = await supabase.from('offers').select('*').eq('id', offerId).maybeSingle();
    if (!offer || offer.status !== 'accepted' || offer.buyer_id !== userId || offer.listing_id !== payload.listingId) {
      throw Object.assign(new Error('Offer not available for checkout'), { status: 400 });
    }
    itemPrice = offer.amount;
    listedPrice = listingPrice !== offer.amount ? listingPrice : null;
  }

  if (claimId) {
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

  const resolved = await resolveItemPrice(supabase, userId, payload, listing.price);
  let { itemPrice, listedPrice, offerId, claimId, liveStreamProductId } = resolved;

  if (!claimId) {
    if (listing.status === 'sold') throw Object.assign(new Error('Listing unavailable'), { status: 400 });
    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
  }

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

  const { deliveryFee, protectionFee, total } = computeCheckoutAmounts(itemPrice, payload.deliveryMethod);
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
  queueEmail({ toUserId: userId, content: orderPlacedBuyerEmail(orderVars) });
  queueEmail({ toUserId: listing.seller_id, content: orderPlacedSellerEmail(orderVars) });

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
  };
}

export function newTxRef() {
  return `THR-${Date.now()}-${randomUUID().slice(0, 8)}`;
}
