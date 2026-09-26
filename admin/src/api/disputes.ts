import { apiFetch } from '@/lib/api';
import type { AdminDispute } from '@/types/domain';

export type AdminDisputeDto = AdminDispute & {
  dbStatus?: string;
};

export type AdminDisputeDetail = {
  dispute: AdminDisputeDto;
};

export type DecideOutcome = 'refund_buyer' | 'release_seller' | 'close';

export function fetchAdminDisputes(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    disputes: AdminDisputeDto[];
    counts: {
      open: number;
      decision_ready: number;
      evidence_incomplete: number;
      awaiting_buyer: number;
    };
  }>(`/admin/disputes?queue=${queue}&q=${query}`);
}

export function fetchAdminDispute(id: string) {
  return apiFetch<AdminDisputeDetail>(`/admin/disputes/${id}`);
}

export function decideAdminDispute(id: string, outcome: DecideOutcome, reason: string) {
  return apiFetch<AdminDisputeDetail>(`/admin/disputes/${id}/decide`, {
    method: 'POST',
    body: JSON.stringify({ outcome, reason }),
  });
}

export function noteAdminDispute(id: string, reason: string) {
  return apiFetch<AdminDisputeDetail>(`/admin/disputes/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function escalateAdminDispute(id: string, reason: string) {
  return apiFetch<AdminDisputeDetail>(`/admin/disputes/${id}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function decisionToApiOutcome(
  decision: 'Refund buyer' | 'Release to seller' | 'Close',
): DecideOutcome {
  if (decision === 'Refund buyer') return 'refund_buyer';
  if (decision === 'Release to seller') return 'release_seller';
  return 'close';
}
