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

export type StaffInvite = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  state: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
};

export function fetchStaffInvites() {
  return apiFetch<{ invites: StaffInvite[] }>('/admin/staff/invites');
}

export function inviteStaff(input: { email: string; name: string; role: AdminRole }) {
  return apiFetch<{ invite: StaffInvite }>('/admin/staff/invites', { method: 'POST', body: JSON.stringify(input) });
}

export function resendStaffInvite(id: string) {
  return apiFetch<{ invite: StaffInvite }>(`/admin/staff/invites/${encodeURIComponent(id)}/resend`, { method: 'POST' });
}

export function cancelStaffInvite(id: string) {
  return apiFetch<{ ok: true }>(`/admin/staff/invites/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export type InvitePreview = {
  email: string;
  name: string;
  role: AdminRole;
  expiresAt: string;
  existingAccount: boolean;
};

export function fetchInvitePreview(token: string) {
  return apiFetch<InvitePreview>(`/auth/staff/invite?token=${encodeURIComponent(token)}`);
}

export function acceptStaffInvite(input: { token: string; password: string; name?: string }) {
  return apiFetch<{ ok: true; email: string }>('/auth/staff/invite/accept', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
