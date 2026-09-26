import type { NextFunction, Request, Response } from 'express';
import { writeAdminAudit } from '../lib/admin-audit.js';
import { getProfileById } from '../lib/mappers.js';
import {
  canStaffAct,
  staffCanModerateListings,
  type AdminRole,
  type StaffAction,
} from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from './auth.js';

export type { AdminRole, StaffAction };
export { staffCanModerateListings };

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

export function requireStaffAuth(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    return requireStaff(req as AuthedRequest, res, next);
  });
}

/** 403 unless the staff role is one of the allowed roles. Use after requireStaffAuth. */
export function requireStaffRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { adminRole } = req as StaffRequest;
    if (!adminRole || !roles.includes(adminRole)) {
      return res.status(403).json({
        message: 'You do not have permission for this action',
        code: 'FORBIDDEN',
      });
    }
    return next();
  };
}

/** 403 unless the staff role may perform the named action (see staff-rbac ACTION_ROLES). */
export function requireStaffAction(action: StaffAction) {
  return (req: Request, res: Response, next: NextFunction) => {
    const staff = req as StaffRequest;
    const { adminRole, userId } = staff;
    if (!adminRole || !canStaffAct(adminRole, action)) {
      if (adminRole && userId) {
        void writeAdminAudit(createServiceClient(), {
          actorId: userId,
          actorRole: adminRole,
          action: `${action}.denied`,
          resourceType: 'access',
          resourceId: action,
          reason: 'Role not permitted',
          sensitivity: 'Access',
          meta: { result: 'denied', attemptedAction: action },
        });
      }
      return res.status(403).json({
        message: 'You do not have permission for this action',
        code: 'FORBIDDEN',
      });
    }
    return next();
  };
}

export async function loadStaffProfile(userId: string) {
  const service = createServiceClient();
  return getProfileById(service, userId);
}
