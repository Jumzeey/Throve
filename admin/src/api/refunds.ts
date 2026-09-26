import { apiFetch } from '@/lib/api';
import type { AdminRefund } from '@/types/domain';

export type AdminRefundDto = AdminRefund & {
  dbStatus?: string;
  paymentProvider?: string | null;
};

export type AdminRefundDetail = {
  refund: AdminRefundDto;
};

export function fetchAdminRefunds(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    refunds: AdminRefundDto[];
    counts: {
      awaiting: number;
      ready: number;
      processing: number;
      completed: number;
      uncertain: number;
    };
  }>(`/admin/refunds?queue=${queue}&q=${query}`);
}

export function fetchAdminRefund(id: string) {
  return apiFetch<AdminRefundDetail>(`/admin/refunds/${id}`);
}

export function executeAdminRefund(id: string, reason: string, includeDelivery?: boolean) {
  return apiFetch<AdminRefundDetail>(`/admin/refunds/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({
      reason,
      ...(typeof includeDelivery === 'boolean' ? { includeDelivery } : {}),
    }),
  });
}

export function retryAdminRefund(id: string, reason: string) {
  return apiFetch<AdminRefundDetail>(`/admin/refunds/${id}/retry`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function noteAdminRefund(id: string, reason: string) {
  return apiFetch<AdminRefundDetail>(`/admin/refunds/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function verifyAdminRefund(id: string) {
  return apiFetch<AdminRefundDetail>(`/admin/refunds/${id}/verify`, {
    method: 'POST',
    body: '{}',
  });
}
