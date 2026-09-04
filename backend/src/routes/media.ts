import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/profile-photo', requireAuth, upload.single('file'), async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  if (!req.file) return sendError(res, 400, 'File required');

  const path = `${userId}/${randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from('profile-photos').upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: true,
  });

  if (uploadError) return handleSupabaseError(res, uploadError);

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  await supabase.from('profiles').update({ photo_url: data.publicUrl }).eq('id', userId);

  return res.json({ url: data.publicUrl });
});

router.post('/listing-photos', requireAuth, upload.array('files', 8), async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const files = req.files as Express.Multer.File[];
  if (!files?.length) return sendError(res, 400, 'At least one file required');

  const urls: string[] = [];
  for (const file of files) {
    const path = `${userId}/${randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('listing-photos').upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });
    if (uploadError) return handleSupabaseError(res, uploadError);
    const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return res.json({ urls });
});

router.post('/chat-image', requireAuth, upload.single('file'), async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  if (!req.file) return sendError(res, 400, 'File required');

  const path = `${userId}/${randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, req.file.buffer, {
    contentType: req.file.mimetype || 'image/jpeg',
    upsert: true,
  });
  if (uploadError) return handleSupabaseError(res, uploadError);

  const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
  return res.json({ url: data.publicUrl });
});

export default router;
