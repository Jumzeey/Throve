import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import {
  hasIncidentSignal,
  loadLiveEvents,
  mapEventsToTimeline,
  matchesQueue,
  openLabel,
  productUiStatus,
  recordLiveEvent,
  timeLabelFor,
  uiStatusFromRow,
  type AdminLiveDto,
  type LiveQueue,
  type LiveSessionRow,
} from '../lib/admin-live.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { finalizeLiveSessionEnd } from '../lib/live-session-end.js';
import { listModeratorUsernames } from '../lib/live-moderators.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.live;
const MERGE_LIMIT = 300;
const reasonBody = z.object({ reason: z.string().trim().min(3) });

type ReportLite = {
  id: string;
  live_session_id: string;
  kind: string;
  target_username: string | null;
  status: string;
  details: string | null;
  created_at: string;
};

type ProductLite = {
  id: string;
  live_session_id: string;
  listing_id: string;
  live_price: number;
  stock: number;
  reserved_count: number;
  sold_count: number;
  is_pinned: boolean;
  sort_order: number;
};

async function fetchUsernameMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, { username: string; canHost: boolean }>();
  if (!unique.length) return out;
  const service = createServiceClient();
  const { data, error } = await service.from('profiles').select('id, username, can_host_live').in('id', unique);
  if (error) throw error;
  for (const r of data ?? []) {
    out.set(String(r.id), {
      username: String(r.username),
      canHost: Boolean(r.can_host_live),
    });
  }
  return out;
}

function reasonLabel(kind: string, details?: string | null) {
  if (details?.trim()) return details.trim();
  if (kind === 'listing') return 'Reported live listing';
  if (kind === 'user') return 'Reported live commenter';
  return 'Reported live session';
}

async function loadSideData(sessionIds: string[]) {
  const service = createServiceClient();
  if (!sessionIds.length) {
    return {
      reportsBySession: new Map<string, ReportLite[]>(),
      productsBySession: new Map<string, ProductLite[]>(),
      listingTitles: new Map<string, string>(),
    };
  }

  const [reportsRes, productsRes] = await Promise.all([
    service
      .from('live_reports')
      .select('id, live_session_id, kind, target_username, status, details, created_at')
      .in('live_session_id', sessionIds)
      .order('created_at', { ascending: false }),
    service
      .from('live_stream_products')
      .select(
        'id, live_session_id, listing_id, live_price, stock, reserved_count, sold_count, is_pinned, sort_order',
      )
      .in('live_session_id', sessionIds)
      .order('sort_order', { ascending: true }),
  ]);
  if (reportsRes.error) throw reportsRes.error;
  if (productsRes.error) throw productsRes.error;

  const reportsBySession = new Map<string, ReportLite[]>();
  for (const row of (reportsRes.data ?? []) as ReportLite[]) {
    const list = reportsBySession.get(row.live_session_id) ?? [];
    list.push(row);
    reportsBySession.set(row.live_session_id, list);
  }

  const productsBySession = new Map<string, ProductLite[]>();
  const listingIds = new Set<string>();
  for (const row of (productsRes.data ?? []) as ProductLite[]) {
    const list = productsBySession.get(row.live_session_id) ?? [];
    list.push(row);
    productsBySession.set(row.live_session_id, list);
    if (row.listing_id) listingIds.add(row.listing_id);
  }

  const listingTitles = new Map<string, string>();
  if (listingIds.size) {
    const { data, error } = await service
      .from('listings')
      .select('id, title')
      .in('id', [...listingIds]);
    if (error) throw error;
    for (const l of data ?? []) {
      listingTitles.set(String(l.id), String(l.title ?? 'Listing'));
    }
  }

  return { reportsBySession, productsBySession, listingTitles };
}

function openReportCount(reports: ReportLite[]) {
  return reports.filter((r) => ['open', 'under_review', 'escalated'].includes(String(r.status))).length;
}

function buildDto(
  row: LiveSessionRow,
  host: { username: string; canHost: boolean } | undefined,
  mods: string[],
  reports: ReportLite[],
  products: ProductLite[],
  listingTitles: Map<string, string>,
  timeline: AdminLiveDto['timeline'] = [],
): AdminLiveDto {
  const openReports = openReportCount(reports);
  const status = uiStatusFromRow({
    status: row.status,
    escalated_at: row.escalated_at,
    openReports,
  });
  const endedReason = row.ended_reason;

  const flaggedComments = reports
    .filter((r) => r.kind === 'user')
    .slice(0, 20)
    .map((r) => ({
      id: String(r.id),
      user: r.target_username ?? 'unknown',
      text: '',
      reason: reasonLabel(r.kind, r.details),
      at: openLabel(r.created_at),
      action: undefined as string | undefined,
    }));

  const linkedIncidents = reports.slice(0, 20).map((r) => ({
    id: `live:${r.id}`,
    label: reasonLabel(r.kind, r.details),
    target: r.target_username ? `@${r.target_username}` : undefined,
  }));

  const pinnedProducts = products
    .filter((p) => p.is_pinned)
    .slice(0, 12)
    .map((p) => {
      const available = Math.max(
        0,
        Number(p.stock ?? 0) - Number(p.reserved_count ?? 0) - Number(p.sold_count ?? 0),
      );
      return {
        id: String(p.id),
        title: listingTitles.get(p.listing_id) ?? 'Listing',
        price: Number(p.live_price ?? 0),
        status: productUiStatus(available, Number(p.sold_count ?? 0)),
      };
    });

  const startedAt = row.started_at
    ? openLabel(row.started_at)
    : row.scheduled_at
      ? openLabel(row.scheduled_at)
      : openLabel(row.created_at);

  return {
    id: row.id,
    host: host?.username ?? 'unknown',
    title: row.title?.trim() || 'Untitled live',
    status,
    broadcasting: row.status === 'live',
    viewers: Number(row.viewers ?? 0),
    reports: reports.length,
    startedAt,
    timeLabel: timeLabelFor(row),
    scheduledAt: row.scheduled_at ? openLabel(row.scheduled_at) : undefined,
    hostApproved: Boolean(host?.canHost),
    appointedMods: mods,
    productCount: products.length || Number(row.products_shown ?? 0),
    aiPriority: hasIncidentSignal({ escalated_at: row.escalated_at, openReports })
      ? 'High'
      : 'Normal',
    aiSummary: '',
    aiUnavailable: true,
    evidenceRestricted: true,
    actionTaken: endedReason === 'staff',
    connectionIssue: endedReason === 'connection',
    flaggedComments,
    pinnedProducts,
    linkedIncidents,
    timeline,
  };
}

async function mergeSessions(queue: LiveQueue, q: string): Promise<{
  sessions: AdminLiveDto[];
  counts: Record<LiveQueue, number> & { all: number };
}> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('live_sessions')
    .select(
      'id, host_id, title, status, viewers, scheduled_at, started_at, ended_at, peak_viewers, products_shown, escalated_at, ended_reason, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(MERGE_LIMIT);
  if (error) throw error;

  const rows = (data ?? []) as LiveSessionRow[];
  const hostMap = await fetchUsernameMap(rows.map((r) => r.host_id));
  const { reportsBySession, productsBySession, listingTitles } = await loadSideData(
    rows.map((r) => r.id),
  );

  const modsBySession = new Map<string, string[]>();
  await Promise.all(
    rows.map(async (row) => {
      try {
        const mods = await listModeratorUsernames(row.id);
        modsBySession.set(row.id, mods);
      } catch {
        modsBySession.set(row.id, []);
      }
    }),
  );

  const openBySession = new Map<string, number>();
  for (const row of rows) {
    openBySession.set(row.id, openReportCount(reportsBySession.get(row.id) ?? []));
  }

  const counts = {
    all: rows.length,
    live: rows.filter((r) => r.status === 'live').length,
    upcoming: rows.filter((r) => r.status === 'upcoming').length,
    ended: rows.filter((r) => r.status === 'ended').length,
    incidents: rows.filter((r) =>
      hasIncidentSignal({
        escalated_at: r.escalated_at,
        openReports: openBySession.get(r.id) ?? 0,
      }),
    ).length,
  };

  const qLower = q.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (!matchesQueue(row, queue, openBySession.get(row.id) ?? 0)) return false;
    if (!qLower) return true;
    const host = hostMap.get(row.host_id)?.username ?? '';
    const reports = reportsBySession.get(row.id) ?? [];
    const hay = [
      row.id,
      row.title ?? '',
      host,
      ...reports.map((r) => r.id),
      ...reports.map((r) => r.target_username ?? ''),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(qLower);
  });

  const sessions = filtered.map((row) =>
    buildDto(
      row,
      hostMap.get(row.host_id),
      modsBySession.get(row.id) ?? [],
      reportsBySession.get(row.id) ?? [],
      productsBySession.get(row.id) ?? [],
      listingTitles,
    ),
  );

  return { sessions, counts };
}

async function loadOneSession(id: string): Promise<AdminLiveDto | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('live_sessions')
    .select(
      'id, host_id, title, status, viewers, scheduled_at, started_at, ended_at, peak_viewers, products_shown, escalated_at, ended_reason, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as LiveSessionRow;
  const hostMap = await fetchUsernameMap([row.host_id]);
  const { reportsBySession, productsBySession, listingTitles } = await loadSideData([row.id]);
  let mods: string[] = [];
  try {
    mods = await listModeratorUsernames(row.id);
  } catch {
    mods = [];
  }

  const events = await loadLiveEvents(row.id);
  const actorNames = new Map<string, string>();
  const actorIds = events.map((e) => e.actor_id).filter(Boolean) as string[];
  if (actorIds.length) {
    const { data: actors } = await service.from('profiles').select('id, username').in('id', actorIds);
    for (const a of actors ?? []) actorNames.set(String(a.id), String(a.username));
  }

  const timeline = mapEventsToTimeline(events, actorNames, row);
  return buildDto(
    row,
    hostMap.get(row.host_id),
    mods,
    reportsBySession.get(row.id) ?? [],
    productsBySession.get(row.id) ?? [],
    listingTitles,
    timeline,
  );
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const queue = String(req.query.queue ?? 'live') as LiveQueue;
  const q = String(req.query.q ?? '');
  try {
    const { sessions, counts } = await mergeSessions(queue, q);
    return res.json({ sessions, counts });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const session = await loadOneSession(String(req.params.id));
    if (!session) return sendError(res, 404, 'Session not found');
    return res.json({ session });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

router.post(
  '/:id/note',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const staff = req as StaffRequest;
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');
    const id = String(req.params.id);

    try {
      const existing = await loadOneSession(id);
      if (!existing) return sendError(res, 404, 'Session not found');

      await recordLiveEvent(id, staff.userId, 'note', body.data.reason);
      await writeAdminAudit(createServiceClient(), {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'live.note',
        resourceType: 'live_session',
        resourceId: id,
        reason: body.data.reason,
      });
      const session = await loadOneSession(id);
      return res.json({ session });
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/escalate',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const staff = req as StaffRequest;
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');
    const id = String(req.params.id);

    try {
      const service = createServiceClient();
      const { data: row, error } = await service
        .from('live_sessions')
        .select('id, escalated_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return sendError(res, 404, 'Session not found');
      if (row.escalated_at) {
        return sendError(res, 409, 'Already escalated', 'ALREADY_APPLIED');
      }

      const { error: updErr } = await service
        .from('live_sessions')
        .update({ escalated_at: new Date().toISOString() })
        .eq('id', id)
        .is('escalated_at', null);
      if (updErr) throw updErr;

      await recordLiveEvent(id, staff.userId, 'escalated', body.data.reason);
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'live.escalate',
        resourceType: 'live_session',
        resourceId: id,
        reason: body.data.reason,
        sensitivity: 'High',
      });
      const session = await loadOneSession(id);
      return res.json({ session });
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/end',
  requireStaffAuth,
  requireStaffAction('end_live'),
  async (req, res) => {
    const staff = req as StaffRequest;
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');
    const id = String(req.params.id);

    try {
      const service = createServiceClient();
      const { data: row, error } = await service
        .from('live_sessions')
        .select(
          'id, host_id, title, status, viewers, scheduled_at, started_at, ended_at, peak_viewers, products_shown, escalated_at, ended_reason, created_at',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return sendError(res, 404, 'Session not found');

      if (String(row.status) === 'ended') {
        return sendError(res, 409, 'Session already ended', 'ALREADY_APPLIED');
      }
      if (String(row.status) === 'upcoming') {
        return sendError(res, 409, 'Cannot end an upcoming session', 'CONFLICT');
      }

      const result = await finalizeLiveSessionEnd({
        sessionId: id,
        session: {
          id: String(row.id),
          status: String(row.status),
          ended_at: row.ended_at ? String(row.ended_at) : null,
          peak_viewers: row.peak_viewers != null ? Number(row.peak_viewers) : null,
          viewers: row.viewers != null ? Number(row.viewers) : null,
          products_shown: row.products_shown != null ? Number(row.products_shown) : null,
          started_at: row.started_at ? String(row.started_at) : null,
          title: row.title ? String(row.title) : null,
          host_id: String(row.host_id),
        },
        endedReason: 'staff',
      });

      if (result.alreadyEnded) {
        return sendError(res, 409, 'Session already ended', 'ALREADY_APPLIED');
      }

      await recordLiveEvent(id, staff.userId, 'ended_by_staff', body.data.reason);
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'live.end',
        resourceType: 'live_session',
        resourceId: id,
        reason: body.data.reason,
        sensitivity: 'High',
      });
      const session = await loadOneSession(id);
      return res.json({ session });
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

export default router;
