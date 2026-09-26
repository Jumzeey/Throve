import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from './supabase.js';

export type ReportSource = 'chat' | 'live';
export type ReportDbStatus =
  | 'open'
  | 'under_review'
  | 'escalated'
  | 'action_taken'
  | 'dismissed'
  | 'closed';

export type ReportEventAction =
  | 'received'
  | 'note'
  | 'escalated'
  | 'assigned'
  | 'under_review'
  | 'action_taken'
  | 'dismissed'
  | 'closed'
  | 'associated';

export type ReportUiStatus = 'New' | 'Under review' | 'Escalated' | 'Action taken' | 'Closed';
export type ReportRoute = 'User' | 'Listing' | 'Live' | 'Live comment';
export type ReportQueue =
  | 'open'
  | 'high'
  | 'repeat'
  | 'escalated'
  | 'action_taken'
  | 'closed'
  | 'assigned_me';

export type AdminReportDto = {
  id: string;
  route: ReportRoute;
  reason: string;
  target: string;
  reporter: string;
  status: ReportUiStatus;
  priority: 'P1' | 'P2' | 'P3';
  aiPriority: 'High' | 'Medium' | 'Normal';
  assigned: string;
  assignedToMe?: boolean;
  department: string;
  category: string;
  objectTitle: string;
  objectMeta: string;
  ageLabel: string;
  createdAt: string;
  evidenceCount: number;
  evidenceRestricted: boolean;
  aiSummary: string;
  aiNextStep?: string;
  aiUnavailable: boolean;
  routingHint: string;
  reporterStatement: string;
  linkedReports: { id: string; label: string }[];
  isRepeat?: boolean;
  history: {
    id: string;
    at: string;
    title: string;
    detail?: string;
    tone?: 'default' | 'warn' | 'danger' | 'ok';
  }[];
  actionTakenNote?: string;
  /** Internal — not required by MockReport but useful for mutations */
  dbStatus?: ReportDbStatus;
  objectKey?: string;
};

export type ChatReportRow = {
  id: string;
  reporter_id: string;
  target_username: string;
  conversation_id: string | null;
  message_id: string | null;
  kind: string;
  status: string;
  assignee_id: string | null;
  details: string | null;
  created_at: string;
  updated_at?: string;
};

export type LiveReportRow = {
  id: string;
  reporter_id: string;
  live_session_id: string;
  kind: string;
  target_username: string | null;
  listing_id: string | null;
  status: string;
  assignee_id: string | null;
  details: string | null;
  created_at: string;
  updated_at?: string;
};

export function parseCompositeId(raw: string): { source: ReportSource; id: string } | null {
  const m = /^(chat|live):([0-9a-f-]{36})$/i.exec(raw.trim());
  if (!m) return null;
  return { source: m[1].toLowerCase() as ReportSource, id: m[2] };
}

export function compositeId(source: ReportSource, id: string) {
  return `${source}:${id}`;
}

export function uiStatusFromDb(status: string): ReportUiStatus {
  if (status === 'open') return 'New';
  if (status === 'under_review') return 'Under review';
  if (status === 'escalated') return 'Escalated';
  if (status === 'action_taken') return 'Action taken';
  return 'Closed';
}

export function formatAt(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

export function openLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ageLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function objectKeyForChat(row: ChatReportRow) {
  return `user:${row.target_username.toLowerCase()}`;
}

export function objectKeyForLive(
  row: LiveReportRow,
  hostUsername?: string | null,
) {
  if (row.kind === 'listing' && row.listing_id) {
    return `listing:${row.listing_id}`;
  }
  const target =
    row.target_username?.trim() ||
    hostUsername?.trim() ||
    'unknown';
  return `live:${row.live_session_id}:${target.toLowerCase()}`;
}

export function routeForChat(kind: string): ReportRoute {
  return 'User';
}

export function routeForLive(kind: string): ReportRoute {
  if (kind === 'listing') return 'Listing';
  if (kind === 'user') return 'Live comment';
  return 'Live';
}

export function categoryFor(source: ReportSource, kind: string) {
  if (source === 'chat') {
    return kind === 'message' ? 'Chat message' : 'User profile';
  }
  if (kind === 'listing') return 'Live listing';
  if (kind === 'user') return 'Live commenter';
  return 'Live session';
}

export function reasonLabel(source: ReportSource, kind: string, details?: string | null) {
  if (details?.trim()) return details.trim();
  if (source === 'chat') {
    return kind === 'message' ? 'Reported chat message' : 'Reported user';
  }
  if (kind === 'listing') return 'Reported live listing';
  if (kind === 'user') return 'Reported live commenter';
  return 'Reported live session';
}

export async function recordReportEvent(
  source: ReportSource,
  reportId: string,
  actorId: string | null,
  action: ReportEventAction,
  reason?: string | null,
  meta?: Record<string, unknown>,
) {
  const service = createServiceClient();
  const { error } = await service.from('report_events').insert({
    source,
    report_id: reportId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
    meta: meta ?? {},
  });
  if (error) console.warn('[admin/reports] event write failed', error.message);
}

export async function loadReportEvents(source: ReportSource, reportId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('report_events')
    .select('id, action, reason, created_at, actor_id, meta')
    .eq('source', source)
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const EVENT_TITLES: Record<ReportEventAction, string> = {
  received: 'Report received',
  note: 'Internal note added',
  escalated: 'Escalated',
  assigned: 'Assigned',
  under_review: 'Moved to under review',
  action_taken: 'Action taken',
  dismissed: 'Dismissed',
  closed: 'Closed after review',
  associated: 'Record associated',
};

export function mapEventsToHistory(
  events: {
    id: string;
    action: string;
    reason: string | null;
    created_at: string;
    actor_id: string | null;
  }[],
  actorNames: Map<string, string>,
  receivedAt: string,
) {
  const history = events.map((row) => {
    const action = row.action as ReportEventAction;
    const by = row.actor_id ? actorNames.get(String(row.actor_id)) : null;
    const title = EVENT_TITLES[action] ?? String(row.action);
    const detail = [by ? `@${by}` : null, row.reason ? String(row.reason) : null]
      .filter(Boolean)
      .join(' · ');
    let tone: 'default' | 'warn' | 'danger' | 'ok' = 'default';
    if (action === 'escalated') tone = 'warn';
    if (action === 'dismissed' || action === 'closed' || action === 'action_taken') tone = 'ok';
    return {
      id: String(row.id),
      at: formatAt(String(row.created_at)),
      title,
      detail: detail || undefined,
      tone,
    };
  });

  if (!events.some((e) => e.action === 'received')) {
    history.unshift({
      id: `received-${receivedAt}`,
      at: formatAt(receivedAt),
      title: 'Report received',
      detail: undefined,
      tone: 'default' as const,
    });
  }

  return history.reverse();
}

export function matchesQueue(
  dto: AdminReportDto,
  queue: ReportQueue,
  staffUserId: string,
  objectKeyCounts: Map<string, number>,
): boolean {
  const status = dto.dbStatus ?? 'open';
  const key = dto.objectKey ?? '';
  const linkedCount = objectKeyCounts.get(key) ?? 1;

  if (queue === 'open') return status === 'open' || status === 'under_review';
  if (queue === 'high') return status === 'escalated' || linkedCount >= 2;
  if (queue === 'repeat') return linkedCount >= 2;
  if (queue === 'escalated') return status === 'escalated';
  if (queue === 'action_taken') return status === 'action_taken';
  if (queue === 'closed') return status === 'closed' || status === 'dismissed';
  if (queue === 'assigned_me') return dto.assignedToMe === true;
  return true;
}

export function computeCounts(
  reports: AdminReportDto[],
  staffUserId: string,
  objectKeyCounts: Map<string, number>,
) {
  const queues: ReportQueue[] = [
    'open',
    'high',
    'repeat',
    'escalated',
    'action_taken',
    'closed',
    'assigned_me',
  ];
  const counts: Record<string, number> = {};
  for (const q of queues) {
    counts[q] = reports.filter((r) => matchesQueue(r, q, staffUserId, objectKeyCounts)).length;
  }
  counts.all = reports.length;
  return counts as Record<ReportQueue, number> & { all: number };
}

export async function fetchUsernameMap(
  service: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await service.from('profiles').select('id, username').in('id', unique);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [String(r.id), String(r.username)]));
}
