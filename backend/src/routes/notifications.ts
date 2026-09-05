import { Router } from 'express';
import { z } from 'zod';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const admin = createServiceClient();
  const { data, error } = await admin
    .from('notifications')
    .select('id, category, type, title, body, data, deep_link, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return handleSupabaseError(res, error);
  return res.json(
    (data ?? []).map((row) => ({
      id: row.id,
      category: row.category,
      type: row.type,
      title: row.title,
      body: row.body,
      data: row.data ?? {},
      deepLink: row.deep_link || undefined,
      readAt: row.read_at ? new Date(row.read_at).getTime() : undefined,
      createdAt: new Date(row.created_at).getTime(),
    })),
  );
});

router.post('/push-token', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const parsed = z
    .object({
      token: z.string().min(8),
      platform: z.enum(['ios', 'android', 'web']),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid input');

  const admin = createServiceClient();
  const { error } = await admin.from('device_push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: parsed.data.token,
      platform: parsed.data.platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' },
  );
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true });
});

router.post('/:id/read', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const admin = createServiceClient();
  const { error } = await admin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) return handleSupabaseError(res, error);
  return res.json({ ok: true });
});

export default router;
