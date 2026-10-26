import { Router } from 'express';
import { handleSupabaseError } from '../lib/errors.js';
import { bannerIsLive, mapHomeBanner, type HomeBannerDto } from '../lib/home-banners.js';
import type { DbRow } from '../lib/db-types.js';
import { createServiceClient } from '../lib/supabase.js';

const router = Router();

// Every app open hits this; a short cache keeps Home fast without delaying admin edits much.
const CACHE_MS = 60_000;
let cache: { at: number; banners: HomeBannerDto[] } | null = null;

export function clearHomeBannerCache() {
  cache = null;
}

/** Live home carousel slides, in display order. Public. */
router.get('/banners', async (_req, res) => {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(cache.banners);
  }
  const { data, error } = await createServiceClient()
    .from('home_banners')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return handleSupabaseError(res, error);

  const now = Date.now();
  const banners = ((data ?? []) as DbRow[])
    .filter((row) => bannerIsLive(row as { active: boolean }, now))
    .map(mapHomeBanner);
  cache = { at: now, banners };
  res.set('Cache-Control', 'public, max-age=60');
  return res.json(banners);
});

export default router;
