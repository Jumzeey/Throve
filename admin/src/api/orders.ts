import { apiFetch } from '@/lib/api';
import type { AdminOrder } from '@/types/domain';

export type AdminOrderDto = AdminOrder & {
  dbStatus?: string;
  paymentIntentId?: string;
};

export type AdminOrderDetail = {
  order: AdminOrderDto;
};

export type AdminOrderCounts = {
  needs_assistance: number;
  paid: number;
  awaiting_dispatch: number;
  in_transit: number;
  delivered: number;
  completed: number;
  cancelled: number;
};

export function fetchAdminOrders(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    orders: AdminOrderDto[];
    counts: AdminOrderCounts;
  }>(`/admin/orders?queue=${encodeURIComponent(queue)}&q=${query}`);
}

export function fetchAdminOrder(id: string) {
  return apiFetch<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`);
}

export function noteAdminOrder(id: string, reason: string) {
  return apiFetch<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function escalateAdminOrder(id: string, reason: string) {
  return apiFetch<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
