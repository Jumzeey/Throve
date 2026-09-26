import type { Request, Response, NextFunction } from 'express';
import { refreshExpiredSuspension } from '../lib/admin-users.js';
import { createServiceClient, createSupabaseClient } from '../lib/supabase.js';

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

  // Staff enforcement gate: suspended / banned buyers cannot use the API.
  // Staff accounts are protected from enforcement mutations; still check status.
  try {
    const service = createServiceClient();
    const { data: profile } = await service
      .from('profiles')
      .select('id, account_status, suspended_until, admin_role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile) {
      const status = await refreshExpiredSuspension(service, profile);
      // Staff with admin_role may still access admin even if somehow mistagged;
      // buyer/seller paths remain blocked for suspended/banned non-staff.
      if (!profile.admin_role) {
        if (status === 'banned') {
          return res.status(403).json({
            message: 'This account has been permanently banned',
            code: 'ACCOUNT_BANNED',
          });
        }
        if (status === 'suspended') {
          return res.status(403).json({
            message: 'This account is temporarily suspended',
            code: 'ACCOUNT_SUSPENDED',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[auth] account_status check failed', err instanceof Error ? err.message : err);
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
