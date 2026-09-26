import type { AdminRole } from './staff-rbac.js';

export type AuditDepth = 'full' | 'outcome_only' | 'status_only';
export type AuditUiModule =
  | 'Users'
  | 'Live'
  | 'Reviews'
  | 'Listings'
  | 'Orders'
  | 'Payments'
  | 'Refunds'
  | 'Payouts'
  | 'Disputes'
  | 'Access'
  | 'Reports';

export type AuditUiResult = 'Completed' | 'Denied';
export type AuditUiSensitivity = 'High' | 'Access' | 'Standard';

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  reason: string | null;
  meta: Record<string, unknown> | null;
  sensitivity: string;
};

export type AdminAuditDto = {
  id: string;
  at: string;
  atFull: string;
  actor: string;
  role: string;
  module: AuditUiModule;
  action: string;
  recordId: string;
  recordSub?: string;
  result: AuditUiResult;
  sensitivity: AuditUiSensitivity;
  hasAi: boolean;
  aiSummary?: string;
  aiUnavailable?: boolean;
  previousState?: string;
  resultingState?: string;
  reason?: string;
  confirmation?: { recommendedBy?: string; steps?: string; aiAssisted?: boolean };
  relatedEvents?: { id: string; label: string; openLabel: string }[];
  affectedRecordPath?: string | null;
  affectedRecordLabel?: string;
  recordUnavailable?: boolean;
  deniedBanner?: { title: string; body: string };
  visibility: Partial<Record<AdminRole, AuditDepth>>;
};

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  trust_safety: 'Trust & Safety',
  support: 'Customer Support',
  finance: 'Finance',
};

const ACTION_LABELS: Record<string, string> = {
  'user.note': 'Internal note added',
  'user.escalate': 'Account escalated',
  'user.restrict': 'Account restricted',
  'user.unrestrict': 'Restriction lifted',
  'user.suspend': 'Account suspended',
  'user.unsuspend': 'Suspension lifted',
  'user.recommend_ban': 'Permanent ban recommended',
  'user.ban': 'Permanent ban executed',
  'user.unban': 'Ban lifted',
  'user.approve_host': 'Live host approved',
  'user.revoke_host': 'Live host revoked',
  'listing.approve': 'Listing approved',
  'listing.reject': 'Listing rejected',
  'listing.hide': 'Listing hidden',
  'listing.restore': 'Listing restored',
  'listing.note': 'Listing note added',
  'listing.escalate': 'Listing escalated',
  'report.note': 'Report note added',
  'report.escalate': 'Report escalated',
  'report.assign': 'Report assigned',
  'report.dismiss': 'Report dismissed',
  'report.close': 'Report closed',
  'report.action_taken': 'Report action taken',
  'report.associate': 'Report associated',
  'live.note': 'Live note added',
  'live.escalate': 'Live session escalated',
  'live.end': 'Session ended for platform safety',
  'order.note': 'Order note added',
  'order.escalate': 'Order escalated',
  'dispute.note': 'Dispute note added',
  'dispute.escalate': 'Dispute escalated',
  'dispute.decide': 'Dispute decision recorded',
  'refund.note': 'Refund note added',
  'refund.verify': 'Refund verified',
  'refund.execute': 'Refund executed',
  'refund.retry': 'Refund retry',
  'payout.note': 'Payout note added',
  'payout.execute': 'Payout processed',
  'payout.retry': 'Payout retry',
  'payout.hold': 'Payout held',
  'payout.release': 'Payout released',
  'payment.note': 'Payment note added',
  'payment.reconcile': 'Payment reconciled',
};

export function moduleFromResourceType(resourceType: string): AuditUiModule {
  if (resourceType === 'user') return 'Users';
  if (resourceType === 'listing') return 'Listings';
  if (resourceType === 'report') return 'Reports';
  if (resourceType === 'live_session') return 'Live';
  if (resourceType === 'order') return 'Orders';
  if (resourceType === 'payment_intent') return 'Payments';
  if (resourceType === 'refund') return 'Refunds';
  if (resourceType === 'payout') return 'Payouts';
  if (resourceType === 'dispute') return 'Disputes';
  return 'Access';
}

export function pathFromResourceType(resourceType: string): string | null {
  if (resourceType === 'user') return '/users';
  if (resourceType === 'listing') return '/listings';
  if (resourceType === 'report') return '/reports';
  if (resourceType === 'live_session') return '/live';
  if (resourceType === 'order') return '/orders';
  if (resourceType === 'payment_intent') return '/payments';
  if (resourceType === 'refund') return '/refunds';
  if (resourceType === 'payout') return '/payouts';
  if (resourceType === 'dispute') return '/disputes';
  return null;
}

export function humanizeAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.endsWith('.denied')) {
    const base = action.replace(/\.denied$/, '');
    return `${humanizeAction(base)} attempt blocked`;
  }
  return action
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

export function roleLabel(role: string): string {
  if (role in ROLE_LABELS) return ROLE_LABELS[role as AdminRole];
  return role;
}

/**
 * Role-scoped visibility depth. null = hidden from this viewer.
 */
export function visibilityDepthFor(
  viewerRole: AdminRole,
  viewerId: string,
  row: Pick<AuditLogRow, 'actor_id' | 'action' | 'resource_type' | 'sensitivity'>,
): AuditDepth | null {
  if (viewerRole === 'super_admin') return 'full';

  const resource = String(row.resource_type);
  const action = String(row.action);
  const sensitivity = String(row.sensitivity ?? 'Standard');

  if (viewerRole === 'finance') {
    if (sensitivity === 'Access') return 'full';
    if (resource === 'refund' || resource === 'payout' || resource === 'payment_intent') return 'full';
    if (resource === 'dispute' && action === 'dispute.decide') return 'outcome_only';
    return null;
  }

  if (viewerRole === 'trust_safety') {
    if (
      resource === 'user' ||
      resource === 'listing' ||
      resource === 'report' ||
      resource === 'live_session' ||
      resource === 'dispute' ||
      resource === 'order'
    ) {
      return 'full';
    }
    if (resource === 'payout' && (action === 'payout.hold' || action === 'payout.release')) {
      return 'status_only';
    }
    return null;
  }

  if (viewerRole === 'support') {
    if (row.actor_id !== viewerId) return null;
    if (action.endsWith('.note') || action.endsWith('.escalate')) return 'full';
    return null;
  }

  return null;
}

export function formatAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAtFull(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WAT'
  );
}

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = meta?.[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

export function buildAuditDto(
  row: AuditLogRow,
  actorName: string,
  viewerRole: AdminRole,
  depth: AuditDepth,
  related: { id: string; label: string; openLabel: string }[] = [],
): AdminAuditDto {
  const meta = (row.meta && typeof row.meta === 'object' ? row.meta : {}) as Record<string, unknown>;
  const result: AuditUiResult = meta.result === 'denied' ? 'Denied' : 'Completed';
  const sensitivityRaw = String(row.sensitivity ?? 'Standard');
  const sensitivity: AuditUiSensitivity =
    sensitivityRaw === 'Access' || sensitivityRaw === 'High' ? sensitivityRaw : 'Standard';

  const previousState = metaString(meta, 'previousState');
  const resultingState = metaString(meta, 'resultingState');
  const recordSub = metaString(meta, 'recordSub');
  const module = moduleFromResourceType(row.resource_type);
  const actionLabel = humanizeAction(row.action);
  const path = pathFromResourceType(row.resource_type);

  const base: AdminAuditDto = {
    id: row.id,
    at: formatAt(row.created_at),
    atFull: formatAtFull(row.created_at),
    actor: actorName,
    role: roleLabel(row.actor_role),
    module,
    action: actionLabel,
    recordId: row.resource_id,
    recordSub,
    result,
    sensitivity,
    hasAi: false,
    aiUnavailable: true,
    visibility: { [viewerRole]: depth },
    affectedRecordPath: path,
    affectedRecordLabel: path ? 'Open affected record' : undefined,
    recordUnavailable: false,
  };

  if (result === 'Denied') {
    base.deniedBanner = {
      title: `${actionLabel}`,
      body: row.reason?.trim() || 'Role not permitted. Recorded with actor, role, target and result — no effect.',
    };
  }

  if (depth === 'full') {
    base.previousState = previousState;
    base.resultingState = resultingState;
    base.reason = row.reason ?? undefined;
    base.relatedEvents = related;
    if (row.reason?.trim()) {
      base.confirmation = { steps: 'Reason recorded' };
    }
  } else if (depth === 'outcome_only') {
    base.resultingState = resultingState ?? actionLabel;
  } else if (depth === 'status_only') {
    base.resultingState = resultingState ?? actionLabel;
  }

  return base;
}

export function dateCutoff(date: '7d' | '30d' | 'all'): string | null {
  if (date === 'all') return null;
  const days = date === '7d' ? 7 : 30;
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}
