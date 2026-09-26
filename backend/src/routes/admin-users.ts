import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import {
  assertNotStaffTarget,
  deriveKycStatus,
  deriveLiveHost,
  formatAt,
  hideSellerListings,
  openJoined,
  recordUserEvent,
  refreshExpiredSuspension,
  uiStatusFromProfile,
  type AccountStatus,
  type UserEventAction,
} from '../lib/admin-users.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { getSellerMap } from '../lib/mappers.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.users;

const reasonBody = z.object({ reason: z.string().trim().min(3) });
const suspendBody = z.object({
  reason: z.string().trim().min(3),
  until: z.string().datetime().optional().nullable(),
});

const EVENT_TITLES: Record<UserEventAction, string> = {
  note: 'Internal note added',
  escalated: 'Escalated',
  restricted: 'Account restricted',
  unrestricted: 'Restriction lifted',
  suspended: 'Account suspended',
  unsuspended: 'Suspension lifted',
  ban_recommended: 'Permanent ban recommended',
  banned: 'Permanently banned',
  unbanned: 'Ban lifted',
  approve_host: 'Live host approved',
  revoke_host: 'Live host revoked',
};

async function loadUserHistory(userId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('user_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const names = await getSellerMap(
    service,
    [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[],
  );

  return rows.map((row) => {
    const by = row.actor_id ? names.get(String(row.actor_id)) : null;
    const parts = [
      EVENT_TITLES[row.action as UserEventAction] ?? String(row.action),
      by ? `@${by}` : null,
      row.reason ? String(row.reason) : null,
    ].filter(Boolean);
    return {
      at: formatAt(String(row.created_at)),
      text: parts.join(' · '),
    };
  });
}

async function relatedForUser(userId: string, username: string) {
  const service = createServiceClient();
  const [chatRes, liveRes, orderIdsRes, listingsRes, ordersSold, ordersBought] = await Promise.all([
    service
      .from('chat_reports')
      .select('id, kind, target_username, created_at')
      .or(`target_username.eq.${username},reporter_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20),
    service
      .from('live_reports')
      .select('id, kind, target_username, created_at')
      .or(`target_username.eq.${username},reporter_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20),
    service.from('orders').select('id').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).limit(100),
    service.from('listings').select('id, status').eq('seller_id', userId),
    service.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', userId),
    service.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', userId),
  ]);

  const relatedReports: string[] = [];
  for (const r of chatRes.data ?? []) {
    relatedReports.push(`CHAT-${String(r.id).slice(0, 8)} · ${r.kind}`);
  }
  for (const r of liveRes.data ?? []) {
    relatedReports.push(`LIVE-${String(r.id).slice(0, 8)} · ${r.kind}`);
  }

  const orderIds = (orderIdsRes.data ?? []).map((o) => String(o.id));
  let disputeRows: { id: string; status: string; order_id: string }[] = [];
  if (orderIds.length) {
    const { data: disputes } = await service
      .from('order_disputes')
      .select('id, status, order_id')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })
      .limit(20);
    disputeRows = (disputes ?? []).map((d) => ({
      id: String(d.id),
      status: String(d.status),
      order_id: String(d.order_id),
    }));
  }

  const relatedDisputes = disputeRows.map((d) => `${d.id.slice(0, 8)} · ${d.status}`);

  const listings = listingsRes.data ?? [];
  const listingsActive = listings.filter((l) =>
    ['available', 'pending_review', 'reserved'].includes(String(l.status)),
  ).length;
  const listingsHidden = listings.filter((l) => String(l.status) === 'hidden').length;

  return {
    relatedReports,
    relatedDisputes,
    listingsActive,
    listingsHidden,
    ordersSold: ordersSold.count ?? 0,
    ordersBought: ordersBought.count ?? 0,
    reportCount: relatedReports.length,
    openDisputeCount: disputeRows.filter((d) =>
      ['open', 'under_review'].includes(d.status),
    ).length,
  };
}

function mapAdminUser(
  row: Record<string, unknown>,
  extras: {
    relatedReports: string[];
    relatedDisputes: string[];
    listingsActive: number;
    listingsHidden: number;
    ordersSold: number;
    ordersBought: number;
    reportCount: number;
    openDisputeCount: number;
    history?: { at: string; text: string }[];
    recommenderName?: string | null;
  },
) {
  const seller = extras.ordersSold > 0 || extras.listingsActive > 0 || extras.listingsHidden > 0;
  const payoutVerified = Boolean(row.payout_verified);
  const canHost = Boolean(row.can_host_live);
  const kycStatus = deriveKycStatus(seller, payoutVerified);
  const liveHost = deriveLiveHost(canHost);
  const status = uiStatusFromProfile({
    account_status: row.account_status ? String(row.account_status) : 'active',
    deactivated: Boolean(row.deactivated),
  });

  const flags = extras.reportCount + extras.openDisputeCount;

  let banRecommendation:
    | { by: string; role: string; reason: string; at: string }
    | undefined;
  if (row.ban_recommended_at && row.ban_recommendation_reason) {
    banRecommendation = {
      by: extras.recommenderName ?? 'Staff',
      role: 'Trust & Safety',
      reason: String(row.ban_recommendation_reason),
      at: formatAt(String(row.ban_recommended_at)),
    };
  }

  return {
    id: String(row.id),
    username: String(row.username ?? 'unknown'),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    status,
    dbStatus: String(row.account_status ?? 'active'),
    seller,
    payoutVerified,
    kycStatus,
    payoutAccountMasked: 'Not on file',
    liveHost,
    flags,
    listingsActive: extras.listingsActive,
    listingsHidden: extras.listingsHidden,
    ordersSold: extras.ordersSold,
    ordersBought: extras.ordersBought,
    streams: 0,
    location: row.location ? String(row.location) : undefined,
    joined: openJoined(String(row.created_at)),
    department: '—',
    aiPriority: flags >= 3 ? ('High' as const) : ('Med' as const),
    aiSummary: '',
    relatedReports: extras.relatedReports,
    relatedDisputes: extras.relatedDisputes,
    history: extras.history ?? [],
    banRecommendation,
  };
}

async function enrichProfile(row: Record<string, unknown>, withHistory: boolean) {
  const service = createServiceClient();
  await refreshExpiredSuspension(service, {
    id: String(row.id),
    account_status: row.account_status ? String(row.account_status) : 'active',
    suspended_until: row.suspended_until ? String(row.suspended_until) : null,
  });

  // Re-read if suspension may have cleared
  if (row.account_status === 'suspended' && row.suspended_until) {
    const { data: fresh } = await service.from('profiles').select('*').eq('id', row.id).maybeSingle();
    if (fresh) row = fresh as Record<string, unknown>;
  }

  const username = String(row.username ?? '');
  const related = await relatedForUser(String(row.id), username);

  let recommenderName: string | null = null;
  if (row.ban_recommended_by) {
    const map = await getSellerMap(service, [String(row.ban_recommended_by)]);
    recommenderName = map.get(String(row.ban_recommended_by)) ?? null;
  }

  const history = withHistory ? await loadUserHistory(String(row.id)) : [];

  return mapAdminUser(row, {
    ...related,
    history,
    recommenderName,
  });
}

async function loadUserDetail(userId: string) {
  const service = createServiceClient();
  const { data: row, error } = await service.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const user = await enrichProfile(row as Record<string, unknown>, true);
  return { user };
}

async function setAccountStatus(
  userId: string,
  actorId: string,
  next: AccountStatus,
  reason: string,
  event: UserEventAction,
  extras?: { suspendedUntil?: string | null; clearBanRec?: boolean; hideListings?: boolean },
) {
  const service = createServiceClient();
  const patch: Record<string, unknown> = {
    account_status: next,
    account_status_reason: reason,
    account_status_changed_at: new Date().toISOString(),
    account_status_changed_by: actorId,
  };
  if (next === 'suspended') {
    patch.suspended_until = extras?.suspendedUntil ?? null;
  } else {
    patch.suspended_until = null;
  }
  if (extras?.clearBanRec || next === 'banned' || next === 'active') {
    if (next === 'banned' || extras?.clearBanRec) {
      patch.ban_recommended_at = null;
      patch.ban_recommended_by = null;
      patch.ban_recommendation_reason = null;
    }
  }

  const { error } = await service.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;

  if (extras?.hideListings) {
    await hideSellerListings(service, userId);
  }

  await recordUserEvent(userId, actorId, event, reason);
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  const service = createServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return handleSupabaseError(res, error);

  let users: Awaited<ReturnType<typeof enrichProfile>>[];
  try {
    users = await Promise.all(
      ((data ?? []) as Record<string, unknown>[]).map((row) => enrichProfile(row, false)),
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string });
    }
    return sendError(res, 500, 'Could not load users');
  }

  const counts = {
    all: users.length,
    flagged: users.filter((u) => u.flags > 0).length,
    restricted: users.filter((u) => u.status === 'Restricted' || u.status === 'Suspended').length,
    sellers: users.filter((u) => u.seller).length,
    hosts: users.filter((u) => u.liveHost !== 'None').length,
    kyc: users.filter((u) => u.kycStatus === 'Pending' || u.kycStatus === 'Failed' || u.kycStatus === 'Rejected')
      .length,
  };

  let filtered = users;
  if (filter === 'flagged') filtered = users.filter((u) => u.flags > 0);
  else if (filter === 'restricted') {
    filtered = users.filter((u) => u.status === 'Restricted' || u.status === 'Suspended');
  } else if (filter === 'sellers') filtered = users.filter((u) => u.seller);
  else if (filter === 'hosts') filtered = users.filter((u) => u.liveHost !== 'None');
  else if (filter === 'kyc') {
    filtered = users.filter(
      (u) => u.kycStatus === 'Pending' || u.kycStatus === 'Failed' || u.kycStatus === 'Rejected',
    );
  }

  if (q) {
    filtered = filtered.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }

  return res.json({ users: filtered, counts });
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const payload = await loadUserDetail(String(req.params.id));
    if (!payload) return sendError(res, 404, 'User not found', 'NOT_FOUND');
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string });
    }
    return sendError(res, 500, 'Could not load user');
  }
});

async function loadTargetOr404(userId: string, res: import('express').Response) {
  const service = createServiceClient();
  const { data, error } = await service.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    handleSupabaseError(res, error);
    return null;
  }
  if (!data) {
    sendError(res, 404, 'User not found', 'NOT_FOUND');
    return null;
  }
  return data as Record<string, unknown>;
}

router.post('/:id/note', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const targetId = String(req.params.id);
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

  const target = await loadTargetOr404(targetId, res);
  if (!target) return;

  await recordUserEvent(targetId, userId, 'note', parsed.data.reason);
  void writeAdminAudit(createServiceClient(), {
    actorId: userId,
    actorRole: adminRole,
    action: 'user.note',
    resourceType: 'user',
    resourceId: targetId,
    reason: parsed.data.reason,
    sensitivity: 'Standard',
  });

  const payload = await loadUserDetail(targetId);
  return res.json(payload);
});

router.post('/:id/escalate', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const targetId = String(req.params.id);
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

  const target = await loadTargetOr404(targetId, res);
  if (!target) return;

  await recordUserEvent(targetId, userId, 'escalated', parsed.data.reason);
  void writeAdminAudit(createServiceClient(), {
    actorId: userId,
    actorRole: adminRole,
    action: 'user.escalate',
    resourceType: 'user',
    resourceId: targetId,
    reason: parsed.data.reason,
    sensitivity: 'High',
  });

  const payload = await loadUserDetail(targetId);
  return res.json(payload);
});

router.post(
  '/:id/restrict',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('restrict_user'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    const staffCheck = await assertNotStaffTarget(target as { admin_role?: string | null });
    if (!staffCheck.ok) return sendError(res, 403, staffCheck.message, 'FORBIDDEN');
    if (String(target.account_status) === 'restricted') {
      return sendError(res, 409, 'Account already restricted', 'ALREADY_APPLIED');
    }
    if (String(target.account_status) === 'banned') {
      return sendError(res, 409, 'Account is banned', 'CONFLICT');
    }

    try {
      await setAccountStatus(targetId, userId, 'restricted', parsed.data.reason, 'restricted', {
        hideListings: true,
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Could not restrict account');
    }

    void writeAdminAudit(createServiceClient(), {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.restrict',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'High',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/unrestrict',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('restrict_user'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    const staffCheck = await assertNotStaffTarget(target as { admin_role?: string | null });
    if (!staffCheck.ok) return sendError(res, 403, staffCheck.message, 'FORBIDDEN');
    if (String(target.account_status) !== 'restricted') {
      return sendError(res, 409, 'Account is not restricted', 'ALREADY_APPLIED');
    }

    try {
      await setAccountStatus(targetId, userId, 'active', parsed.data.reason, 'unrestricted');
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Could not unrestrict account');
    }

    void writeAdminAudit(createServiceClient(), {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.unrestrict',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'High',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/suspend',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('suspend_user'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = suspendBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    const staffCheck = await assertNotStaffTarget(target as { admin_role?: string | null });
    if (!staffCheck.ok) return sendError(res, 403, staffCheck.message, 'FORBIDDEN');
    if (String(target.account_status) === 'suspended') {
      return sendError(res, 409, 'Account already suspended', 'ALREADY_APPLIED');
    }
    if (String(target.account_status) === 'banned') {
      return sendError(res, 409, 'Account is banned', 'CONFLICT');
    }

    try {
      await setAccountStatus(targetId, userId, 'suspended', parsed.data.reason, 'suspended', {
        suspendedUntil: parsed.data.until ?? null,
        hideListings: true,
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Could not suspend account');
    }

    void writeAdminAudit(createServiceClient(), {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.suspend',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'High',
      meta: { until: parsed.data.until ?? null },
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/unsuspend',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('suspend_user'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    const staffCheck = await assertNotStaffTarget(target as { admin_role?: string | null });
    if (!staffCheck.ok) return sendError(res, 403, staffCheck.message, 'FORBIDDEN');
    if (String(target.account_status) !== 'suspended') {
      return sendError(res, 409, 'Account is not suspended', 'ALREADY_APPLIED');
    }

    try {
      await setAccountStatus(targetId, userId, 'active', parsed.data.reason, 'unsuspended');
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Could not unsuspend account');
    }

    void writeAdminAudit(createServiceClient(), {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.unsuspend',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'High',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/recommend-ban',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('recommend_ban'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    const staffCheck = await assertNotStaffTarget(target as { admin_role?: string | null });
    if (!staffCheck.ok) return sendError(res, 403, staffCheck.message, 'FORBIDDEN');
    if (String(target.account_status) === 'banned') {
      return sendError(res, 409, 'Account already banned', 'ALREADY_APPLIED');
    }

    const service = createServiceClient();
    const { error } = await service
      .from('profiles')
      .update({
        ban_recommended_at: new Date().toISOString(),
        ban_recommended_by: userId,
        ban_recommendation_reason: parsed.data.reason,
      })
      .eq('id', targetId);
    if (error) return handleSupabaseError(res, error);

    await recordUserEvent(targetId, userId, 'ban_recommended', parsed.data.reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.recommend_ban',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'High',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/ban',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('ban_user'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    const staffCheck = await assertNotStaffTarget(target as { admin_role?: string | null });
    if (!staffCheck.ok) return sendError(res, 403, staffCheck.message, 'FORBIDDEN');
    if (String(target.account_status) === 'banned') {
      return sendError(res, 409, 'Account already banned', 'ALREADY_APPLIED');
    }

    try {
      await setAccountStatus(targetId, userId, 'banned', parsed.data.reason, 'banned', {
        hideListings: true,
        clearBanRec: true,
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Could not ban account');
    }

    void writeAdminAudit(createServiceClient(), {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.ban',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'High',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/unban',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('ban_user'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    const staffCheck = await assertNotStaffTarget(target as { admin_role?: string | null });
    if (!staffCheck.ok) return sendError(res, 403, staffCheck.message, 'FORBIDDEN');
    if (String(target.account_status) !== 'banned') {
      return sendError(res, 409, 'Account is not banned', 'ALREADY_APPLIED');
    }

    try {
      await setAccountStatus(targetId, userId, 'active', parsed.data.reason, 'unbanned');
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        return handleSupabaseError(res, err as { message: string });
      }
      return sendError(res, 500, 'Could not unban account');
    }

    void writeAdminAudit(createServiceClient(), {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.unban',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'High',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/approve-host',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('approve_live_host'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body ?? { reason: 'Approve live host' });
    const reason = parsed.success ? parsed.data.reason : 'Approve live host';

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    if (target.can_host_live) {
      return sendError(res, 409, 'Already approved as live host', 'ALREADY_APPLIED');
    }

    const service = createServiceClient();
    const { error } = await service
      .from('profiles')
      .update({ can_host_live: true })
      .eq('id', targetId);
    if (error) return handleSupabaseError(res, error);

    await recordUserEvent(targetId, userId, 'approve_host', reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.approve_host',
      resourceType: 'user',
      resourceId: targetId,
      reason,
      sensitivity: 'Standard',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

router.post(
  '/:id/revoke-host',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  requireStaffAction('approve_live_host'),
  async (req, res) => {
    const { userId, adminRole } = req as StaffRequest;
    const targetId = String(req.params.id);
    const parsed = reasonBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Reason is required (min 3 chars)');

    const target = await loadTargetOr404(targetId, res);
    if (!target) return;
    if (!target.can_host_live) {
      return sendError(res, 409, 'User is not a live host', 'ALREADY_APPLIED');
    }

    const service = createServiceClient();
    const { error } = await service
      .from('profiles')
      .update({ can_host_live: false })
      .eq('id', targetId);
    if (error) return handleSupabaseError(res, error);

    await recordUserEvent(targetId, userId, 'revoke_host', parsed.data.reason);
    void writeAdminAudit(service, {
      actorId: userId,
      actorRole: adminRole,
      action: 'user.revoke_host',
      resourceType: 'user',
      resourceId: targetId,
      reason: parsed.data.reason,
      sensitivity: 'Standard',
    });

    return res.json(await loadUserDetail(targetId));
  },
);

export default router;
