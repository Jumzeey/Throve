import { apiFetch } from '@/lib/api';
import type { AdminPayment } from '@/types/domain';

export type AdminPaymentDto = AdminPayment & {
  dbStatus?: string;
  txRef?: string;
};

export type AdminPaymentDetail = {
  payment: AdminPaymentDto;
};

export type AdminPaymentCounts = {
  needs_attention: number;
  uncertain: number;
  failed: number;
  duplicate: number;
  successful: number;
};

export function fetchAdminPayments(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    payments: AdminPaymentDto[];
    counts: AdminPaymentCounts;
  }>(`/admin/payments?queue=${queue}&q=${query}`);
}

export function fetchAdminPayment(id: string) {
  return apiFetch<AdminPaymentDetail>(`/admin/payments/${id}`);
}

export function noteAdminPayment(id: string, reason: string) {
  return apiFetch<AdminPaymentDetail>(`/admin/payments/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function reconcileAdminPayment(id: string, reason: string) {
  return apiFetch<AdminPaymentDetail>(`/admin/payments/${id}/reconcile`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
