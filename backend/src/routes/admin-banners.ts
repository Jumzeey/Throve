import { randomUUID } from 'crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import type { DbRow } from '../lib/db-types.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { bannerInput, bannerIsLive, bannerRowFromInput, mapHomeBanner } from '../lib/home-banners.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import { requireStaffAction, requireStaffAuth, requireStaffRole, type StaffRequest } from '../middleware/staff.js';
import { clearHomeBannerCache } from './home.js';

/** Home carousel slides. Super admins only (see ROUTE_ROLES.banners / manage_banners). */
const router = Router();
const routeRoles = ROUTE_ROLES.banners;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const guard = [requireStaffAuth, requireStaffRole(...routeRoles), requireStaffAction('manage_banners')];

function withStatus(row: DbRow) {
  const banner = mapHomeBanner(row);
  const now = Date.now();
  let status: 'Live' | 'Scheduled' | 'Ended' | 'Off' = 'Off';
  if (row.active) {
    if (bannerIsLive(row as { active: boolean }, now)) status = 'Live';
    else if (row.starts_at && new Date(row.starts_at).getTime() > now) status = 'Scheduled';
    else status = 'Ended';
  }
  return { ...banner, status };
}

async function audit(req: StaffRequest, action: string, id: string, meta: Record<string, unknown> = {}) {
  await writeAdminAudit(createServiceClient(), {
    actorId: req.userId,
    actorRole: req.adminRole,
    action,
    resourceType: 'home_banner',
    resourceId: id,
    meta,
    sensitivity: 'Standard',
  });
}

async function listAll() {
  const { data, error } = await createServiceClient()
    .from('home_banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(withStatus);
}

router.get('/', ...guard, async (_req, res) => {
  try {
    return res.json({ banners: await listAll() });
  } catch (err) {
    return handleSupabaseError(res, err as never);
  }
});

router.post('/', ...guard, async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = bannerInput.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, parsed.error.errors[0]?.message ?? 'Invalid banner');

  const service = createServiceClient();
  const { data: last } = await service
    .from('home_banners')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await service
    .from('home_banners')
    .insert({
      ...bannerRowFromInput(parsed.data),
      sort_order: Number(last?.sort_order ?? -1) + 1,
      created_by: staff.userId,
      updated_by: staff.userId,
    })
    .select('*')
    .single();
  if (error) return handleSupabaseError(res, error);

  clearHomeBannerCache();
  await audit(staff, 'banner.create', String(data.id), { title: data.title });
  return res.status(201).json({ banner: withStatus(data) });
});

router.put('/:id', ...guard, async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = bannerInput.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, parsed.error.errors[0]?.message ?? 'Invalid banner');

  const { data, error } = await createServiceClient()
    .from('home_banners')
    .update({ ...bannerRowFromInput(parsed.data), updated_by: staff.userId })
    .eq('id', req.params.id)
    .select('*')
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Banner not found', 'NOT_FOUND');

  clearHomeBannerCache();
  await audit(staff, 'banner.update', String(data.id), { title: data.title, active: data.active });
  return res.json({ banner: withStatus(data) });
});

router.delete('/:id', ...guard, async (req, res) => {
  const staff = req as StaffRequest;
  const { data, error } = await createServiceClient()
    .from('home_banners')
    .delete()
    .eq('id', req.params.id)
    .select('id, title')
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!data) return sendError(res, 404, 'Banner not found', 'NOT_FOUND');

  clearHomeBannerCache();
  await audit(staff, 'banner.delete', String(data.id), { title: data.title });
  return res.json({ ok: true });
});

/** Save a new display order: ids first-to-last. */
router.post('/reorder', ...guard, async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Send the banner ids in their new order');

  const service = createServiceClient();
  for (const [index, id] of parsed.data.ids.entries()) {
    const { error } = await service.from('home_banners').update({ sort_order: index, updated_by: staff.userId }).eq('id', id);
    if (error) return handleSupabaseError(res, error);
  }

  clearHomeBannerCache();
  await audit(staff, 'banner.reorder', 'home', { ids: parsed.data.ids });
  return res.json({ banners: await listAll() });
});

/** Turn multer's size/format errors into a normal 400 instead of an HTML 500. */
function singleImage(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err?: unknown) => {
    if (err) return sendError(res, 400, 'Image must be a JPG, PNG or WebP up to 2 MB');
    return next();
  });
}

router.post('/image', ...guard, singleImage, async (req, res) => {
  if (!req.file) return sendError(res, 400, 'Choose an image (JPG, PNG or WebP, up to 2 MB)');
  if (!IMAGE_TYPES.has(req.file.mimetype)) return sendError(res, 400, 'Use a JPG, PNG or WebP image');

  const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const path = `home/${randomUUID()}.${ext}`;
  const service = createServiceClient();
  const { error } = await service.storage.from('marketing-banners').upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false,
  });
  if (error) return handleSupabaseError(res, error);
  const { data } = service.storage.from('marketing-banners').getPublicUrl(path);
  return res.status(201).json({ url: data.publicUrl });
});

export default router;
