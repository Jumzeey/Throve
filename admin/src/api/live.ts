import { apiFetch } from '@/lib/api';
import type { AdminLive } from '@/types/domain';

export type AdminLiveDto = AdminLive & {
  /** Present on API rows: session is still broadcasting (DB status live). */
  broadcasting?: boolean;
  aiUnavailable?: boolean;
};

export type AdminLiveCounts = {
  all: number;
  live: number;
  upcoming: number;
  ended: number;
  incidents: number;
};

export type AdminLiveDetail = {
  session: AdminLiveDto;
};

export function fetchAdminLiveSessions(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    sessions: AdminLiveDto[];
    counts: AdminLiveCounts;
  }>(`/admin/live?queue=${encodeURIComponent(queue)}&q=${query}`);
}

export function fetchAdminLiveSession(id: string) {
  return apiFetch<AdminLiveDetail>(`/admin/live/${encodeURIComponent(id)}`);
}

export function noteAdminLive(id: string, reason: string) {
  return apiFetch<AdminLiveDetail>(`/admin/live/${encodeURIComponent(id)}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function escalateAdminLive(id: string, reason: string) {
  return apiFetch<AdminLiveDetail>(`/admin/live/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function endAdminLive(id: string, reason: string) {
  return apiFetch<AdminLiveDetail>(`/admin/live/${encodeURIComponent(id)}/end`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
