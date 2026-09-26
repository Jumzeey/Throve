import {
  formatAt as auditFormatAt,
  humanizeAction,
  roleLabel,
  visibilityDepthFor,
  type AuditLogRow,
} from './admin-audit-read.js';
import { hasIncidentSignal, isOpenReportStatus } from './admin-live.js';
import { isOpenDispute, needsAssistance } from './admin-orders.js';
import {
  deriveUiStatus,
  findDuplicateIds,
  needsAttentionUi,
} from './admin-payments.js';
import { ageLabel, objectKeyForChat, objectKeyForLive } from './admin-reports.js';
import { canAccessRoute, type AdminRole, type AdminRoute } from './staff-rbac.js';
import { createServiceClient } from './supabase.js';

export type AdminOpsBadges = {
  listings: number;
  reports: number;
  live: number;
  disputes: number;
  orders: number;
  payments: number;
  refunds: number;
  payouts: number;
};

export type OpsQueueTab = 'urgent' | 'all' | 'evidence';

export type OpsCase = {
  id: string;
  subject: string;
  detail: string;
  category: string;
  age: string;
  ageUrgent?: boolean;
  aiPriority: 'High' | 'Medium' | 'Normal';
  payout: 'On Hold' | '—';
  urgent: boolean;
  evidenceIncomplete: boolean;
  href: string;
  role: 'ts' | 'support' | 'finance' | 'all';
};

export type OpsSensitiveAction = {
  id: string;
  title: string;
  detail: string;
};

export type OpsBanRec = {
  user: string;
  by: string;
};

export type OpsSupportRow = {
  id: string;
  party: string;
  status: string;
  action: string;
  href: string;
};

export type OpsDashboard =
  | {
      kind: 'trust_safety';
      urgentDisputes: number;
      openDisputes: number;
      openReports: number;
      liveIncidents: number;
      cases: OpsCase[];
      assignedToMe: number;
      awaitingDecision: number;
      sensitiveActions: OpsSensitiveAction[];
      aiUnavailable: true;
    }
  | {
      kind: 'finance';
      payoutsEligible: number;
      eligibleAmountKobo: number;
      payoutsOnHold: number;
      refundsToExecute: number;
      failedOps: number;
      aiUnavailable: true;
    }
  | {
      kind: 'support';
      myOpenCases: number;
      ordersNeedingHelp: number;
      escalations: number;
      decidedNeedsContact: number;
      rows: OpsSupportRow[];
      aiUnavailable: true;
    }
  | {
      kind: 'super_admin';
      disputesOpen: number;
      disputesUrgent: number;
      disputesDecisionReady: number;
      reportsOpen: number;
      liveIncidents: number;
      flaggedUsers: number;
      payoutsEligible: number;
      payoutsOnHold: number;
      failedOps: number;
      banRecommendations: OpsBanRec[];
      sensitiveActions: OpsSensitiveAction[];
      aiUnavailable: true;
    };

const WINDOW = 300;
const QUEUE_CAP = 100;
const OPEN_DISPUTE = ['open', 'under_review'] as const;
const OPEN_REPORT = ['open', 'under_review'] as const;
const MS_24H = 24 * 60 * 60 * 1000;

async function headCount(
  table: string,
  filter: (q: {
    eq: (c: string, v: string) => unknown;
    in: (c: string, v: string[]) => unknown;
  }) => unknown,
): Promise<number> {
  const service = createServiceClient();
  const base = service.from(table).select('id', { count: 'exact', head: true });
  const query = filter(base as never) as PromiseLike<{ count: number | null; error: { message: string } | null }>;
  const { count, error } = await query;
  if (error) {
    console.warn(`[admin/ops] count ${table} failed`, error.message);
    return 0;
  }
  return count ?? 0;
}

function deriveDisputeQueue(row: {
  status: string;
  seller_response: string | null;
  evidence_urls: unknown;
}): 'open' | 'decision_ready' | 'evidence_incomplete' | 'awaiting_buyer' {
  const status = String(row.status);
  const evidence = Array.isArray(row.evidence_urls) ? row.evidence_urls : [];
  const sellerResponse = String(row.seller_response ?? '').trim();
  if (status !== 'open' && status !== 'under_review') return 'open';
  if (status === 'under_review' && sellerResponse && evidence.length >= 1) return 'decision_ready';
  if (status === 'under_review' && sellerResponse && evidence.length === 0) return 'awaiting_buyer';
  if (status === 'under_review' && evidence.length === 0) return 'evidence_incomplete';
  return 'open';
}

function isUrgentDispute(row: {
  status: string;
  created_at: string;
  seller_response: string | null;
  evidence_urls: unknown;
}): boolean {
  const status = String(row.status);
  if (status !== 'open' && status !== 'under_review') return false;
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs >= MS_24H) return true;
  return deriveDisputeQueue(row) === 'decision_ready';
}

export async function countListingsPending(): Promise<number> {
  return headCount('listings', (q) => q.eq('status', 'pending_review'));
}

export async function countOpenReports(): Promise<number> {
  const [chat, live] = await Promise.all([
    headCount('chat_reports', (q) => q.in('status', [...OPEN_REPORT])),
    headCount('live_reports', (q) => q.in('status', [...OPEN_REPORT])),
  ]);
  return chat + live;
}

export async function countOpenDisputes(): Promise<number> {
  return headCount('order_disputes', (q) => q.in('status', [...OPEN_DISPUTE]));
}

export async function countRefundsToExecute(): Promise<number> {
  return headCount('refunds', (q) => q.in('status', ['awaiting_finance', 'ready']));
}

export async function countPayoutsEligible(): Promise<number> {
  return headCount('payouts', (q) => q.eq('status', 'eligible'));
}

export async function countPayoutsOnHold(): Promise<number> {
  return headCount('payouts', (q) => q.eq('status', 'on_hold'));
}

export async function countPayoutsFailed(): Promise<number> {
  return headCount('payouts', (q) => q.eq('status', 'failed'));
}

export async function countRefundsUncertain(): Promise<number> {
  return headCount('refunds', (q) => q.eq('status', 'uncertain'));
}

export async function sumEligiblePayoutNet(): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service.from('payouts').select('net').eq('status', 'eligible');
  if (error) {
    console.warn('[admin/ops] eligible sum failed', error.message);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + Number(row.net ?? 0), 0);
}

export async function countLiveIncidents(): Promise<number> {
  const service = createServiceClient();
  const [{ data: sessions, error: sErr }, { data: reports, error: rErr }] = await Promise.all([
    service
      .from('live_sessions')
      .select('id, escalated_at')
      .order('created_at', { ascending: false })
      .limit(WINDOW),
    service
      .from('live_reports')
      .select('live_session_id, status')
      .in('status', ['open', 'under_review', 'escalated'])
      .limit(500),
  ]);
  if (sErr) console.warn('[admin/ops] live sessions', sErr.message);
  if (rErr) console.warn('[admin/ops] live reports', rErr.message);

  const openBySession = new Map<string, number>();
  for (const r of reports ?? []) {
    const sid = String(r.live_session_id ?? '');
    if (!sid) continue;
    if (!isOpenReportStatus(String(r.status))) continue;
    openBySession.set(sid, (openBySession.get(sid) ?? 0) + 1);
  }

  let n = 0;
  for (const s of sessions ?? []) {
    if (
      hasIncidentSignal({
        escalated_at: s.escalated_at ? String(s.escalated_at) : null,
        openReports: openBySession.get(String(s.id)) ?? 0,
      })
    ) {
      n += 1;
    }
  }
  return n;
}

export async function countOrdersNeedingAssistance(): Promise<number> {
  const service = createServiceClient();
  const { data: orders, error } = await service
    .from('orders')
    .select('id, payout_status')
    .order('created_at', { ascending: false })
    .limit(WINDOW);
  if (error) {
    console.warn('[admin/ops] orders window', error.message);
    return 0;
  }
  if (!orders?.length) return 0;

  const orderIds = orders.map((o) => String(o.id));
  const [{ data: disputes }, { data: payments }, { data: refunds }, { data: escalations }] =
    await Promise.all([
      service.from('order_disputes').select('order_id, status').in('order_id', orderIds),
      service.from('payment_intents').select('order_id, status').in('order_id', orderIds),
      service.from('refunds').select('order_id, status').in('order_id', orderIds),
      service
        .from('order_events')
        .select('order_id')
        .eq('action', 'escalated')
        .in('order_id', orderIds),
    ]);

  const disputeByOrder = new Map<string, string>();
  for (const d of disputes ?? []) {
    disputeByOrder.set(String(d.order_id), String(d.status));
  }
  const paymentByOrder = new Map<string, { id: string; status: string; tx_ref: string }>();
  for (const p of payments ?? []) {
    if (p.order_id) {
      paymentByOrder.set(String(p.order_id), {
        id: 'x',
        status: String(p.status),
        tx_ref: '',
      });
    }
  }
  const refundByOrder = new Map<string, { id: string; status: string }>();
  for (const r of refunds ?? []) {
    if (r.order_id) {
      refundByOrder.set(String(r.order_id), { id: 'x', status: String(r.status) });
    }
  }
  const escalated = new Set((escalations ?? []).map((e) => String(e.order_id)));

  let n = 0;
  for (const o of orders) {
    const oid = String(o.id);
    const disputeStatus = disputeByOrder.get(oid) ?? null;
    if (
      needsAssistance({
        openDispute: isOpenDispute(disputeStatus),
        payoutStatus: String(o.payout_status ?? ''),
        payment: paymentByOrder.get(oid) ?? null,
        refund: refundByOrder.get(oid) ?? null,
        escalated: escalated.has(oid),
      })
    ) {
      n += 1;
    }
  }
  return n;
}

export async function countPaymentsNeedingAttention(): Promise<number> {
  const service = createServiceClient();
  const { data: rows, error } = await service
    .from('payment_intents')
    .select('id, user_id, listing_id, amount, status, provider_ref, created_at')
    .order('created_at', { ascending: false })
    .limit(WINDOW);
  if (error) {
    console.warn('[admin/ops] payments window', error.message);
    return 0;
  }
  if (!rows?.length) return 0;

  const duplicateIds = findDuplicateIds(
    rows.map((r) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      listing_id: String(r.listing_id),
      amount: Number(r.amount),
      status: String(r.status),
      created_at: String(r.created_at),
    })),
  );

  let n = 0;
  for (const r of rows) {
    const ui = deriveUiStatus(
      {
        id: String(r.id),
        status: String(r.status),
        provider_ref: r.provider_ref ? String(r.provider_ref) : null,
        created_at: String(r.created_at),
      },
      duplicateIds,
    );
    if (needsAttentionUi(ui)) n += 1;
  }
  return n;
}

export async function buildRawCounts(): Promise<AdminOpsBadges> {
  const [listings, reports, live, disputes, orders, payments, refunds, payouts] =
    await Promise.all([
      countListingsPending(),
      countOpenReports(),
      countLiveIncidents(),
      countOpenDisputes(),
      countOrdersNeedingAssistance(),
      countPaymentsNeedingAttention(),
      countRefundsToExecute(),
      countPayoutsEligible(),
    ]);
  return { listings, reports, live, disputes, orders, payments, refunds, payouts };
}

const BADGE_ROUTE: Record<keyof AdminOpsBadges, AdminRoute> = {
  listings: 'listings',
  reports: 'reports',
  live: 'live',
  disputes: 'disputes',
  orders: 'orders',
  payments: 'payments',
  refunds: 'refunds',
  payouts: 'payouts',
};

export function maskBadges(role: AdminRole, raw: AdminOpsBadges): AdminOpsBadges {
  const out = { ...raw };
  for (const key of Object.keys(BADGE_ROUTE) as (keyof AdminOpsBadges)[]) {
    if (!canAccessRoute(role, BADGE_ROUTE[key])) out[key] = 0;
  }
  return out;
}

export async function buildBadges(role: AdminRole): Promise<AdminOpsBadges> {
  return maskBadges(role, await buildRawCounts());
}

async function loadDisputeWindow() {
  const service = createServiceClient();
  const { data, error } = await service
    .from('order_disputes')
    .select(
      'id, order_id, status, reason, seller_response, evidence_urls, created_at, buyer_id, seller_id, admin_decision',
    )
    .in('status', [...OPEN_DISPUTE])
    .order('created_at', { ascending: true })
    .limit(QUEUE_CAP);
  if (error) throw error;
  return data ?? [];
}

async function loadUsernameMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const service = createServiceClient();
  const { data, error } = await service.from('profiles').select('id, username').in('id', unique);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(String(row.id), String(row.username ?? 'unknown'));
  }
  return map;
}

async function payoutHoldByDispute(disputeIds: string[]) {
  const held = new Set<string>();
  if (!disputeIds.length) return held;
  const service = createServiceClient();
  const { data, error } = await service
    .from('payouts')
    .select('dispute_id, status')
    .in('dispute_id', disputeIds)
    .eq('status', 'on_hold');
  if (error) {
    console.warn('[admin/ops] payout hold lookup', error.message);
    return held;
  }
  for (const row of data ?? []) {
    if (row.dispute_id) held.add(String(row.dispute_id));
  }
  return held;
}

function disputeToCase(
  row: Record<string, unknown>,
  names: Map<string, string>,
  held: Set<string>,
): OpsCase {
  const id = String(row.id);
  const buyer = names.get(String(row.buyer_id)) ?? 'unknown';
  const seller = names.get(String(row.seller_id)) ?? 'unknown';
  const derived = deriveDisputeQueue({
    status: String(row.status),
    seller_response: row.seller_response != null ? String(row.seller_response) : null,
    evidence_urls: row.evidence_urls,
  });
  const urgent = isUrgentDispute({
    status: String(row.status),
    created_at: String(row.created_at),
    seller_response: row.seller_response != null ? String(row.seller_response) : null,
    evidence_urls: row.evidence_urls,
  });
  const ageMs = Date.now() - new Date(String(row.created_at)).getTime();
  const reason = String(row.reason ?? 'Dispute');
  return {
    id: id.slice(0, 8).toUpperCase(),
    subject: `${reason} · ORD-${String(row.order_id).slice(0, 5)}`,
    detail: `Buyer @${buyer} · Seller @${seller}`,
    category: reason,
    age: ageLabel(String(row.created_at)),
    ageUrgent: ageMs >= MS_24H,
    aiPriority: urgent ? 'High' : derived === 'decision_ready' ? 'Medium' : 'Normal',
    payout: held.has(id) ? 'On Hold' : '—',
    urgent,
    evidenceIncomplete: derived === 'evidence_incomplete',
    href: '/disputes',
    role: 'ts',
  };
}

async function loadReportCases(staffUserId: string): Promise<{
  cases: OpsCase[];
  assignedToMe: number;
  escalated: number;
}> {
  const service = createServiceClient();
  const [{ data: chat }, { data: live }] = await Promise.all([
    service
      .from('chat_reports')
      .select(
        'id, reporter_id, target_username, kind, status, assignee_id, details, created_at, conversation_id, message_id',
      )
      .in('status', ['open', 'under_review', 'escalated'])
      .order('created_at', { ascending: false })
      .limit(QUEUE_CAP),
    service
      .from('live_reports')
      .select(
        'id, reporter_id, target_username, kind, status, assignee_id, details, created_at, live_session_id, listing_id',
      )
      .in('status', ['open', 'under_review', 'escalated'])
      .order('created_at', { ascending: false })
      .limit(QUEUE_CAP),
  ]);

  const objectCounts = new Map<string, number>();
  for (const r of chat ?? []) {
    const key = objectKeyForChat({
      kind: String(r.kind),
      target_username: String(r.target_username ?? 'unknown'),
      conversation_id: r.conversation_id ? String(r.conversation_id) : null,
      message_id: r.message_id ? String(r.message_id) : null,
      id: String(r.id),
      reporter_id: String(r.reporter_id ?? ''),
      status: String(r.status),
      assignee_id: r.assignee_id ? String(r.assignee_id) : null,
      details: r.details != null ? String(r.details) : null,
      created_at: String(r.created_at),
    });
    objectCounts.set(key, (objectCounts.get(key) ?? 0) + 1);
  }
  for (const r of live ?? []) {
    const key = objectKeyForLive(
      {
        id: String(r.id),
        reporter_id: String(r.reporter_id ?? ''),
        kind: String(r.kind),
        target_username: r.target_username ? String(r.target_username) : null,
        live_session_id: String(r.live_session_id ?? ''),
        listing_id: r.listing_id ? String(r.listing_id) : null,
        status: String(r.status),
        assignee_id: r.assignee_id ? String(r.assignee_id) : null,
        details: r.details != null ? String(r.details) : null,
        created_at: String(r.created_at),
      },
      String(r.live_session_id ?? ''),
    );
    objectCounts.set(key, (objectCounts.get(key) ?? 0) + 1);
  }

  let assignedToMe = 0;
  let escalated = 0;
  const cases: OpsCase[] = [];

  for (const r of chat ?? []) {
    const status = String(r.status);
    if (status === 'escalated') escalated += 1;
    if (r.assignee_id === staffUserId) assignedToMe += 1;
    const key = objectKeyForChat({
      kind: String(r.kind),
      target_username: String(r.target_username ?? 'unknown'),
      conversation_id: r.conversation_id ? String(r.conversation_id) : null,
      message_id: r.message_id ? String(r.message_id) : null,
      id: String(r.id),
      reporter_id: String(r.reporter_id ?? ''),
      status: status,
      assignee_id: r.assignee_id ? String(r.assignee_id) : null,
      details: r.details != null ? String(r.details) : null,
      created_at: String(r.created_at),
    });
    const linked = objectCounts.get(key) ?? 1;
    const high = status === 'escalated' || linked >= 2;
    cases.push({
      id: `RPT-${String(r.id).slice(0, 4).toUpperCase()}`,
      subject: `Report · @${r.target_username ?? 'unknown'}`,
      detail: String(r.details ?? r.kind ?? 'Chat report'),
      category: String(r.kind ?? 'report'),
      age: ageLabel(String(r.created_at)),
      aiPriority: high ? 'High' : 'Normal',
      payout: '—',
      urgent: high,
      evidenceIncomplete: false,
      href: '/reports',
      role: 'ts',
    });
  }

  for (const r of live ?? []) {
    const status = String(r.status);
    if (status === 'escalated') escalated += 1;
    if (r.assignee_id === staffUserId) assignedToMe += 1;
    const key = objectKeyForLive(
      {
        id: String(r.id),
        reporter_id: String(r.reporter_id ?? ''),
        kind: String(r.kind),
        target_username: r.target_username ? String(r.target_username) : null,
        live_session_id: String(r.live_session_id ?? ''),
        listing_id: r.listing_id ? String(r.listing_id) : null,
        status: String(r.status),
        assignee_id: r.assignee_id ? String(r.assignee_id) : null,
        details: r.details != null ? String(r.details) : null,
        created_at: String(r.created_at),
      },
      String(r.live_session_id ?? ''),
    );
    const linked = objectCounts.get(key) ?? 1;
    const high = status === 'escalated' || linked >= 2;
    cases.push({
      id: `LIV-${String(r.id).slice(0, 4).toUpperCase()}`,
      subject: `Live report · @${r.target_username ?? 'host'}`,
      detail: String(r.details ?? r.kind ?? 'Live report'),
      category: String(r.kind ?? 'live'),
      age: ageLabel(String(r.created_at)),
      aiPriority: high ? 'High' : 'Normal',
      payout: '—',
      urgent: high,
      evidenceIncomplete: false,
      href: '/live',
      role: 'ts',
    });
  }

  return { cases, assignedToMe, escalated };
}

async function loadLiveIncidentCases(): Promise<OpsCase[]> {
  const service = createServiceClient();
  const [{ data: sessions }, { data: reports }] = await Promise.all([
    service
      .from('live_sessions')
      .select('id, host_id, title, status, escalated_at, created_at, started_at')
      .order('created_at', { ascending: false })
      .limit(QUEUE_CAP),
    service
      .from('live_reports')
      .select('live_session_id, status')
      .in('status', ['open', 'under_review', 'escalated'])
      .limit(500),
  ]);

  const openBySession = new Map<string, number>();
  for (const r of reports ?? []) {
    const sid = String(r.live_session_id ?? '');
    if (!sid) continue;
    openBySession.set(sid, (openBySession.get(sid) ?? 0) + 1);
  }

  const hostIds = [...new Set((sessions ?? []).map((s) => String(s.host_id)))];
  const names = await loadUsernameMap(hostIds);
  const cases: OpsCase[] = [];

  for (const s of sessions ?? []) {
    const openReports = openBySession.get(String(s.id)) ?? 0;
    if (!hasIncidentSignal({ escalated_at: s.escalated_at, openReports })) continue;
    const host = names.get(String(s.host_id)) ?? 'unknown';
    cases.push({
      id: `LIV-${String(s.id).slice(0, 4).toUpperCase()}`,
      subject: String(s.title ?? 'Live session'),
      detail: `Host @${host} · ${openReports} open report(s)`,
      category: 'Live incident',
      age: ageLabel(String(s.started_at ?? s.created_at)),
      aiPriority: s.escalated_at ? 'High' : 'Medium',
      payout: '—',
      urgent: Boolean(s.escalated_at) || openReports >= 2,
      evidenceIncomplete: false,
      href: '/live',
      role: 'ts',
    });
  }
  return cases;
}

function filterCases(cases: OpsCase[], tab: OpsQueueTab, q: string): OpsCase[] {
  const query = q.trim().toLowerCase();
  return cases
    .filter((c) => {
      if (tab === 'urgent' && !c.urgent) return false;
      if (tab === 'evidence' && !c.evidenceIncomplete) return false;
      if (!query) return true;
      return (
        c.id.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query) ||
        c.detail.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const p = (x: OpsCase) => (x.aiPriority === 'High' ? 0 : x.aiPriority === 'Medium' ? 1 : 2);
      const pd = p(a) - p(b);
      if (pd !== 0) return pd;
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return 0;
    });
}

export async function loadSensitiveActions(
  role: AdminRole,
  userId: string,
  limit = 8,
): Promise<OpsSensitiveAction[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('admin_audit_log')
    .select(
      'id, created_at, actor_id, actor_role, action, resource_type, resource_id, reason, meta, sensitivity',
    )
    .eq('sensitivity', 'High')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) {
    console.warn('[admin/ops] audit load', error.message);
    return [];
  }

  const actorIds = [...new Set((data ?? []).map((r) => String(r.actor_id)))];
  const names = await loadUsernameMap(actorIds);
  const out: OpsSensitiveAction[] = [];

  for (const raw of data ?? []) {
    const row: AuditLogRow = {
      id: String(raw.id),
      created_at: String(raw.created_at),
      actor_id: String(raw.actor_id),
      actor_role: String(raw.actor_role),
      action: String(raw.action),
      resource_type: String(raw.resource_type),
      resource_id: String(raw.resource_id),
      reason: raw.reason != null ? String(raw.reason) : null,
      meta: (raw.meta as Record<string, unknown>) ?? {},
      sensitivity: String(raw.sensitivity ?? 'Standard'),
    };
    const depth = visibilityDepthFor(role, userId, row);
    if (!depth) continue;
    const meta = row.meta ?? {};
    if (meta.result === 'denied') continue;

    const actor = names.get(row.actor_id) ?? 'staff';
    const title = humanizeAction(row.action);
    const detail = [
      row.resource_id.slice(0, 12),
      `by ${actor} (${roleLabel(row.actor_role)})`,
      auditFormatAt(row.created_at),
      row.reason ? `reason: ${row.reason}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    out.push({ id: row.id, title, detail });
    if (out.length >= limit) break;
  }
  return out;
}

function countDecisionReady(disputes: Record<string, unknown>[]): number {
  return disputes.filter(
    (r) =>
      deriveDisputeQueue({
        status: String(r.status),
        seller_response: r.seller_response != null ? String(r.seller_response) : null,
        evidence_urls: r.evidence_urls,
      }) === 'decision_ready',
  ).length;
}

function countUrgentDisputes(disputes: Record<string, unknown>[]): number {
  return disputes.filter((r) =>
    isUrgentDispute({
      status: String(r.status),
      created_at: String(r.created_at),
      seller_response: r.seller_response != null ? String(r.seller_response) : null,
      evidence_urls: r.evidence_urls,
    }),
  ).length;
}

async function loadBanRecommendations(): Promise<OpsBanRec[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('username, ban_recommended_at, ban_recommended_by')
    .not('ban_recommended_at', 'is', null)
    .order('ban_recommended_at', { ascending: false })
    .limit(10);
  if (error) {
    console.warn('[admin/ops] ban recs', error.message);
    return [];
  }
  const byIds = [
    ...new Set(
      (data ?? [])
        .map((r) => (r.ban_recommended_by ? String(r.ban_recommended_by) : null))
        .filter(Boolean) as string[],
    ),
  ];
  const names = await loadUsernameMap(byIds);
  return (data ?? []).map((r) => ({
    user: `@${r.username ?? 'unknown'}`,
    by: r.ban_recommended_by
      ? (names.get(String(r.ban_recommended_by)) ?? 'Trust & Safety')
      : 'Trust & Safety',
  }));
}

async function countFlaggedUsers(): Promise<number> {
  const service = createServiceClient();
  const { count, error } = await service
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .or('account_status.in.(restricted,suspended,banned),ban_recommended_at.not.is.null');
  if (error) {
    console.warn('[admin/ops] flagged users', error.message);
    return 0;
  }
  return count ?? 0;
}

async function countDecidedNeedsContact(): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('order_disputes')
    .select('id, admin_decision, status, updated_at')
    .not('admin_decision', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) {
    console.warn('[admin/ops] decided disputes', error.message);
    return 0;
  }
  const cutoff = Date.now() - 7 * MS_24H;
  return (data ?? []).filter((r) => new Date(String(r.updated_at)).getTime() >= cutoff).length;
}

async function buildSupportRows(staffUserId: string): Promise<OpsSupportRow[]> {
  const service = createServiceClient();
  const [{ data: disputes }, { data: reports }] = await Promise.all([
    service
      .from('order_disputes')
      .select('id, order_id, status, buyer_id, admin_decision, created_at')
      .in('status', [...OPEN_DISPUTE])
      .order('created_at', { ascending: false })
      .limit(15),
    service
      .from('chat_reports')
      .select('id, target_username, status, assignee_id, kind, created_at')
      .eq('assignee_id', staffUserId)
      .in('status', ['open', 'under_review', 'escalated'])
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const buyerIds = [...new Set((disputes ?? []).map((d) => String(d.buyer_id)))];
  const names = await loadUsernameMap(buyerIds);
  const rows: OpsSupportRow[] = [];

  for (const d of disputes ?? []) {
    const buyer = names.get(String(d.buyer_id)) ?? 'unknown';
    const decided = Boolean(d.admin_decision);
    rows.push({
      id: String(d.id).slice(0, 8).toUpperCase(),
      party: `@${buyer} · ORD-${String(d.order_id).slice(0, 5)}`,
      status: decided
        ? `Decision made — ${String(d.admin_decision)}`
        : String(d.status) === 'under_review'
          ? 'Under review by Trust & Safety'
          : 'Open dispute',
      action: decided ? 'Contact buyer' : String(d.status) === 'under_review' ? 'Add note' : 'Escalate',
      href: '/disputes',
    });
  }

  for (const r of reports ?? []) {
    rows.push({
      id: `RPT-${String(r.id).slice(0, 4).toUpperCase()}`,
      party: `@${r.target_username ?? 'unknown'}`,
      status: String(r.status),
      action: String(r.status) === 'escalated' ? 'Follow up' : 'Add note',
      href: '/reports',
    });
  }

  return rows.slice(0, 20);
}

export async function buildDashboard(
  staff: { userId: string; adminRole: AdminRole },
  opts: { tab: OpsQueueTab; q: string },
): Promise<{ badges: AdminOpsBadges; role: AdminRole; dashboard: OpsDashboard }> {
  const role = staff.adminRole;
  const badges = await buildBadges(role);

  if (role === 'finance') {
    const [eligibleAmountKobo, payoutsOnHold, failedPayouts, uncertainRefunds] = await Promise.all([
      sumEligiblePayoutNet(),
      countPayoutsOnHold(),
      countPayoutsFailed(),
      countRefundsUncertain(),
    ]);
    return {
      badges,
      role,
      dashboard: {
        kind: 'finance',
        payoutsEligible: badges.payouts,
        eligibleAmountKobo,
        payoutsOnHold,
        refundsToExecute: badges.refunds,
        failedOps: failedPayouts + uncertainRefunds,
        aiUnavailable: true,
      },
    };
  }

  if (role === 'support') {
    const [reportMeta, decidedNeedsContact, rows] = await Promise.all([
      loadReportCases(staff.userId),
      countDecidedNeedsContact(),
      buildSupportRows(staff.userId),
    ]);
    return {
      badges,
      role,
      dashboard: {
        kind: 'support',
        myOpenCases: reportMeta.assignedToMe + badges.disputes,
        ordersNeedingHelp: badges.orders,
        escalations: reportMeta.escalated,
        decidedNeedsContact,
        rows,
        aiUnavailable: true,
      },
    };
  }

  if (role === 'super_admin') {
    const disputes = (await loadDisputeWindow()) as Record<string, unknown>[];
    const [
      flaggedUsers,
      payoutsOnHold,
      failedPayouts,
      uncertainRefunds,
      banRecommendations,
      sensitiveActions,
    ] = await Promise.all([
      countFlaggedUsers(),
      countPayoutsOnHold(),
      countPayoutsFailed(),
      countRefundsUncertain(),
      loadBanRecommendations(),
      loadSensitiveActions(role, staff.userId),
    ]);
    return {
      badges,
      role,
      dashboard: {
        kind: 'super_admin',
        disputesOpen: badges.disputes,
        disputesUrgent: countUrgentDisputes(disputes),
        disputesDecisionReady: countDecisionReady(disputes),
        reportsOpen: badges.reports,
        liveIncidents: badges.live,
        flaggedUsers,
        payoutsEligible: badges.payouts,
        payoutsOnHold,
        failedOps: failedPayouts + uncertainRefunds,
        banRecommendations,
        sensitiveActions,
        aiUnavailable: true,
      },
    };
  }

  // trust_safety
  const disputes = (await loadDisputeWindow()) as Record<string, unknown>[];
  const nameIds = disputes.flatMap((d) => [String(d.buyer_id), String(d.seller_id)]);
  const [names, held, reportMeta, liveCases, sensitiveActions] = await Promise.all([
    loadUsernameMap(nameIds),
    payoutHoldByDispute(disputes.map((d) => String(d.id))),
    loadReportCases(staff.userId),
    loadLiveIncidentCases(),
    loadSensitiveActions(role, staff.userId),
  ]);

  const disputeCases = disputes.map((d) => disputeToCase(d, names, held));
  const merged = filterCases(
    [...disputeCases, ...reportMeta.cases, ...liveCases],
    opts.tab,
    opts.q,
  );

  return {
    badges,
    role,
    dashboard: {
      kind: 'trust_safety',
      urgentDisputes: countUrgentDisputes(disputes),
      openDisputes: badges.disputes,
      openReports: badges.reports,
      liveIncidents: badges.live,
      cases: merged.slice(0, 80),
      assignedToMe: reportMeta.assignedToMe,
      awaitingDecision: countDecisionReady(disputes),
      sensitiveActions,
      aiUnavailable: true,
    },
  };
}
