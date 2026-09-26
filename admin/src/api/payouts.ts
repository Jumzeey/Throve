import { apiFetch } from '@/lib/api';
import type { AdminPayout } from '@/types/domain';

export type AdminPayoutDto = AdminPayout & {
  dbStatus?: string;
};

export type AdminPayoutDetail = {
  payout: AdminPayoutDto;
};

export function fetchAdminPayouts(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    payouts: AdminPayoutDto[];
    counts: {
      eligible: number;
      on_hold: number;
      verification: number;
      processing: number;
      failed: number;
      paid: number;
      not_eligible: number;
    };
  }>(`/admin/payouts?queue=${queue}&q=${query}`);
}

export function fetchAdminPayout(id: string) {
  return apiFetch<AdminPayoutDetail>(`/admin/payouts/${id}`);
}

export function executeAdminPayout(id: string, reason: string) {
  return apiFetch<AdminPayoutDetail>(`/admin/payouts/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function retryAdminPayout(id: string, reason: string) {
  return apiFetch<AdminPayoutDetail>(`/admin/payouts/${id}/retry`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function holdAdminPayout(id: string, reason: string) {
  return apiFetch<AdminPayoutDetail>(`/admin/payouts/${id}/hold`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function releaseAdminPayout(id: string, reason: string) {
  return apiFetch<AdminPayoutDetail>(`/admin/payouts/${id}/release`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function verifyAdminPayout(id: string) {
  return apiFetch<AdminPayoutDetail>(`/admin/payouts/${id}/verify`, { method: 'POST' });
}

export function noteAdminPayout(id: string, reason: string) {
  return apiFetch<AdminPayoutDetail>(`/admin/payouts/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
