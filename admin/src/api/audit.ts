import { apiFetch } from '@/lib/api';
import type { AdminAudit } from '@/types/domain';

export type AdminAuditDto = AdminAudit & {
  aiUnavailable?: boolean;
};

export type AdminAuditCounts = {
  all: number;
  completed: number;
  denied: number;
};

export type AdminAuditDetail = {
  event: AdminAuditDto;
};

export function fetchAdminAuditEvents(params: {
  date: string;
  module: string;
  result: string;
  actorRole: string;
  q: string;
}) {
  const qs = new URLSearchParams({
    date: params.date,
    module: params.module,
    result: params.result,
    actorRole: params.actorRole,
    q: params.q.trim(),
  });
  return apiFetch<{
    events: AdminAuditDto[];
    counts: AdminAuditCounts;
  }>(`/admin/audit?${qs.toString()}`);
}

export function fetchAdminAuditEvent(id: string) {
  return apiFetch<AdminAuditDetail>(`/admin/audit/${encodeURIComponent(id)}`);
}
