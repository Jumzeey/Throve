import type { NextFunction, Response } from 'express';
import { getProfileById } from '../lib/mappers.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from './auth.js';

export type AdminRole = 'super_admin' | 'trust_safety' | 'support' | 'finance';

export type StaffRequest = AuthedRequest & {
  adminRole: AdminRole;
};

export async function requireStaff(req: AuthedRequest, res: Response, next: NextFunction) {
  const profile = await getProfileById(req.supabase, req.userId);
  const role = profile?.admin_role ?? null;
  if (!role || profile?.admin_active === false) {
    return res.status(403).json({
      message: profile?.admin_role && profile.admin_active === false
        ? 'Your access to Throve Admin is no longer active'
        : 'Staff access required',
      code: profile?.admin_role && profile.admin_active === false ? 'ACCESS_REVOKED' : 'FORBIDDEN',
    });
  }
  (req as StaffRequest).adminRole = role;
  return next();
}

export function requireStaffAuth(req: Parameters<typeof requireAuth>[0], res: Response, next: NextFunction) {
  return requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    return requireStaff(req as AuthedRequest, res, next);
  });
}

export function staffCanModerateListings(role: AdminRole) {
  return role === 'super_admin' || role === 'trust_safety';
}

export async function loadStaffProfile(userId: string) {
  const service = createServiceClient();
  return getProfileById(service, userId);
}
