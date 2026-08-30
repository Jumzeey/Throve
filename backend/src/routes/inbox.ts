import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import type { DbRow } from '../lib/db-types.js';
import { getProfileById, getProfileByUsername } from '../lib/mappers.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();
const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

async function usernameToId(supabase: ReturnType<typeof import('../lib/supabase.js').createSupabaseClient>, username: string) {
  const profile = await getProfileByUsername(supabase, username);
  return profile?.id ?? null;
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

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true });

  if (error) return handleSupabaseError(res, error);

  const mapped = await Promise.all(
    (data ?? []).map(async (row: DbRow) => {
      const sender = await getProfileById(supabase, row.sender_id);
      return {
        id: row.id,
        from: sender?.username ?? 'unknown',
        text: row.text,
        createdAt: new Date(row.created_at).getTime(),
      };
    }),
  );

  await supabase.from('conversation_unread').delete().eq('conversation_id', req.params.id).eq('user_id', userId);

  return res.json(mapped);
});

router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ text: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Message required');

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: req.params.id,
      sender_id: userId,
      text: parsed.data.text.trim(),
    })
    .select('*')
    .single();

  if (error) return handleSupabaseError(res, error);

  const { data: conv } = await supabase.from('conversations').select('*').eq('id', req.params.id).single();
  if (conv) {
    await supabase
      .from('conversations')
      .update({ last_message: parsed.data.text.trim(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    const otherId = conv.participant_a === userId ? conv.participant_b : conv.participant_a;
    await supabase.from('conversation_unread').upsert({ conversation_id: req.params.id, user_id: otherId });
  }

  const sender = await getProfileById(supabase, userId);
  return res.status(201).json({
    id: message.id,
    from: sender?.username ?? 'unknown',
    text: message.text,
    createdAt: new Date(message.created_at).getTime(),
  });
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

  return res.status(201).json({
    id: data.id,
    listingId: data.listing_id,
    buyer: parsed.data.buyer,
    seller: parsed.data.seller,
    amount: data.amount,
    status: data.status,
    createdAt: new Date(data.created_at).getTime(),
    expiresAt: new Date(data.expires_at).getTime(),
    initiator: data.initiator,
  });
});

router.patch('/offers/:id', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z.object({ action: z.enum(['accept', 'reject', 'withdraw']) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid action');

  const { data: offer, error: offerError } = await supabase.from('offers').select('*').eq('id', req.params.id).maybeSingle();
  if (offerError) return handleSupabaseError(res, offerError);
  if (!offer || offer.status !== 'pending') return sendError(res, 400, 'Offer not available');

  let status = offer.status;
  if (parsed.data.action === 'accept' && offer.seller_id === userId) status = 'accepted';
  else if (parsed.data.action === 'reject' && offer.seller_id === userId) status = 'rejected';
  else if (parsed.data.action === 'withdraw' && offer.buyer_id === userId) status = 'withdrawn';
  else return sendError(res, 403, 'Not allowed');

  const { data, error } = await supabase.from('offers').update({ status }).eq('id', req.params.id).select('*').single();
  if (error) return handleSupabaseError(res, error);

  const buyer = await getProfileById(supabase, data.buyer_id);
  const seller = await getProfileById(supabase, data.seller_id);

  return res.json({
    id: data.id,
    listingId: data.listing_id,
    buyer: buyer?.username ?? 'unknown',
    seller: seller?.username ?? 'unknown',
    amount: data.amount,
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
