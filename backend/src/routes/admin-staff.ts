import { Router, type Response } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { ROUTE_ROLES, type AdminRole } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import { requireStaffAuth, requireStaffRole, type StaffRequest } from '../middleware/staff.js';

/**
 * Staff access management. Only a super admin can grant, change, revoke or remove
 * staff roles (including other super admins). Nobody can change their own access,
 * so the acting super admin always keeps theirs.
 */
const router = Router();
const routeRoles = ROUTE_ROLES.staff;

const ROLES = ['super_admin', 'trust_safety', 'support', 'finance'] as const;
const roleSchema = z.enum(ROLES);
const reasonSchema = z.string().trim().min(3);

const STAFF_COLUMNS =
  'id, name, username, email, admin_role, admin_active, account_status, deactivated, last_seen_at, created_at';

type StaffRow = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  admin_role: AdminRole | null;
  admin_active: boolean | null;
  account_status: string | null;
  deactivated: boolean | null;
  last_seen_at: string | null;
  created_at: string;
};

function mapStaff(row: StaffRow) {
  return {
    id: row.id,
    name: row.name ?? '',
    username: row.username,
    email: row.email,
    role: row.admin_role,
    active: row.admin_role != null && row.admin_active !== false,
    accountStatus: row.account_status ?? 'active',
    deactivated: Boolean(row.deactivated),
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

async function loadProfile(id: string) {
  const { data, error } = await createServiceClient()
    .from('profiles')
    .select(STAFF_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as StaffRow | null;
}

/** Shared guard for every mutation: target exists, is not the actor, and can hold access. */
async function loadTarget(req: StaffRequest, res: Response, id: string) {
  if (id === req.userId) {
    sendError(res, 400, 'You cannot change your own staff access. Ask another super admin.', 'SELF_CHANGE');
    return null;
  }
  const target = await loadProfile(id);
  if (!target) {
    sendError(res, 404, 'User not found', 'NOT_FOUND');
    return null;
  }
  return target;
}

function canHoldAccess(target: StaffRow) {
  return !target.deactivated && !['suspended', 'banned'].includes(target.account_status ?? 'active');
}

async function audit(req: StaffRequest, action: string, targetId: string, reason: string, meta: Record<string, unknown>) {
  await writeAdminAudit(createServiceClient(), {
    actorId: req.userId,
    actorRole: req.adminRole,
    action,
    resourceType: 'staff',
    resourceId: targetId,
    reason,
    meta,
    sensitivity: 'Access',
  });
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (_req, res) => {
  const { data, error } = await createServiceClient()
    .from('profiles')
    .select(STAFF_COLUMNS)
    .not('admin_role', 'is', null)
    .order('created_at', { ascending: true });
  if (error) return handleSupabaseError(res, error);
  return res.json({ staff: ((data ?? []) as StaffRow[]).map(mapStaff) });
});

/** Find an existing Throve account by email or username to grant access to. */
router.get('/lookup', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const q = String(req.query.q ?? '').trim().replace(/^@/, '');
  if (q.length < 3) return sendError(res, 400, 'Enter an email or username');
  const column = q.includes('@') ? 'email' : 'username';
  const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const { data, error } = await createServiceClient()
    .from('profiles')
    .select(STAFF_COLUMNS)
    .ilike(column, escaped)
    .limit(1);
  if (error) return handleSupabaseError(res, error);
  const row = (data?.[0] as StaffRow | undefined) ?? null;
  if (!row) return sendError(res, 404, 'No Throve account matches that email or username', 'NOT_FOUND');
  return res.json({ user: mapStaff(row) });
});

/** Grant a role to someone who is not staff yet, or change an existing staff member's role. */
router.post('/:id/role', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = z.object({ role: roleSchema, reason: reasonSchema }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Role and a reason (min 3 chars) are required');

  const target = await loadTarget(staff, res, String(req.params.id));
  if (!target) return;
  if (!canHoldAccess(target)) {
    return sendError(res, 400, 'Deactivated, suspended or banned accounts cannot be given staff access', 'NOT_ELIGIBLE');
  }
  if (target.admin_role === parsed.data.role && target.admin_active !== false) {
    return sendError(res, 409, 'This person already has that role', 'ALREADY_APPLIED');
  }

  const { error } = await createServiceClient()
    .from('profiles')
    .update({ admin_role: parsed.data.role, admin_active: true })
    .eq('id', target.id);
  if (error) return handleSupabaseError(res, error);

  const granted = target.admin_role == null;
  await audit(staff, granted ? 'staff.grant' : 'staff.change_role', target.id, parsed.data.reason, {
    from: target.admin_role,
    to: parsed.data.role,
    wasActive: target.admin_active !== false,
  });

  const updated = await loadProfile(target.id);
  return res.json({ user: updated ? mapStaff(updated) : null });
});

/** Turn off console access but keep the role on record (can be restored). */
router.post('/:id/revoke', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = z.object({ reason: reasonSchema }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

  const target = await loadTarget(staff, res, String(req.params.id));
  if (!target) return;
  if (!target.admin_role) return sendError(res, 400, 'This person is not staff', 'NOT_STAFF');
  if (target.admin_active === false) return sendError(res, 409, 'Access is already revoked', 'ALREADY_APPLIED');

  const { error } = await createServiceClient()
    .from('profiles')
    .update({ admin_active: false })
    .eq('id', target.id);
  if (error) return handleSupabaseError(res, error);

  await audit(staff, 'staff.revoke', target.id, parsed.data.reason, { role: target.admin_role });
  const updated = await loadProfile(target.id);
  return res.json({ user: updated ? mapStaff(updated) : null });
});

router.post('/:id/restore', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = z.object({ reason: reasonSchema }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

  const target = await loadTarget(staff, res, String(req.params.id));
  if (!target) return;
  if (!target.admin_role) return sendError(res, 400, 'This person is not staff', 'NOT_STAFF');
  if (target.admin_active !== false) return sendError(res, 409, 'Access is already active', 'ALREADY_APPLIED');
  if (!canHoldAccess(target)) {
    return sendError(res, 400, 'Deactivated, suspended or banned accounts cannot be given staff access', 'NOT_ELIGIBLE');
  }

  const { error } = await createServiceClient()
    .from('profiles')
    .update({ admin_active: true })
    .eq('id', target.id);
  if (error) return handleSupabaseError(res, error);

  await audit(staff, 'staff.restore', target.id, parsed.data.reason, { role: target.admin_role });
  const updated = await loadProfile(target.id);
  return res.json({ user: updated ? mapStaff(updated) : null });
});

/** Remove the staff role entirely; the account goes back to being a normal customer. */
router.delete('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = z.object({ reason: reasonSchema }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

  const target = await loadTarget(staff, res, String(req.params.id));
  if (!target) return;
  if (!target.admin_role) return sendError(res, 400, 'This person is not staff', 'NOT_STAFF');

  const { error } = await createServiceClient()
    .from('profiles')
    .update({ admin_role: null, admin_active: true })
    .eq('id', target.id);
  if (error) return handleSupabaseError(res, error);

  await audit(staff, 'staff.remove', target.id, parsed.data.reason, { role: target.admin_role });
  return res.json({ ok: true });
});

export default router;
