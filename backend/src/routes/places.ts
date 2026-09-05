import { Router } from 'express';
import { z } from 'zod';
import { sendError } from '../lib/errors.js';
import {
  placeDetails,
  placesAutocomplete,
  placesConfigured,
  reverseGeocode,
  staticMapUrl,
} from '../lib/places/google.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/config', optionalAuth, (_req, res) => {
  return res.json({
    enabled: placesConfigured(),
    provider: 'google',
  });
});

router.post('/session', requireAuth, (_req, res) => {
  return res.json({ sessionToken: randomUUID() });
});

router.get('/autocomplete', requireAuth, async (req, res) => {
  if (!placesConfigured()) return sendError(res, 503, 'Google Maps is not configured');
  const parsed = z
    .object({
      q: z.string().min(2).max(200),
      sessionToken: z.string().optional(),
      regionCode: z.string().length(2).optional(),
    })
    .safeParse(req.query);
  if (!parsed.success) return sendError(res, 400, 'Enter at least 2 characters');

  try {
    const suggestions = await placesAutocomplete(parsed.data.q, {
      sessionToken: parsed.data.sessionToken,
      regionCode: parsed.data.regionCode?.toUpperCase(),
    });
    return res.json({ suggestions });
  } catch (err) {
    return sendError(res, 502, err instanceof Error ? err.message : 'Places search failed');
  }
});

router.get('/details/:placeId', requireAuth, async (req, res) => {
  if (!placesConfigured()) return sendError(res, 503, 'Google Maps is not configured');
  const placeId = String(req.params.placeId ?? '');
  if (!placeId) return sendError(res, 400, 'Missing place id');
  const sessionToken = typeof req.query.sessionToken === 'string' ? req.query.sessionToken : undefined;
  try {
    const place = await placeDetails(placeId, sessionToken);
    return res.json({ place });
  } catch (err) {
    return sendError(res, 502, err instanceof Error ? err.message : 'Place details failed');
  }
});

router.post('/reverse', requireAuth, async (req, res) => {
  if (!placesConfigured()) return sendError(res, 503, 'Google Maps is not configured');
  const parsed = z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Invalid coordinates');

  try {
    const place = await reverseGeocode(parsed.data.lat, parsed.data.lng);
    return res.json({ place });
  } catch (err) {
    return sendError(res, 502, err instanceof Error ? err.message : 'Could not resolve location');
  }
});

router.get('/static-map', requireAuth, async (req, res) => {
  if (!placesConfigured()) return sendError(res, 503, 'Google Maps is not configured');
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return sendError(res, 400, 'Invalid coordinates');

  try {
    const upstream = await fetch(staticMapUrl(lat, lng));
    if (!upstream.ok) return sendError(res, 502, 'Map unavailable');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(buffer);
  } catch (err) {
    return sendError(res, 502, err instanceof Error ? err.message : 'Map unavailable');
  }
});

export default router;
