import type { Request, Response, NextFunction } from 'express';
import { createSupabaseClient } from '../lib/supabase.js';

export type AuthedRequest = Request & {
  accessToken: string;
  userId: string;
  supabase: ReturnType<typeof createSupabaseClient>;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token', code: 'UNAUTHORIZED' });
  }

  const accessToken = header.slice(7);
  const supabase = createSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return res.status(401).json({ message: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }

  const authed = req as AuthedRequest;
  authed.accessToken = accessToken;
  authed.userId = data.user.id;
  authed.supabase = supabase;
  return next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  const accessToken = header.slice(7);
  const supabase = createSupabaseClient(accessToken);
  const { data } = await supabase.auth.getUser(accessToken);

  if (data.user) {
    const authed = req as AuthedRequest;
    authed.accessToken = accessToken;
    authed.userId = data.user.id;
    authed.supabase = supabase;
  }

  return next();
}
