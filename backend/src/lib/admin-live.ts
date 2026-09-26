import { createServiceClient } from './supabase.js';

export type LiveDbStatus = 'live' | 'upcoming' | 'ended';
export type LiveUiStatus = 'Live' | 'Upcoming' | 'Ended' | 'Incident';
export type LiveQueue = 'live' | 'upcoming' | 'ended' | 'incidents';
export type LiveEventAction = 'note' | 'escalated' | 'ended_by_staff' | 'received';
export type LiveEndedReason = 'host' | 'staff' | 'connection';

export type AdminLiveDto = {
  id: string;
  host: string;
  title: string;
  status: LiveUiStatus;
  /** True when DB status is still `live` (broadcasting), even if UI badge is Incident. */
  broadcasting: boolean;
  viewers: number;
  reports: number;
  startedAt: string;
  timeLabel?: string;
  scheduledAt?: string;
  hostApproved: boolean;
  appointedMods: string[];
  productCount: number;
  aiPriority: 'High' | 'Medium' | 'Normal';
  aiSummary: string;
  aiNextStep?: string;
  aiUnavailable?: boolean;
  evidenceRestricted?: boolean;
  actionTaken?: boolean;
  connectionIssue?: boolean;
  flaggedComments: {
    id: string;
    user: string;
    text: string;
    reason: string;
    at?: string;
    action?: string;
  }[];
  pinnedProducts: {
    id: string;
    title: string;
    price: number;
    status: 'Available' | 'Reserved' | 'Sold';
  }[];
  linkedIncidents: { id: string; label: string; target?: string }[];
  internalAdmin?: string;
  timeline: {
    id: string;
    at: string;
    title: string;
    detail?: string;
    tone?: 'default' | 'warn' | 'danger' | 'ok';
  }[];
};

export type LiveSessionRow = {
  id: string;
  host_id: string;
  title: string | null;
  status: string;
  viewers: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  peak_viewers: number | null;
  products_shown: number | null;
  escalated_at: string | null;
  ended_reason: string | null;
  created_at: string;
};

const OPEN_REPORT_STATUSES = ['open', 'under_review', 'escalated'] as const;

export function isOpenReportStatus(status: string) {
  return (OPEN_REPORT_STATUSES as readonly string[]).includes(status);
}

export function hasIncidentSignal(row: {
  escalated_at?: string | null;
  openReports?: number;
}) {
  return Boolean(row.escalated_at) || (row.openReports ?? 0) >= 1;
}

export function uiStatusFromRow(row: {
  status: string;
  escalated_at?: string | null;
  openReports?: number;
}): LiveUiStatus {
  const db = String(row.status);
  const incident = hasIncidentSignal(row);
  if (db === 'upcoming') return 'Upcoming';
  if (db === 'live') return incident ? 'Incident' : 'Live';
  if (db === 'ended') return incident ? 'Incident' : 'Ended';
  return 'Ended';
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

export function timeLabelFor(row: LiveSessionRow) {
  if (row.status === 'upcoming' && row.scheduled_at) {
    return `Scheduled ${openLabel(row.scheduled_at)}`;
  }
  if (row.started_at) {
    const start = openLabel(row.started_at);
    if (row.status === 'live') return `Started ${start}`;
    if (row.ended_at) return `Ended ${openLabel(row.ended_at)}`;
    return `Started ${start}`;
  }
  return openLabel(row.created_at);
}

export function matchesQueue(
  row: LiveSessionRow,
  queue: LiveQueue,
  openReports: number,
): boolean {
  if (queue === 'live') return row.status === 'live';
  if (queue === 'upcoming') return row.status === 'upcoming';
  if (queue === 'ended') return row.status === 'ended';
  if (queue === 'incidents') {
    return hasIncidentSignal({ escalated_at: row.escalated_at, openReports });
  }
  return true;
}

export async function recordLiveEvent(
  sessionId: string,
  actorId: string | null,
  action: LiveEventAction,
  reason?: string | null,
  meta?: Record<string, unknown>,
) {
  const service = createServiceClient();
  const { error } = await service.from('live_events').insert({
    session_id: sessionId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
    meta: meta ?? {},
  });
  if (error) console.warn('[admin/live] event write failed', error.message);
}

export async function loadLiveEvents(sessionId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('live_events')
    .select('id, action, reason, created_at, actor_id, meta')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const EVENT_TITLES: Record<LiveEventAction, string> = {
  note: 'Internal note added',
  escalated: 'Session risk escalated',
  ended_by_staff: 'Live ended by Trust & Safety',
  received: 'Session recorded',
};

export function mapEventsToTimeline(
  events: {
    id: string;
    action: string;
    reason: string | null;
    created_at: string;
    actor_id: string | null;
  }[],
  actorNames: Map<string, string>,
  session: LiveSessionRow,
) {
  const timeline = events.map((row) => {
    const action = row.action as LiveEventAction;
    const by = row.actor_id ? actorNames.get(String(row.actor_id)) : null;
    const title = EVENT_TITLES[action] ?? String(row.action);
    const detail = [by ? `@${by}` : null, row.reason ? String(row.reason) : null]
      .filter(Boolean)
      .join(' · ');
    let tone: 'default' | 'warn' | 'danger' | 'ok' = 'default';
    if (action === 'escalated') tone = 'warn';
    if (action === 'ended_by_staff') tone = 'danger';
    return {
      id: String(row.id),
      at: formatAt(String(row.created_at)),
      title,
      detail: detail || undefined,
      tone,
    };
  });

  const anchor = session.started_at ?? session.created_at;
  if (!events.some((e) => e.action === 'received')) {
    timeline.unshift({
      id: `received-${session.id}`,
      at: formatAt(anchor),
      title: session.started_at ? 'Session went live' : 'Session created',
      detail: undefined,
      tone: 'default' as const,
    });
  }

  return timeline.reverse();
}

export function productUiStatus(
  available: number,
  sold: number,
): 'Available' | 'Reserved' | 'Sold' {
  if (sold > 0 && available <= 0) return 'Sold';
  if (available <= 0) return 'Reserved';
  return 'Available';
}
