import { apiFetch } from '@/lib/api';
import type { AdminUser } from '@/types/domain';

export type AdminUserDto = AdminUser & {
  dbStatus?: string;
};

export type AdminUserDetail = {
  user: AdminUserDto;
};

export type AdminUserCounts = {
  all: number;
  flagged: number;
  restricted: number;
  sellers: number;
  hosts: number;
  kyc: number;
};

export function fetchAdminUsers(filter: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    users: AdminUserDto[];
    counts: AdminUserCounts;
  }>(`/admin/users?filter=${encodeURIComponent(filter)}&q=${query}`);
}

export function fetchAdminUser(id: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
}

export function noteAdminUser(id: string, reason: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function escalateAdminUser(id: string, reason: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function restrictAdminUser(id: string, reason: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/restrict`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function suspendAdminUser(id: string, reason: string, until?: string | null) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason, ...(until ? { until } : {}) }),
  });
}

export function recommendBanAdminUser(id: string, reason: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/recommend-ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function banAdminUser(id: string, reason: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function approveHostAdminUser(id: string, reason: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/approve-host`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
