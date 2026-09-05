import { Router } from 'express';
import { z } from 'zod';
import {
  computeCheckoutAmounts,
  fulfillPaidCheckout,
  newTxRef,
  paymentMode,
  type CheckoutPayload,
} from '../lib/checkout-fulfill.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { getProfileById } from '../lib/mappers.js';
import {
  flutterwaveInitPayment,
  flutterwaveVerifyByRef,
  flutterwaveWebhookVerified,
} from '../lib/payments/flutterwave.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

const checkoutBody = z.object({
  listingId: z.string(),
  liveSessionId: z.string().nullable().optional(),
  liveStreamProductId: z.string().nullable().optional(),
  claimId: z.string().nullable().optional(),
  offerId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1).optional(),
  phone: z.string().min(1),
  deliveryNote: z.string().optional().nullable(),
  deliveryMethod: z.enum(['Standard', 'Express']),
});

function publicApiBase() {
  return (process.env.PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
}

function paymentRedirectUrl() {
  return process.env.PAYMENT_REDIRECT_URL ?? 'throveapp://checkout/payment-return';
}

router.post('/payments/init', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = checkoutBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid checkout details');

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', parsed.data.listingId)
    .maybeSingle();
  if (listingError) return handleSupabaseError(res, listingError);
  if (!listing) return sendError(res, 400, 'Listing unavailable');
  if (listing.status === 'sold') return sendError(res, 400, 'Listing unavailable');

  let itemPrice = listing.price;
  if (parsed.data.offerId) {
    const { data: offer } = await supabase.from('offers').select('*').eq('id', parsed.data.offerId).maybeSingle();
    if (!offer || offer.status !== 'accepted' || offer.buyer_id !== userId) {
      return sendError(res, 400, 'Offer not available for checkout');
    }
    itemPrice = offer.amount;
  } else if (parsed.data.liveStreamProductId) {
    const { data: product } = await supabase
      .from('live_stream_products')
      .select('*')
      .eq('id', parsed.data.liveStreamProductId)
      .maybeSingle();
    if (product) itemPrice = product.live_price;
  }

  const amounts = computeCheckoutAmounts(itemPrice, parsed.data.deliveryMethod);
  const txRef = newTxRef();
  const mode = paymentMode();
  const payload: CheckoutPayload = parsed.data;
  const service = createServiceClient();

  const { data: intent, error: intentError } = await service
    .from('payment_intents')
    .insert({
      tx_ref: txRef,
      user_id: userId,
      listing_id: parsed.data.listingId,
      amount: amounts.total,
      currency: 'NGN',
      status: 'pending',
      provider: mode === 'flutterwave' ? 'flutterwave' : 'simulate',
      checkout_payload: payload,
    })
    .select('*')
    .single();

  if (intentError) return handleSupabaseError(res, intentError);

  const profile = await getProfileById(supabase, userId);

  if (mode === 'simulate') {
    return res.status(201).json({
      mode: 'simulate',
      paymentId: intent.id,
      txRef,
      amount: amounts.total,
      currency: 'NGN',
      breakdown: amounts,
      redirectUrl: paymentRedirectUrl(),
    });
  }

  try {
    const flw = await flutterwaveInitPayment({
      txRef,
      amount: amounts.total,
      customer: {
        email: profile?.email || `${profile?.username ?? 'buyer'}@throve.store`,
        name: parsed.data.name,
        phonenumber: parsed.data.phone,
      },
      redirectUrl: paymentRedirectUrl(),
      title: 'Throve',
      description: listing.title,
      meta: {
        paymentId: intent.id,
        listingId: parsed.data.listingId,
      },
    });

    await service.from('payment_intents').update({ provider_ref: flw.providerRef }).eq('id', intent.id);

    return res.status(201).json({
      mode: 'flutterwave',
      paymentId: intent.id,
      txRef,
      amount: amounts.total,
      currency: 'NGN',
      breakdown: amounts,
      checkoutUrl: flw.checkoutUrl,
      redirectUrl: paymentRedirectUrl(),
      publicKey: process.env.FLW_PUBLIC_KEY ?? null,
    });
  } catch (err) {
    await service.from('payment_intents').update({ status: 'failed' }).eq('id', intent.id);
    return sendError(res, 502, err instanceof Error ? err.message : 'Payment provider unavailable');
  }
});

router.post('/payments/verify', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      txRef: z.string().min(1),
      simulateOutcome: z.enum(['success', 'failed', 'cancelled']).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid verify payload');

  const service = createServiceClient();
  const { data: intent, error } = await service
    .from('payment_intents')
    .select('*')
    .eq('tx_ref', parsed.data.txRef)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!intent) return sendError(res, 404, 'Payment not found');

  if (intent.status === 'successful' && intent.order_id) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', intent.order_id).maybeSingle();
    if (order) {
      const buyer = await getProfileById(supabase, order.buyer_id);
      const seller = await getProfileById(supabase, order.seller_id);
      return res.json({
        status: 'successful',
        order: {
          id: order.id,
          listingId: order.listing_id,
          listingTitle: order.listing_title,
          buyer: buyer?.username ?? 'unknown',
          seller: seller?.username ?? 'unknown',
          name: order.name,
          address: order.address,
          city: order.city,
          state: order.state ?? null,
          phone: order.phone,
          deliveryMethod: order.delivery_method,
          deliveryFee: order.delivery_fee,
          protectionFee: order.protection_fee ?? 0,
          itemPrice: order.item_price,
          listedPrice: order.listed_price ?? null,
          offerId: order.offer_id ?? null,
          total: order.total,
          fromLiveId: order.from_live_id,
          createdAt: order.created_at,
          status: order.status,
          reviewed: order.reviewed,
        },
      });
    }
  }

  const mode = paymentMode();
  let providerStatus = 'pending';
  let providerRef = intent.provider_ref as string | null;

  if (mode === 'simulate') {
    const outcome = parsed.data.simulateOutcome ?? 'success';
    if (outcome === 'cancelled') {
      await service.from('payment_intents').update({ status: 'cancelled' }).eq('id', intent.id);
      return res.json({ status: 'cancelled' });
    }
    if (outcome === 'failed') {
      await service.from('payment_intents').update({ status: 'failed' }).eq('id', intent.id);
      return res.json({ status: 'failed' });
    }
    providerStatus = 'successful';
  } else {
    try {
      const verified = await flutterwaveVerifyByRef(parsed.data.txRef);
      providerRef = verified.providerRef;
      if (verified.currency !== 'NGN' || Math.round(verified.amount) !== intent.amount) {
        await service
          .from('payment_intents')
          .update({ status: 'failed', provider_ref: providerRef })
          .eq('id', intent.id);
        return sendError(res, 400, 'Payment amount mismatch');
      }
      if (verified.status === 'successful' || verified.status === 'success') providerStatus = 'successful';
      else if (verified.status === 'failed') providerStatus = 'failed';
      else providerStatus = 'pending';
    } catch {
      return res.json({ status: 'pending' });
    }
  }

  if (providerStatus === 'failed') {
    await service.from('payment_intents').update({ status: 'failed', provider_ref: providerRef }).eq('id', intent.id);
    return res.json({ status: 'failed' });
  }

  if (providerStatus !== 'successful') {
    return res.json({ status: 'pending' });
  }

  try {
    const order = await fulfillPaidCheckout(supabase, userId, intent.checkout_payload as CheckoutPayload, {
      txRef: intent.tx_ref,
      providerRef,
    });
    await service
      .from('payment_intents')
      .update({ status: 'successful', provider_ref: providerRef, order_id: order.id })
      .eq('id', intent.id);
    return res.json({ status: 'successful', order });
  } catch (err) {
    const status =
      typeof err === 'object' && err && 'status' in err ? Number((err as { status: number }).status) : 500;
    return sendError(res, status || 500, err instanceof Error ? err.message : 'Could not complete order');
  }
});

router.get('/payments/config', requireAuth, async (_req, res) => {
  const mode = paymentMode();
  return res.json({
    mode,
    currency: 'NGN',
    publicKey: mode === 'flutterwave' ? process.env.FLW_PUBLIC_KEY ?? null : null,
    redirectUrl: paymentRedirectUrl(),
    webhookUrl: `${publicApiBase()}/checkout/payments/webhook`,
  });
});

router.get('/payments/:txRef/status', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const service = createServiceClient();
  const { data: owned, error } = await service
    .from('payment_intents')
    .select('*')
    .eq('tx_ref', req.params.txRef)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!owned) return sendError(res, 404, 'Payment not found');
  return res.json({
    paymentId: owned.id,
    txRef: owned.tx_ref,
    status: owned.status,
    orderId: owned.order_id,
    amount: owned.amount,
    currency: owned.currency,
    provider: owned.provider,
  });
});

router.post('/payments/webhook', async (req, res) => {
  const signature = req.header('verif-hash') ?? undefined;
  if (!flutterwaveWebhookVerified(signature)) {
    return sendError(res, 401, 'Invalid webhook signature');
  }

  const event = req.body as {
    data?: { tx_ref?: string; id?: number; status?: string };
  };
  const txRef = event.data?.tx_ref;
  if (!txRef) return res.json({ ok: true });

  const service = createServiceClient();
  const { data: intent } = await service.from('payment_intents').select('*').eq('tx_ref', txRef).maybeSingle();
  if (!intent) return res.json({ ok: true });
  if (intent.status === 'successful') return res.json({ ok: true });

  const status = String(event.data?.status ?? '').toLowerCase();
  if (status !== 'successful' && status !== 'success') {
    if (status === 'failed') {
      await service
        .from('payment_intents')
        .update({ status: 'failed', provider_ref: String(event.data?.id ?? '') })
        .eq('id', intent.id);
    }
    return res.json({ ok: true });
  }

  try {
    const order = await fulfillPaidCheckout(service, intent.user_id, intent.checkout_payload as CheckoutPayload, {
      txRef,
      providerRef: event.data?.id != null ? String(event.data.id) : null,
    });
    await service
      .from('payment_intents')
      .update({ status: 'successful', order_id: order.id, provider_ref: String(event.data?.id ?? '') })
      .eq('id', intent.id);
  } catch {
    /* leave pending for retry */
  }

  return res.json({ ok: true });
});

export default router;
