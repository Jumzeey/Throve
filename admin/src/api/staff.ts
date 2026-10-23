import { apiFetch } from '@/lib/api';
import type { AdminRole } from '@/lib/roles';

export type StaffMember = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: AdminRole | null;
  active: boolean;
  accountStatus: string;
  deactivated: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

export function fetchStaff() {
  return apiFetch<{ staff: StaffMember[] }>('/admin/staff');
}

export function lookupStaffCandidate(q: string) {
  return apiFetch<{ user: StaffMember }>(`/admin/staff/lookup?q=${encodeURIComponent(q.trim())}`);
}

export function setStaffRole(id: string, role: AdminRole, reason: string) {
  return apiFetch<{ user: StaffMember | null }>(`/admin/staff/${encodeURIComponent(id)}/role`, {
    method: 'POST',
    body: JSON.stringify({ role, reason }),
  });
}

export function revokeStaff(id: string, reason: string) {
  return apiFetch<{ user: StaffMember | null }>(`/admin/staff/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function restoreStaff(id: string, reason: string) {
  return apiFetch<{ user: StaffMember | null }>(`/admin/staff/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function removeStaff(id: string, reason: string) {
  return apiFetch<{ ok: true }>(`/admin/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}
