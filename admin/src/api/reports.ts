import { apiFetch } from '@/lib/api';
import type { AdminReport } from '@/types/domain';

export type AdminReportDto = AdminReport;

export type AdminReportCounts = {
  all: number;
  open: number;
  high: number;
  repeat: number;
  escalated: number;
  action_taken: number;
  closed: number;
  assigned_me: number;
};

export type AdminReportDetail = {
  report: AdminReportDto;
};

export function fetchAdminReports(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    reports: AdminReportDto[];
    counts: AdminReportCounts;
  }>(`/admin/reports?queue=${encodeURIComponent(queue)}&q=${query}`);
}

export function fetchAdminReport(id: string) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}`);
}

export function noteAdminReport(id: string, reason: string) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function escalateAdminReport(id: string, reason: string) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function assignAdminReport(id: string, reason?: string, assigneeId?: string) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify({
      ...(reason ? { reason } : {}),
      ...(assigneeId ? { assigneeId } : {}),
    }),
  });
}

export function dismissAdminReport(id: string, reason: string) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function closeAdminReport(id: string, reason: string) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}/close`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function actionTakenAdminReport(id: string, reason: string) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}/action-taken`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function associateAdminReport(id: string, reason: string, linkedReportIds?: string[]) {
  return apiFetch<AdminReportDetail>(`/admin/reports/${encodeURIComponent(id)}/associate`, {
    method: 'POST',
    body: JSON.stringify({
      reason,
      ...(linkedReportIds?.length ? { linkedReportIds } : {}),
    }),
  });
}
