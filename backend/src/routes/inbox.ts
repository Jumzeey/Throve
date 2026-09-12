import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import type { DbRow } from '../lib/db-types.js';
import { queueMessageEmail } from '../lib/email/message-debounce.js';
import {
  offerAcceptedEmail,
  offerReceivedEmail,
  offerRejectedEmail,
  offerWithdrawnEmail,
} from '../lib/email/templates/offers.js';
import { getProfileById, getProfileByUsername } from '../lib/mappers.js';
import { notifyUser } from '../lib/notify.js';
import { formatNaira } from '../lib/email/layout.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();
const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

async function usernameToId(supabase: ReturnType<typeof import('../lib/supabase.js').createSupabaseClient>, username: string) {
  const profile = await getProfileByUsername(supabase, username);
  return profile?.id ?? null;
}

async function listingTitle(
  supabase: ReturnType<typeof import('../lib/supabase.js').createSupabaseClient>,
  listingId: string,
) {
  const { data } = await supabase.from('listings').select('title').eq('id', listingId).maybeSingle();
  return (data?.title as string) || 'your listing';
}

async function listingPrice(
  supabase: ReturnType<typeof import('../lib/supabase.js').createSupabaseClient>,
  listingId: string,
) {
  const { data } = await supabase.from('listings').select('price').eq('id', listingId).maybeSingle();
  const price = Number(data?.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function minOfferAmount(listingPrice: number) {
  return Math.ceil(listingPrice * 0.4);
}

function validateOfferAgainstListing(amount: number, listingPrice: number): string | null {
  const min = minOfferAmount(listingPrice);
  if (amount < min) return `Offer must be at least ${formatNaira(min)}.`;
  if (amount >= listingPrice) return 'Offer must be below the listing price.';
  return null;
}

/** Ensure the listing chat exists and post a message both parties will see in the thread. */
async function postOfferToChat(input: {
  listingId: string;
  buyerId: string;
  sellerId: string;
  senderId: string;
  text: string;
  /** Skip message notify — offer already has its own push/email. */
  skipMessageNotify?: boolean;
}) {
  try {
    const admin = createServiceClient();
    const [a, b] =
      input.buyerId < input.sellerId ? [input.buyerId, input.sellerId] : [input.sellerId, input.buyerId];

    let conversationId: string | null = null;
    const existing = await admin
      .from('conversations')
      .select('id')
      .eq('listing_id', input.listingId)
      .eq('participant_a', a)
      .eq('participant_b', b)
      .maybeSingle();

    if (existing.data?.id) {
      conversationId = String(existing.data.id);
    } else {
      const { data: created, error } = await admin
        .from('conversations')
        .insert({
          listing_id: input.listingId,
          participant_a: a,
          participant_b: b,
        })
        .select('id')
        .single();
      if (error || !created?.id) {
        console.warn('[offer-chat]', error?.message ?? 'create conversation failed');
        return;
      }
      conversationId = String(created.id);
    }

    const { error: messageError } = await admin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: input.senderId,
      text: input.text,
    });
    if (messageError) {
      console.warn('[offer-chat]', messageError.message);
      return;
    }

    await admin
      .from('conversations')
      .update({ last_message: input.text, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    const recipientId = input.senderId === input.buyerId ? input.sellerId : input.buyerId;
    await admin.from('conversation_unread').upsert({ conversation_id: conversationId, user_id: recipientId });

    if (!input.skipMessageNotify) {
      const sender = await getProfileById(admin, input.senderId);
      void notifyUser({
        userId: recipientId,
        category: 'message',
        type: 'message_new',
        title: `Message from @${sender?.username ?? 'someone'}`,
        body: input.text,
        deepLink: `inbox/chat/${conversationId}`,
        data: { conversationId },
      });
    }
  } catch (err) {
    console.warn('[offer-chat]', err instanceof Error ? err.message : err);
  }
}

async function mapMessageRow(
  supabase: ReturnType<typeof import('../lib/supabase.js').createSupabaseClient>,
  row: DbRow,
) {
  const sender = await getProfileById(supabase, row.sender_id);
  return {
    id: row.id,
    from: sender?.username ?? 'unknown',
    text: row.text ?? '',
    imageUrl: row.image_url ?? null,
    createdAt: new Date(row.created_at).getTime(),
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).getTime() : null,
    readAt: row.read_at ? new Date(row.read_at).getTime() : null,
  };
}

async function applyReceipts(
  conversationId: string,
  recipientUserId: string,
  level: 'delivered' | 'read',
) {
  const admin = createServiceClient();
  const now = new Date().toISOString();

  if (level === 'delivered') {
    await admin
      .from('messages')
      .update({ delivered_at: now })
      .eq('conversation_id', conversationId)
      .neq('sender_id', recipientUserId)
      .is('delivered_at', null);
    return;
  }

  await admin
    .from('messages')
    .update({ read_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', recipientUserId)
    .is('read_at', null);

  await admin
    .from('messages')
    .update({ delivered_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', recipientUserId)
    .is('delivered_at', null);
}

router.get('/conversations', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) return handleSupabaseError(res, error);

  const profile = await getProfileById(supabase, userId);
  const me = profile?.username ?? '';

  const mapped = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const otherId = row.participant_a === userId ? row.participant_b : row.participant_a;
      const otherProfile = await getProfileById(supabase, otherId);
      const { data: unread } = await supabase
        .from('conversation_unread')
        .select('user_id')
        .eq('conversation_id', row.id)
        .eq('user_id', userId)
        .maybeSingle();

      return {
        id: row.id,
        listingId: row.listing_id,
        participants: [me, otherProfile?.username ?? 'unknown'] as [string, string],
        lastMessage: row.last_message,
        updatedAt: new Date(row.updated_at).getTime(),
        unreadBy: unread ? [me] : [],
      };
    }),
  );

  return res.json(mapped);
});

router.post('/conversations', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ withUsername: z.string(), listingId: z.string() }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const otherId = await usernameToId(supabase, parsed.data.withUsername);
  if (!otherId) return sendError(res, 404, 'User not found');

  const [a, b] = userId < otherId ? [userId, otherId] : [otherId, userId];

  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('listing_id', parsed.data.listingId)
    .eq('participant_a', a)
    .eq('participant_b', b)
    .maybeSingle();

  if (existing.data) {
    const me = (await getProfileById(supabase, userId))?.username ?? '';
    const other = (await getProfileById(supabase, otherId))?.username ?? '';
    return res.json({
      id: existing.data.id,
      listingId: existing.data.listing_id,
      participants: [me, other],
      lastMessage: existing.data.last_message,
      updatedAt: new Date(existing.data.updated_at).getTime(),
      unreadBy: [],
    });
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: parsed.data.listingId,
      participant_a: a,
      participant_b: b,
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const me = (await getProfileById(supabase, userId))?.username ?? '';
  const other = (await getProfileById(supabase, otherId))?.username ?? '';

  return res.status(201).json({
    id: data.id,
    listingId: data.listing_id,
    participants: [me, other],
    lastMessage: '',
    updatedAt: Date.now(),
    unreadBy: [],
  });
});

router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const ack = typeof req.query.ack === 'string' ? req.query.ack : 'none';

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (convError) return handleSupabaseError(res, convError);
  if (!conv || (conv.participant_a !== userId && conv.participant_b !== userId)) {
    return sendError(res, 403, 'Conversation not available');
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true });

  if (error) return handleSupabaseError(res, error);

  if (ack === 'read' || ack === 'delivered') {
    await applyReceipts(String(req.params.id), userId, ack);
    if (ack === 'read') {
      await supabase.from('conversation_unread').delete().eq('conversation_id', req.params.id).eq('user_id', userId);
    }
    const { data: fresh } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });
    const remapped = await Promise.all((fresh ?? []).map((row: DbRow) => mapMessageRow(supabase, row)));
    return res.json(remapped);
  }

  const mapped = await Promise.all((data ?? []).map((row: DbRow) => mapMessageRow(supabase, row)));
  return res.json(mapped);
});

router.post('/conversations/:id/receipts', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ level: z.enum(['delivered', 'read']) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid receipt');

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (convError) return handleSupabaseError(res, convError);
  if (!conv || (conv.participant_a !== userId && conv.participant_b !== userId)) {
    return sendError(res, 403, 'Conversation not available');
  }

  await applyReceipts(String(req.params.id), userId, parsed.data.level);
  if (parsed.data.level === 'read') {
    await supabase.from('conversation_unread').delete().eq('conversation_id', req.params.id).eq('user_id', userId);
  }
  void supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) return handleSupabaseError(res, error);

  const mapped = await Promise.all((data ?? []).map((row: DbRow) => mapMessageRow(supabase, row)));
  return res.json(mapped);
});

router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      text: z.string().optional().default(''),
      imageUrl: z.string().url().optional().nullable(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid message');

  const text = parsed.data.text.trim();
  const imageUrl = parsed.data.imageUrl?.trim() || null;
  if (!text && !imageUrl) return sendError(res, 400, 'Message required');

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (convError) return handleSupabaseError(res, convError);
  if (!conv || (conv.participant_a !== userId && conv.participant_b !== userId)) {
    return sendError(res, 403, 'Conversation not available');
  }

  const otherId = conv.participant_a === userId ? conv.participant_b : conv.participant_a;
  const meProfile = await getProfileById(supabase, userId);
  const otherProfile = await getProfileById(supabase, otherId);
  const meUsername = meProfile?.username ?? '';
  const otherUsername = otherProfile?.username ?? '';

  const { data: iBlocked } = await supabase
    .from('blocked_users')
    .select('user_id')
    .eq('user_id', userId)
    .eq('blocked_username', otherUsername)
    .maybeSingle();
  const { data: theyBlocked } = await supabase
    .from('blocked_users')
    .select('user_id')
    .eq('user_id', otherId)
    .eq('blocked_username', meUsername)
    .maybeSingle();
  if (iBlocked || theyBlocked) return sendError(res, 403, 'Messaging unavailable');

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: req.params.id,
      sender_id: userId,
      text,
      image_url: imageUrl,
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  void supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);

  const preview = text || 'Sent a photo';
  await supabase
    .from('conversations')
    .update({ last_message: preview, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  await supabase.from('conversation_unread').upsert({ conversation_id: req.params.id, user_id: otherId });

  void notifyUser({
    userId: otherId,
    category: 'message',
    type: 'message_new',
    title: `Message from @${meUsername || 'someone'}`,
    body: preview,
    deepLink: `inbox/chat/${req.params.id}`,
    data: { conversationId: String(req.params.id) },
  });

  queueMessageEmail({
    conversationId: String(req.params.id),
    toUserId: otherId,
    fromUsername: meUsername || 'someone',
    preview,
  });

  return res.status(201).json({
    id: message.id,
    from: meUsername || 'unknown',
    text: message.text ?? '',
    imageUrl: message.image_url ?? null,
    createdAt: new Date(message.created_at).getTime(),
    deliveredAt: null,
    readAt: null,
  });
});

router.post('/reports', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      kind: z.enum(['user', 'message']),
      targetUsername: z.string().min(1),
      conversationId: z.string().uuid().optional().nullable(),
      messageId: z.string().uuid().optional().nullable(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid report');

  const { data, error } = await supabase
    .from('chat_reports')
    .insert({
      reporter_id: userId,
      target_username: parsed.data.targetUsername,
      conversation_id: parsed.data.conversationId ?? null,
      message_id: parsed.data.messageId ?? null,
      kind: parsed.data.kind,
    })
    .select('id')
    .single();
  if (error) return handleSupabaseError(res, error);
  return res.status(201).json({ id: data.id, ok: true });
});

router.get('/offers', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const listingId = req.query.listingId ? String(req.query.listingId) : undefined;

  let query = supabase.from('offers').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  if (listingId) query = query.eq('listing_id', listingId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return handleSupabaseError(res, error);

  const mapped = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const buyer = await getProfileById(supabase, row.buyer_id);
      const seller = await getProfileById(supabase, row.seller_id);
      let status = row.status;
      if (status === 'pending' && new Date(row.expires_at).getTime() < Date.now()) status = 'expired';
      return {
        id: row.id,
        listingId: row.listing_id,
        buyer: buyer?.username ?? 'unknown',
        seller: seller?.username ?? 'unknown',
        amount: row.amount,
        previousAmount: row.previous_amount ?? null,
        status,
        createdAt: new Date(row.created_at).getTime(),
        expiresAt: new Date(row.expires_at).getTime(),
        initiator: row.initiator,
      };
    }),
  );

  const me = (await getProfileById(supabase, userId))?.username ?? '';
  const sent = mapped.filter(
    (offer: (typeof mapped)[number]) =>
      (offer.initiator === 'buyer' && offer.buyer === me) || (offer.initiator === 'seller' && offer.seller === me),
  );
  const received = mapped.filter((offer: (typeof mapped)[number]) => !sent.includes(offer));

  return res.json({ received, sent, all: mapped });
});

router.post('/offers', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      listingId: z.string(),
      buyer: z.string(),
      seller: z.string(),
      amount: z.number().positive(),
      initiator: z.enum(['buyer', 'seller']),
    })
    .safeParse(req.body);

  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const buyerId = await usernameToId(supabase, parsed.data.buyer);
  const sellerId = await usernameToId(supabase, parsed.data.seller);
  if (!buyerId || !sellerId) return sendError(res, 404, 'Participant not found');

  const price = await listingPrice(supabase, parsed.data.listingId);
  if (price == null) return sendError(res, 404, 'Listing not found');
  const amountError = validateOfferAgainstListing(parsed.data.amount, price);
  if (amountError) return sendError(res, 400, amountError);

  const { data: priorPending } = await supabase
    .from('offers')
    .select('id, amount')
    .eq('listing_id', parsed.data.listingId)
    .eq('buyer_id', buyerId)
    .eq('status', 'pending');

  if (priorPending && priorPending.length > 0) {
    await supabase
      .from('offers')
      .update({ status: 'withdrawn' })
      .eq('listing_id', parsed.data.listingId)
      .eq('buyer_id', buyerId)
      .eq('status', 'pending');

    for (const prior of priorPending) {
      void postOfferToChat({
        listingId: parsed.data.listingId,
        buyerId,
        sellerId,
        senderId: userId,
        text: `Replaced previous offer of ${formatNaira(Number(prior.amount) || 0)}`,
        skipMessageNotify: true,
      });
    }
  }

  const expiresAt = new Date(Date.now() + OFFER_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from('offers')
    .insert({
      listing_id: parsed.data.listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount: parsed.data.amount,
      initiator: parsed.data.initiator,
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const title = await listingTitle(supabase, parsed.data.listingId);
  const recipientId = parsed.data.initiator === 'buyer' ? sellerId : buyerId;
  const fromUsername = parsed.data.initiator === 'buyer' ? parsed.data.buyer : parsed.data.seller;
  const amountLabel = formatNaira(Number(data.amount) || 0);
  const chatText =
    parsed.data.initiator === 'seller'
      ? `Discounted offer: ${amountLabel}`
      : `Offer: ${amountLabel}`;

  void postOfferToChat({
    listingId: parsed.data.listingId,
    buyerId,
    sellerId,
    senderId: userId,
    text: chatText,
    skipMessageNotify: true,
  });

  void notifyUser({
    userId: recipientId,
    category: 'offer',
    type: 'offer_received',
    title: `New offer from @${fromUsername}`,
    body: `${title} · ${amountLabel}`,
    deepLink: `inbox/offer/${data.id}`,
    data: { offerId: data.id },
    email: offerReceivedEmail({
      offerId: data.id,
      listingTitle: title,
      amount: data.amount,
      otherUsername: fromUsername,
      expiresAt: expiresAt,
    }),
  });

  return res.status(201).json({
    id: data.id,
    listingId: data.listing_id,
    buyer: parsed.data.buyer,
    seller: parsed.data.seller,
    amount: data.amount,
    previousAmount: data.previous_amount ?? null,
    status: data.status,
    createdAt: new Date(data.created_at).getTime(),
    expiresAt: new Date(data.expires_at).getTime(),
    initiator: data.initiator,
  });
});

router.patch('/offers/:id', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      action: z.enum(['accept', 'reject', 'withdraw', 'counter']),
      amount: z.number().positive().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid action');

  const { data: offer, error: offerError } = await supabase.from('offers').select('*').eq('id', req.params.id).maybeSingle();
  if (offerError) return handleSupabaseError(res, offerError);
  if (!offer || offer.status !== 'pending') return sendError(res, 400, 'Offer not available');

  const isBuyer = offer.buyer_id === userId;
  const isSeller = offer.seller_id === userId;
  if (!isBuyer && !isSeller) return sendError(res, 403, 'Not allowed');

  const patch: Record<string, unknown> = {};
  let status = offer.status as string;

  if (parsed.data.action === 'accept') {
    if (offer.initiator === 'buyer' && isSeller) status = 'accepted';
    else if (offer.initiator === 'seller' && isBuyer) status = 'accepted';
    else return sendError(res, 403, 'Not allowed');
    patch.status = status;
  } else if (parsed.data.action === 'reject') {
    if (offer.initiator === 'buyer' && isSeller) status = 'rejected';
    else if (offer.initiator === 'seller' && isBuyer) status = 'rejected';
    else return sendError(res, 403, 'Not allowed');
    patch.status = status;
  } else if (parsed.data.action === 'withdraw') {
    if (offer.initiator === 'buyer' && isBuyer) status = 'withdrawn';
    else if (offer.initiator === 'seller' && isSeller) status = 'withdrawn';
    else return sendError(res, 403, 'Not allowed');
    patch.status = status;
  } else if (parsed.data.action === 'counter') {
    if (!isSeller) return sendError(res, 403, 'Not allowed');
    if (!parsed.data.amount) return sendError(res, 400, 'Counter amount required');
    const price = await listingPrice(supabase, String(offer.listing_id));
    if (price == null) return sendError(res, 404, 'Listing not found');
    const amountError = validateOfferAgainstListing(parsed.data.amount, price);
    if (amountError) return sendError(res, 400, amountError);
    patch.previous_amount = offer.amount;
    patch.amount = parsed.data.amount;
    patch.initiator = 'seller';
    patch.expires_at = new Date(Date.now() + OFFER_TTL_MS).toISOString();
    status = 'pending';
  } else {
    return sendError(res, 400, 'Invalid action');
  }

  const { data, error } = await supabase.from('offers').update(patch).eq('id', req.params.id).select('*').single();
  if (error) return handleSupabaseError(res, error);

  const buyer = await getProfileById(supabase, data.buyer_id);
  const seller = await getProfileById(supabase, data.seller_id);
  const title = await listingTitle(supabase, data.listing_id);
  const amountLabel = formatNaira(Number(data.amount) || 0);

  let chatText: string | null = null;
  if (parsed.data.action === 'counter') {
    chatText = `Counter offer: ${amountLabel}`;
  } else if (status === 'accepted') {
    chatText = `Accepted the offer of ${amountLabel}`;
  } else if (status === 'rejected') {
    chatText = `Declined the offer of ${amountLabel}`;
  } else if (status === 'withdrawn') {
    chatText = `Withdrew the offer of ${amountLabel}`;
  }

  if (chatText) {
    void postOfferToChat({
      listingId: String(data.listing_id),
      buyerId: String(data.buyer_id),
      sellerId: String(data.seller_id),
      senderId: userId,
      text: chatText,
      skipMessageNotify: true,
    });
  }

  if (parsed.data.action === 'counter') {
    void notifyUser({
      userId: data.buyer_id,
      category: 'offer',
      type: 'offer_counter',
      title: `Counter offer from @${seller?.username ?? 'seller'}`,
      body: `${title} · ${amountLabel}`,
      deepLink: `inbox/offer/${data.id}`,
      data: { offerId: data.id },
      email: offerReceivedEmail({
        offerId: data.id,
        listingTitle: title,
        amount: data.amount,
        otherUsername: seller?.username ?? 'seller',
        expiresAt: data.expires_at,
      }),
    });
  } else if (status === 'accepted') {
    const recipientId = offer.initiator === 'seller' ? data.seller_id : data.buyer_id;
    const otherUsername =
      offer.initiator === 'seller' ? (buyer?.username ?? 'buyer') : (seller?.username ?? 'seller');
    void notifyUser({
      userId: recipientId,
      category: 'offer',
      type: 'offer_accepted',
      title: 'Offer accepted',
      body: title,
      deepLink: `inbox/offer/${data.id}`,
      data: { offerId: data.id },
      email: offerAcceptedEmail({
        offerId: data.id,
        listingTitle: title,
        amount: data.amount,
        otherUsername,
      }),
    });
  } else if (status === 'rejected') {
    const recipientId = offer.initiator === 'seller' ? data.seller_id : data.buyer_id;
    const otherUsername =
      offer.initiator === 'seller' ? (buyer?.username ?? 'buyer') : (seller?.username ?? 'seller');
    void notifyUser({
      userId: recipientId,
      category: 'offer',
      type: 'offer_rejected',
      title: 'Offer update',
      body: title,
      deepLink: `inbox/offer/${data.id}`,
      data: { offerId: data.id },
      email: offerRejectedEmail({
        offerId: data.id,
        listingTitle: title,
        amount: data.amount,
        otherUsername,
      }),
    });
  } else if (status === 'withdrawn') {
    const recipientId = offer.initiator === 'seller' ? data.buyer_id : data.seller_id;
    const otherUsername =
      offer.initiator === 'seller' ? (seller?.username ?? 'seller') : (buyer?.username ?? 'buyer');
    void notifyUser({
      userId: recipientId,
      category: 'offer',
      type: 'offer_withdrawn',
      title: 'Offer withdrawn',
      body: title,
      deepLink: `inbox/offer/${data.id}`,
      data: { offerId: data.id },
      email: offerWithdrawnEmail({
        offerId: data.id,
        listingTitle: title,
        amount: data.amount,
        otherUsername,
      }),
    });
  }

  return res.json({
    id: data.id,
    listingId: data.listing_id,
    buyer: buyer?.username ?? 'unknown',
    seller: seller?.username ?? 'unknown',
    amount: data.amount,
    previousAmount: data.previous_amount ?? null,
    status: data.status,
    createdAt: new Date(data.created_at).getTime(),
    expiresAt: new Date(data.expires_at).getTime(),
    initiator: data.initiator,
  });
});

router.get('/blocks', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { data, error } = await supabase.from('blocked_users').select('blocked_username').eq('user_id', userId);
  if (error) return handleSupabaseError(res, error);
  return res.json((data ?? []).map((row: DbRow) => row.blocked_username));
});

router.post('/blocks/:username', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { error } = await supabase.from('blocked_users').upsert({ user_id: userId, blocked_username: req.params.username });
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true });
});

router.delete('/blocks/:username', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_username', req.params.username);
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true });
});

export default router;
