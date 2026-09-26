import { apiFetch } from '@/lib/api';

export type AdminListingDto = {
  id: string;
  title: string;
  brand: string;
  price: number;
  size: string;
  condition: string;
  department: string;
  category: string;
  seller: string;
  status: string;
  description: string;
  shipping: string;
  photoCount: number;
  photoUrls: string[];
  createdAt: string;
  colour?: string;
  reviewSubmittedAt?: string;
  reviewReason?: string;
  reviewedAt?: string;
};

export type AdminListingHistoryEvent = {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone?: 'ok' | 'warn' | 'danger';
};

export type AdminListingDetail = {
  listing: AdminListingDto;
  history: AdminListingHistoryEvent[];
};

export function fetchAdminListings(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{ listings: AdminListingDto[]; counts: { pending: number } }>(
    `/admin/listings?queue=${queue}&q=${query}`,
  );
}

export function fetchAdminListing(id: string) {
  return apiFetch<AdminListingDetail>(`/admin/listings/${id}`);
}

export function approveAdminListing(id: string, reason?: string) {
  return apiFetch<AdminListingDetail>(`/admin/listings/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function rejectAdminListing(id: string, reason: string) {
  return apiFetch<AdminListingDetail>(`/admin/listings/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function hideAdminListing(id: string, reason: string) {
  return apiFetch<AdminListingDetail>(`/admin/listings/${id}/hide`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function restoreAdminListing(id: string, reason: string) {
  return apiFetch<AdminListingDetail>(`/admin/listings/${id}/restore`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function noteAdminListing(id: string, reason: string) {
  return apiFetch<AdminListingDetail>(`/admin/listings/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function escalateAdminListing(id: string, reason: string) {
  return apiFetch<AdminListingDetail>(`/admin/listings/${id}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
