import { Router } from 'express';
import { buildBadges, buildDashboard, type OpsQueueTab } from '../lib/admin-ops.js';
import { handleSupabaseError } from '../lib/errors.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import {
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.operations;

function parseTab(raw: unknown): OpsQueueTab {
  if (raw === 'all' || raw === 'evidence' || raw === 'urgent') return raw;
  return 'urgent';
}

router.get('/badges', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  try {
    const badges = await buildBadges(staff.adminRole);
    return res.json(badges);
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

router.get('/dashboard', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const tab = parseTab(req.query.tab);
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  try {
    const payload = await buildDashboard(
      { userId: staff.userId, adminRole: staff.adminRole },
      { tab, q },
    );
    return res.json(payload);
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

export default router;
