import { apiFetch } from '@/lib/api';
import type { AdminOpsBadges } from '@/api/types';
import type { AdminOpsCase } from '@/types/domain';

export type { AdminOpsBadges };

export type OpsQueueTab = 'urgent' | 'all' | 'evidence';

export type OpsCase = AdminOpsCase;

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

export type OpsDashboardResponse = {
  badges: AdminOpsBadges;
  role: string;
  dashboard: OpsDashboard;
};

export function fetchOpsBadges() {
  return apiFetch<AdminOpsBadges>('/admin/ops/badges');
}

export function fetchOpsDashboard(tab: OpsQueueTab, q: string) {
  const qs = new URLSearchParams({
    tab,
    q: q.trim(),
  });
  return apiFetch<OpsDashboardResponse>(`/admin/ops/dashboard?${qs.toString()}`);
}
