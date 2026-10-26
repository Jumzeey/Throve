import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_LISTING_QUANTITY, buyerProtectionFee, shippingFee } from './listing-catalog.js';
import { getProfileById, listingAvailableQuantity } from './mappers.js';
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
  /** Units for a normal checkout (offers and live claims carry their own quantity). */
  quantity?: number | null;
  /** Hold placed at payment init; converted to a sale when the payment succeeds. */
  stockHoldId?: string | null;
};

/** How long units stay held while the buyer is on the payment step. */
export const CHECKOUT_HOLD_SECONDS = 15 * 60;

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

export function computeCheckoutAmounts(
  unitPrice: number,
  quantity: number,
  deliveryMethod: 'Standard' | 'Express',
) {
  const itemPrice = unitPrice * quantity;
  const deliveryFee = shippingFee(deliveryMethod);
  const protectionFee = buyerProtectionFee(itemPrice);
  const total = itemPrice + deliveryFee + protectionFee;
  return { unitPrice, quantity, itemPrice, deliveryFee, protectionFee, total };
}

function checkoutError(message: string, status = 400, code?: string) {
  return Object.assign(new Error(message), { status, code });
}

/** Map stock RPC errors (P0001 codes raised in SQL) to buyer-facing errors. */
export function stockError(raw: string, available?: number) {
  if (raw.includes('OUT_OF_STOCK')) {
    return checkoutError(
      available && available > 0 ? `Only ${available} left` : 'This item is sold out',
      409,
      'OUT_OF_STOCK',
    );
  }
  if (raw.includes('OWN_LISTING')) return checkoutError('You can’t buy your own listing', 400, 'OWN_LISTING');
  if (raw.includes('LISTING_UNAVAILABLE')) return checkoutError('Listing unavailable', 400, 'LISTING_UNAVAILABLE');
  if (raw.includes('CLAIM_EXPIRED')) return checkoutError('Claim expired', 400, 'CLAIM_EXPIRED');
  if (raw.includes('INVALID_QTY')) return checkoutError('Choose a valid quantity', 400, 'INVALID_QTY');
  return checkoutError(raw || 'Checkout failed', 400);
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
    offer.used_at ||
    offer.buyer_id !== userId ||
    offer.listing_id !== listing.id ||
    offer.seller_id !== listing.seller_id
  ) {
    throw checkoutError('Offer not available for checkout');
  }
  return offer;
}

export type CheckoutQuote = {
  unitPrice: number;
  quantity: number;
  /** Listing price per unit when the buyer pays a different (offer / live) price. */
  listedUnitPrice: number | null;
  source: 'listing' | 'offer' | 'live';
};

/**
 * What the buyer pays, without side effects. Offers and live claims fix both the unit price and
 * the quantity; a normal checkout uses the listing price and the quantity the buyer picked.
 */
export async function quoteCheckout(
  supabase: SupabaseClient,
  userId: string,
  payload: CheckoutPayload,
  listing: { id: string; seller_id: string; price: number },
): Promise<CheckoutQuote> {
  if (payload.claimId) {
    const { claim, product } = await loadCheckoutClaim(userId, payload.claimId, listing.id);
    const unitPrice = product ? Number(product.live_price) : listing.price;
    return {
      unitPrice,
      quantity: Number(claim.quantity ?? 1),
      listedUnitPrice: unitPrice !== listing.price ? listing.price : null,
      source: 'live',
    };
  }
  if (payload.liveStreamProductId) throw checkoutError('Claim this product before checkout');
  if (payload.offerId) {
    const offer = await loadCheckoutOffer(supabase, userId, payload.offerId, listing);
    return {
      unitPrice: Number(offer.amount),
      quantity: Number(offer.quantity ?? 1),
      listedUnitPrice: Number(offer.amount) !== listing.price ? listing.price : null,
      source: 'offer',
    };
  }
  const quantity = Math.trunc(Number(payload.quantity ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_LISTING_QUANTITY) {
    throw checkoutError('Choose a valid quantity', 400, 'INVALID_QTY');
  }
  return { unitPrice: listing.price, quantity, listedUnitPrice: null, source: 'listing' };
}

/** Hold the units for a normal or offer checkout while the buyer pays. Live claims already hold. */
export async function holdCheckoutStock(
  userId: string,
  listing: DbRow,
  quote: CheckoutQuote,
  ttlSeconds = CHECKOUT_HOLD_SECONDS,
) {
  if (quote.source === 'live') return null;
  const { data, error } = await createServiceClient().rpc('hold_listing_stock', {
    p_listing_id: listing.id,
    p_user_id: userId,
    p_qty: quote.quantity,
    p_ttl_seconds: ttlSeconds,
    p_source: quote.source === 'offer' ? 'offer' : 'checkout',
  });
  if (error) throw stockError(error.message ?? '', listingAvailableQuantity(listing));
  return data as DbRow;
}

export async function releaseCheckoutHold(holdId: string | null | undefined) {
  if (!holdId) return;
  const { error } = await createServiceClient().rpc('release_stock_hold', {
    p_hold_id: holdId,
    p_status: 'released',
  });
  if (error) console.warn('[checkout] release hold failed', holdId, error.message);
}

export async function fulfillPaidCheckout(
  supabase: SupabaseClient,
  userId: string,
  payload: CheckoutPayload,
  paymentMeta?: { txRef?: string; providerRef?: string | null },
) {
  const service = createServiceClient();
  const { data: listing, error: listingError } = await service
    .from('listings')
    .select('*')
    .eq('id', payload.listingId)
    .maybeSingle();
  if (listingError) throw listingError;
  if (!listing) throw checkoutError('Listing unavailable');

  const quote = await quoteCheckout(supabase, userId, payload, listing);
  const { unitPrice, quantity, itemPrice, deliveryFee, protectionFee, total } = computeCheckoutAmounts(
    quote.unitPrice,
    quote.quantity,
    payload.deliveryMethod,
  );
  const offerId = payload.offerId ?? null;
  const claimId = payload.claimId ?? null;
  let liveStreamProductId = payload.liveStreamProductId ?? null;
  const orderId = newOrderId();

  // An accepted offer buys once: claim it before touching stock.
  if (offerId) {
    const { data: used } = await service
      .from('offers')
      .update({ used_at: new Date().toISOString() })
      .eq('id', offerId)
      .is('used_at', null)
      .select('id')
      .maybeSingle();
    if (!used) throw checkoutError('Offer not available for checkout');
  }

  // Move the units from held to sold.
  try {
    if (claimId) {
      const { data: claim, error } = await service.rpc('convert_live_claim', {
        p_claim_id: claimId,
        p_user_id: userId,
      });
      if (error) throw stockError(error.message ?? '');
      liveStreamProductId = (claim as DbRow)?.live_stream_product_id
        ? String((claim as DbRow).live_stream_product_id)
        : liveStreamProductId;
    } else {
      // Older intents (before holds existed) and direct simulate completes hold here first.
      const holdId = payload.stockHoldId ?? String((await holdCheckoutStock(userId, listing, quote, 60))?.id ?? '');
      const { error } = await service.rpc('convert_stock_hold', {
        p_hold_id: holdId,
        p_user_id: userId,
        p_order_id: null,
      });
      if (error) throw stockError(error.message ?? '', listingAvailableQuantity(listing));
    }
  } catch (err) {
    if (offerId) await service.from('offers').update({ used_at: null }).eq('id', offerId);
    throw err;
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
      quantity,
      unit_price: unitPrice,
      item_price: itemPrice,
      listed_price: quote.listedUnitPrice != null ? quote.listedUnitPrice * quantity : null,
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

  if (error) {
    // The units were already moved to sold; give them back so the listing isn't stuck.
    await service.rpc('restore_listing_stock', { p_listing_id: listing.id, p_qty: quantity });
    if (offerId) await service.from('offers').update({ used_at: null }).eq('id', offerId);
    throw error;
  }

  if (payload.stockHoldId) {
    await service.from('stock_holds').update({ order_id: data.id }).eq('id', payload.stockHoldId);
  }
  const { data: after } = await service.from('listings').select('status').eq('id', listing.id).maybeSingle();
  const soldOut = after?.status === 'sold';

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
    body: quantity > 1 ? `${data.listing_title} × ${quantity}` : data.listing_title,
    deepLink: `checkout/order?id=${encodeURIComponent(data.id)}`,
    data: { orderId: data.id },
    email: orderPlacedSellerEmail(orderVars),
  });
  if (soldOut) {
    void notifySavedListingWatchers({
      listingId: String(listing.id),
      listingTitle: String(listing.title ?? data.listing_title),
      type: 'saved_listing_sold',
      title: 'Saved item sold',
      excludeUserIds: [userId, String(listing.seller_id)],
    });
  }

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
    quantity: Number(data.quantity ?? 1),
    unitPrice: Number(data.unit_price ?? data.item_price),
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
