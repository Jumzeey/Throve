import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import {
  ageLabel,
  categoryFor,
  compositeId,
  computeCounts,
  fetchUsernameMap,
  loadReportEvents,
  mapEventsToHistory,
  matchesQueue,
  objectKeyForChat,
  objectKeyForLive,
  openLabel,
  parseCompositeId,
  reasonLabel,
  recordReportEvent,
  routeForChat,
  routeForLive,
  uiStatusFromDb,
  type AdminReportDto,
  type ChatReportRow,
  type LiveReportRow,
  type ReportDbStatus,
  type ReportQueue,
  type ReportSource,
} from '../lib/admin-reports.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.reports;
const MERGE_LIMIT = 300;

const reasonBody = z.object({ reason: z.string().trim().min(3) });
const assignBody = z.object({
  reason: z.string().trim().min(3).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
});
const associateBody = z.object({
  reason: z.string().trim().min(3),
  linkedReportIds: z.array(z.string().trim().min(1)).min(1).optional(),
});

type SessionMeta = {
  id: string;
  title: string | null;
  host_id: string;
};

type ListingMeta = {
  id: string;
  title: string | null;
  seller_id: string;
};

async function loadJoinMaps(chat: ChatReportRow[], live: LiveReportRow[]) {
  const service = createServiceClient();
  const profileIds = [
    ...chat.map((r) => r.reporter_id),
    ...chat.map((r) => r.assignee_id).filter(Boolean) as string[],
    ...live.map((r) => r.reporter_id),
    ...live.map((r) => r.assignee_id).filter(Boolean) as string[],
  ];
  const sessionIds = [...new Set(live.map((r) => r.live_session_id))];
  const listingIds = [
    ...new Set(live.map((r) => r.listing_id).filter(Boolean) as string[]),
  ];

  const [names, sessionsRes, listingsRes] = await Promise.all([
    fetchUsernameMap(service, profileIds),
    sessionIds.length
      ? service.from('live_sessions').select('id, title, host_id').in('id', sessionIds)
      : Promise.resolve({ data: [] as SessionMeta[], error: null }),
    listingIds.length
      ? service.from('listings').select('id, title, seller_id').in('id', listingIds)
      : Promise.resolve({ data: [] as ListingMeta[], error: null }),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  if (listingsRes.error) throw listingsRes.error;

  const sessions = new Map(
    (sessionsRes.data ?? []).map((s) => [String(s.id), s as SessionMeta]),
  );
  const listings = new Map(
    (listingsRes.data ?? []).map((l) => [String(l.id), l as ListingMeta]),
  );

  const hostIds = [...new Set([...sessions.values()].map((s) => s.host_id))];
  const sellerIds = [...new Set([...listings.values()].map((l) => l.seller_id))];
  const moreNames = await fetchUsernameMap(service, [...hostIds, ...sellerIds]);
  for (const [k, v] of moreNames) names.set(k, v);

  return { names, sessions, listings };
}

function buildChatDto(
  row: ChatReportRow,
  names: Map<string, string>,
  staffUserId: string,
  linked: { id: string; label: string }[],
  isRepeat: boolean,
  history: AdminReportDto['history'] = [],
): AdminReportDto {
  const status = String(row.status ?? 'open') as ReportDbStatus;
  const assigneeName = row.assignee_id ? names.get(row.assignee_id) : null;
  const reporter = names.get(row.reporter_id) ?? 'unknown';
  const target = `@${row.target_username}`;
  const route = routeForChat(row.kind);
  const category = categoryFor('chat', row.kind);
  const reason = reasonLabel('chat', row.kind, row.details);

  return {
    id: compositeId('chat', row.id),
    route,
    reason,
    target,
    reporter,
    status: uiStatusFromDb(status),
    priority: status === 'escalated' ? 'P1' : status === 'under_review' ? 'P2' : 'P3',
    aiPriority: 'Normal',
    assigned: assigneeName ? `@${assigneeName}` : 'Unassigned',
    assignedToMe: row.assignee_id === staffUserId,
    department: 'Trust & Safety',
    category,
    objectTitle: target,
    objectMeta: `Reporter @${reporter}`,
    ageLabel: ageLabel(row.created_at),
    createdAt: openLabel(row.created_at),
    evidenceCount: 0,
    evidenceRestricted: true,
    aiSummary: '',
    aiUnavailable: true,
    routingHint: 'Open in Users',
    reporterStatement: reason,
    linkedReports: linked,
    isRepeat,
    history,
    dbStatus: status,
    objectKey: objectKeyForChat(row),
  };
}

function buildLiveDto(
  row: LiveReportRow,
  names: Map<string, string>,
  sessions: Map<string, SessionMeta>,
  listings: Map<string, ListingMeta>,
  staffUserId: string,
  linked: { id: string; label: string }[],
  isRepeat: boolean,
  history: AdminReportDto['history'] = [],
): AdminReportDto {
  const status = String(row.status ?? 'open') as ReportDbStatus;
  const assigneeName = row.assignee_id ? names.get(row.assignee_id) : null;
  const reporter = names.get(row.reporter_id) ?? 'unknown';
  const session = sessions.get(row.live_session_id);
  const hostName = session ? names.get(session.host_id) : null;
  const listing = row.listing_id ? listings.get(row.listing_id) : null;
  const route = routeForLive(row.kind);
  const category = categoryFor('live', row.kind);
  const reason = reasonLabel('live', row.kind, row.details);

  let target = '@unknown';
  let objectTitle = 'Live session';
  let objectMeta = `Reporter @${reporter}`;

  if (row.kind === 'listing' && listing) {
    objectTitle = listing.title?.trim() || 'Listing';
    const seller = names.get(listing.seller_id);
    target = seller ? `@${seller}` : `@${row.target_username ?? 'unknown'}`;
    objectMeta = `Listing · reporter @${reporter}`;
  } else if (row.kind === 'user') {
    target = `@${row.target_username ?? hostName ?? 'unknown'}`;
    objectTitle = `Commenter ${target}`;
    objectMeta = session?.title?.trim()
      ? `${session.title} · @${hostName ?? 'host'}`
      : `Live · @${hostName ?? 'host'}`;
  } else {
    target = `@${hostName ?? row.target_username ?? 'unknown'}`;
    objectTitle = session?.title?.trim() || 'Live session';
    objectMeta = `Host ${target} · reporter @${reporter}`;
  }

  return {
    id: compositeId('live', row.id),
    route,
    reason,
    target,
    reporter,
    status: uiStatusFromDb(status),
    priority: status === 'escalated' ? 'P1' : status === 'under_review' ? 'P2' : 'P3',
    aiPriority: 'Normal',
    assigned: assigneeName ? `@${assigneeName}` : 'Unassigned',
    assignedToMe: row.assignee_id === staffUserId,
    department: 'Trust & Safety',
    category,
    objectTitle,
    objectMeta,
    ageLabel: ageLabel(row.created_at),
    createdAt: openLabel(row.created_at),
    evidenceCount: 0,
    evidenceRestricted: true,
    aiSummary: '',
    aiUnavailable: true,
    routingHint:
      route === 'Listing' ? 'Open in Listings' : route === 'Live comment' ? 'Open in Live' : 'Open in Live',
    reporterStatement: reason,
    linkedReports: linked,
    isRepeat,
    history,
    dbStatus: status,
    objectKey: objectKeyForLive(row, hostName),
  };
}

function buildLinkedMaps(
  chat: ChatReportRow[],
  live: LiveReportRow[],
  sessions: Map<string, SessionMeta>,
  names: Map<string, string>,
) {
  const byKey = new Map<string, { id: string; label: string }[]>();

  for (const row of chat) {
    const key = objectKeyForChat(row);
    const list = byKey.get(key) ?? [];
    list.push({
      id: compositeId('chat', row.id),
      label: reasonLabel('chat', row.kind, row.details),
    });
    byKey.set(key, list);
  }
  for (const row of live) {
    const session = sessions.get(row.live_session_id);
    const hostName = session ? names.get(session.host_id) : null;
    const key = objectKeyForLive(row, hostName);
    const list = byKey.get(key) ?? [];
    list.push({
      id: compositeId('live', row.id),
      label: reasonLabel('live', row.kind, row.details),
    });
    byKey.set(key, list);
  }

  const counts = new Map<string, number>();
  for (const [key, list] of byKey) counts.set(key, list.length);
  return { byKey, counts };
}

async function mergeReports(staffUserId: string): Promise<{
  reports: AdminReportDto[];
  objectKeyCounts: Map<string, number>;
}> {
  const service = createServiceClient();
  const [chatRes, liveRes] = await Promise.all([
    service
      .from('chat_reports')
      .select(
        'id, reporter_id, target_username, conversation_id, message_id, kind, status, assignee_id, details, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(MERGE_LIMIT),
    service
      .from('live_reports')
      .select(
        'id, reporter_id, live_session_id, kind, target_username, listing_id, status, assignee_id, details, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(MERGE_LIMIT),
  ]);
  if (chatRes.error) throw chatRes.error;
  if (liveRes.error) throw liveRes.error;

  const chat = (chatRes.data ?? []) as ChatReportRow[];
  const live = (liveRes.data ?? []) as LiveReportRow[];
  const { names, sessions, listings } = await loadJoinMaps(chat, live);
  const { byKey, counts } = buildLinkedMaps(chat, live, sessions, names);

  const reports: AdminReportDto[] = [];
  for (const row of chat) {
    const key = objectKeyForChat(row);
    const all = byKey.get(key) ?? [];
    const linked = all.filter((x) => x.id !== compositeId('chat', row.id));
    reports.push(
      buildChatDto(row, names, staffUserId, linked, all.length >= 2),
    );
  }
  for (const row of live) {
    const session = sessions.get(row.live_session_id);
    const hostName = session ? names.get(session.host_id) : null;
    const key = objectKeyForLive(row, hostName);
    const all = byKey.get(key) ?? [];
    const linked = all.filter((x) => x.id !== compositeId('live', row.id));
    reports.push(
      buildLiveDto(row, names, sessions, listings, staffUserId, linked, all.length >= 2),
    );
  }

  reports.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      b.id.localeCompare(a.id),
  );

  // Prefer created_at sort via age — re-sort by original timestamps from rows
  const createdMap = new Map<string, string>();
  for (const r of chat) createdMap.set(compositeId('chat', r.id), r.created_at);
  for (const r of live) createdMap.set(compositeId('live', r.id), r.created_at);
  reports.sort((a, b) => {
    const ca = createdMap.get(a.id) ?? '';
    const cb = createdMap.get(b.id) ?? '';
    return cb.localeCompare(ca);
  });

  return { reports, objectKeyCounts: counts };
}

async function loadOneReport(
  source: ReportSource,
  id: string,
  staffUserId: string,
): Promise<AdminReportDto | null> {
  const service = createServiceClient();
  const { reports, objectKeyCounts } = await mergeReports(staffUserId);
  const found = reports.find((r) => r.id === compositeId(source, id));
  if (!found) {
    // Maybe outside merge window — fetch directly
    if (source === 'chat') {
      const { data, error } = await service
        .from('chat_reports')
        .select(
          'id, reporter_id, target_username, conversation_id, message_id, kind, status, assignee_id, details, created_at, updated_at',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as ChatReportRow;
      const { names } = await loadJoinMaps([row], []);
      const dto = buildChatDto(row, names, staffUserId, [], false);
      const events = await loadReportEvents('chat', id);
      const actorNames = await fetchUsernameMap(
        service,
        events.map((e) => e.actor_id).filter(Boolean) as string[],
      );
      dto.history = mapEventsToHistory(events, actorNames, row.created_at);
      return dto;
    }
    const { data, error } = await service
      .from('live_reports')
      .select(
        'id, reporter_id, live_session_id, kind, target_username, listing_id, status, assignee_id, details, created_at, updated_at',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as LiveReportRow;
    const { names, sessions, listings } = await loadJoinMaps([], [row]);
    const dto = buildLiveDto(row, names, sessions, listings, staffUserId, [], false);
    const events = await loadReportEvents('live', id);
    const actorNames = await fetchUsernameMap(
      service,
      events.map((e) => e.actor_id).filter(Boolean) as string[],
    );
    dto.history = mapEventsToHistory(events, actorNames, row.created_at);
    return dto;
  }

  const events = await loadReportEvents(source, id);
  const service2 = createServiceClient();
  const actorNames = await fetchUsernameMap(
    service2,
    events.map((e) => e.actor_id).filter(Boolean) as string[],
  );
  const createdAt =
    found.createdAt; // will reformat from events received
  // Prefer raw created from merge — rebuild history
  found.history = mapEventsToHistory(
    events,
    actorNames,
    // approximate from openLabel reverse is lossy; use event or now
    events[0]?.created_at ?? new Date().toISOString(),
  );
  // Fix received synthetic to use age-friendly label — reload created_at
  if (source === 'chat') {
    const { data } = await service
      .from('chat_reports')
      .select('created_at')
      .eq('id', id)
      .maybeSingle();
    if (data?.created_at) {
      found.history = mapEventsToHistory(events, actorNames, String(data.created_at));
    }
  } else {
    const { data } = await service
      .from('live_reports')
      .select('created_at')
      .eq('id', id)
      .maybeSingle();
    if (data?.created_at) {
      found.history = mapEventsToHistory(events, actorNames, String(data.created_at));
    }
  }

  void objectKeyCounts;
  void createdAt;
  return found;
}

async function updateReportStatus(
  source: ReportSource,
  id: string,
  patch: { status?: ReportDbStatus; assignee_id?: string | null },
) {
  const service = createServiceClient();
  const table = source === 'chat' ? 'chat_reports' : 'live_reports';
  const { data, error } = await service
    .from(table)
    .update(patch)
    .eq('id', id)
    .select(
      source === 'chat'
        ? 'id, reporter_id, target_username, conversation_id, message_id, kind, status, assignee_id, details, created_at'
        : 'id, reporter_id, live_session_id, kind, target_username, listing_id, status, assignee_id, details, created_at',
    )
    .maybeSingle();
  if (error) throw error;
  return data;
}

function searchMatch(r: AdminReportDto, q: string) {
  if (!q) return true;
  const hay = [
    r.id,
    r.reason,
    r.target,
    r.objectTitle,
    r.objectMeta,
    r.reporter,
    r.category,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const queue = String(req.query.queue ?? 'open') as ReportQueue;
  const q = String(req.query.q ?? '')
    .trim()
    .toLowerCase();

  try {
    const { reports, objectKeyCounts } = await mergeReports(staff.userId);
    const counts = computeCounts(reports, staff.userId, objectKeyCounts);
    const filtered = reports.filter(
      (r) => matchesQueue(r, queue, staff.userId, objectKeyCounts) && searchMatch(r, q),
    );
    // Strip internal fields
    const out = filtered.map(({ dbStatus: _s, objectKey: _k, ...rest }) => rest);
    return res.json({ reports: out, counts });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const parsed = parseCompositeId(String(req.params.id));
  if (!parsed) return sendError(res, 400, 'Invalid report id (expected chat:uuid or live:uuid)');

  try {
    const report = await loadOneReport(parsed.source, parsed.id, staff.userId);
    if (!report) return sendError(res, 404, 'Report not found');
    const { dbStatus: _s, objectKey: _k, ...rest } = report;
    return res.json({ report: rest });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

async function respondWithReport(
  res: import('express').Response,
  source: ReportSource,
  id: string,
  staffUserId: string,
) {
  const report = await loadOneReport(source, id, staffUserId);
  if (!report) return sendError(res, 404, 'Report not found');
  const { dbStatus: _s, objectKey: _k, ...rest } = report;
  return res.json({ report: rest });
}

router.post(
  '/:id/note',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const staff = req as StaffRequest;
    const parsed = parseCompositeId(String(req.params.id));
    if (!parsed) return sendError(res, 400, 'Invalid report id');
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');

    try {
      const existing = await loadOneReport(parsed.source, parsed.id, staff.userId);
      if (!existing) return sendError(res, 404, 'Report not found');

      await recordReportEvent(
        parsed.source,
        parsed.id,
        staff.userId,
        'note',
        body.data.reason,
      );
      const service = createServiceClient();
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'report.note',
        resourceType: 'report',
        resourceId: compositeId(parsed.source, parsed.id),
        reason: body.data.reason,
      });
      return respondWithReport(res, parsed.source, parsed.id, staff.userId);
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
    const parsed = parseCompositeId(String(req.params.id));
    if (!parsed) return sendError(res, 400, 'Invalid report id');
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');

    try {
      const existing = await loadOneReport(parsed.source, parsed.id, staff.userId);
      if (!existing) return sendError(res, 404, 'Report not found');
      if (existing.dbStatus === 'escalated') {
        return sendError(res, 409, 'Already escalated', 'ALREADY_APPLIED');
      }
      if (existing.dbStatus === 'closed' || existing.dbStatus === 'dismissed') {
        return sendError(res, 409, 'Report is closed', 'ALREADY_APPLIED');
      }

      await updateReportStatus(parsed.source, parsed.id, { status: 'escalated' });
      await recordReportEvent(
        parsed.source,
        parsed.id,
        staff.userId,
        'escalated',
        body.data.reason,
      );
      const service = createServiceClient();
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'report.escalate',
        resourceType: 'report',
        resourceId: compositeId(parsed.source, parsed.id),
        reason: body.data.reason,
        sensitivity: 'High',
      });
      return respondWithReport(res, parsed.source, parsed.id, staff.userId);
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/assign',
  requireStaffAuth,
  requireStaffRole(...routeRoles),
  async (req, res) => {
    const staff = req as StaffRequest;
    const parsed = parseCompositeId(String(req.params.id));
    if (!parsed) return sendError(res, 400, 'Invalid report id');
    const body = assignBody.safeParse(req.body ?? {});
    if (!body.success) return sendError(res, 400, 'Invalid assign body');

    const assigneeId = body.data.assigneeId ?? staff.userId;
    const reason =
      body.data.reason?.trim() ||
      (assigneeId === staff.userId ? 'Self-assigned' : 'Assigned');

    try {
      const existing = await loadOneReport(parsed.source, parsed.id, staff.userId);
      if (!existing) return sendError(res, 404, 'Report not found');

      const patch: { status?: ReportDbStatus; assignee_id: string } = {
        assignee_id: assigneeId,
      };
      if (existing.dbStatus === 'open') {
        patch.status = 'under_review';
      }

      await updateReportStatus(parsed.source, parsed.id, patch);
      await recordReportEvent(
        parsed.source,
        parsed.id,
        staff.userId,
        'assigned',
        reason,
        { assigneeId },
      );
      if (patch.status === 'under_review') {
        await recordReportEvent(
          parsed.source,
          parsed.id,
          staff.userId,
          'under_review',
          reason,
        );
      }
      const service = createServiceClient();
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'report.assign',
        resourceType: 'report',
        resourceId: compositeId(parsed.source, parsed.id),
        reason,
        meta: { assigneeId },
      });
      return respondWithReport(res, parsed.source, parsed.id, staff.userId);
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/dismiss',
  requireStaffAuth,
  requireStaffAction('dismiss_report'),
  async (req, res) => {
    const staff = req as StaffRequest;
    const parsed = parseCompositeId(String(req.params.id));
    if (!parsed) return sendError(res, 400, 'Invalid report id');
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');

    try {
      const existing = await loadOneReport(parsed.source, parsed.id, staff.userId);
      if (!existing) return sendError(res, 404, 'Report not found');
      if (existing.dbStatus === 'dismissed') {
        return sendError(res, 409, 'Already dismissed', 'ALREADY_APPLIED');
      }

      await updateReportStatus(parsed.source, parsed.id, { status: 'dismissed' });
      await recordReportEvent(
        parsed.source,
        parsed.id,
        staff.userId,
        'dismissed',
        body.data.reason,
      );
      const service = createServiceClient();
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'report.dismiss',
        resourceType: 'report',
        resourceId: compositeId(parsed.source, parsed.id),
        reason: body.data.reason,
      });
      return respondWithReport(res, parsed.source, parsed.id, staff.userId);
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/close',
  requireStaffAuth,
  requireStaffAction('close_report'),
  async (req, res) => {
    const staff = req as StaffRequest;
    const parsed = parseCompositeId(String(req.params.id));
    if (!parsed) return sendError(res, 400, 'Invalid report id');
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');

    try {
      const existing = await loadOneReport(parsed.source, parsed.id, staff.userId);
      if (!existing) return sendError(res, 404, 'Report not found');
      if (existing.dbStatus === 'closed') {
        return sendError(res, 409, 'Already closed', 'ALREADY_APPLIED');
      }

      await updateReportStatus(parsed.source, parsed.id, { status: 'closed' });
      await recordReportEvent(
        parsed.source,
        parsed.id,
        staff.userId,
        'closed',
        body.data.reason,
      );
      const service = createServiceClient();
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'report.close',
        resourceType: 'report',
        resourceId: compositeId(parsed.source, parsed.id),
        reason: body.data.reason,
      });
      return respondWithReport(res, parsed.source, parsed.id, staff.userId);
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/action-taken',
  requireStaffAuth,
  requireStaffAction('mark_report_action_taken'),
  async (req, res) => {
    const staff = req as StaffRequest;
    const parsed = parseCompositeId(String(req.params.id));
    if (!parsed) return sendError(res, 400, 'Invalid report id');
    const body = reasonBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');

    try {
      const existing = await loadOneReport(parsed.source, parsed.id, staff.userId);
      if (!existing) return sendError(res, 404, 'Report not found');
      if (existing.dbStatus === 'action_taken') {
        return sendError(res, 409, 'Already marked action taken', 'ALREADY_APPLIED');
      }

      await updateReportStatus(parsed.source, parsed.id, { status: 'action_taken' });
      await recordReportEvent(
        parsed.source,
        parsed.id,
        staff.userId,
        'action_taken',
        body.data.reason,
      );
      const service = createServiceClient();
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'report.action_taken',
        resourceType: 'report',
        resourceId: compositeId(parsed.source, parsed.id),
        reason: body.data.reason,
        sensitivity: 'High',
      });
      return respondWithReport(res, parsed.source, parsed.id, staff.userId);
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

router.post(
  '/:id/associate',
  requireStaffAuth,
  requireStaffAction('close_report'),
  async (req, res) => {
    const staff = req as StaffRequest;
    const parsed = parseCompositeId(String(req.params.id));
    if (!parsed) return sendError(res, 400, 'Invalid report id');
    const body = associateBody.safeParse(req.body);
    if (!body.success) return sendError(res, 400, 'Reason required (min 3 chars)');

    try {
      const existing = await loadOneReport(parsed.source, parsed.id, staff.userId);
      if (!existing) return sendError(res, 404, 'Report not found');

      const linkedReportIds = body.data.linkedReportIds ?? [];
      await recordReportEvent(
        parsed.source,
        parsed.id,
        staff.userId,
        'associated',
        body.data.reason,
        { linkedIds: linkedReportIds },
      );
      const service = createServiceClient();
      await writeAdminAudit(service, {
        actorId: staff.userId,
        actorRole: staff.adminRole,
        action: 'report.associate',
        resourceType: 'report',
        resourceId: compositeId(parsed.source, parsed.id),
        reason: body.data.reason,
        meta: { linkedIds: linkedReportIds },
      });
      return respondWithReport(res, parsed.source, parsed.id, staff.userId);
    } catch (err) {
      return handleSupabaseError(res, err as { message: string });
    }
  },
);

export default router;
