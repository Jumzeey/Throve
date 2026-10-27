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
  quantity?: number;
  quantitySold?: number;
  quantityHeld?: number;
  quantityAvailable?: number;
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
  /** Latest edit suggested to the seller, if any (any status). */
  editProposal?: ListingEditProposal | null;
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

export type ListingEditField =
  | 'title'
  | 'description'
  | 'brand'
  | 'department'
  | 'category'
  | 'size'
  | 'colour'
  | 'condition'
  | 'price';

export type ListingEditProposal = {
  id: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded' | 'withdrawn';
  note: string | null;
  sellerNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  fields: { field: ListingEditField; label: string; from: unknown; to: unknown }[];
};

export type ListingEditChanges = Partial<Record<Exclude<ListingEditField, 'price'>, string>> & { price?: number };

export function proposeListingEdit(id: string, changes: ListingEditChanges, note?: string) {
  return apiFetch<AdminListingDetail & { editProposal: ListingEditProposal | null }>(
    `/admin/listings/${id}/propose-edit`,
    { method: 'POST', body: JSON.stringify({ changes, ...(note ? { note } : {}) }) },
  );
}

export function withdrawListingEdit(id: string) {
  return apiFetch<AdminListingDetail & { editProposal: ListingEditProposal | null }>(
    `/admin/listings/${id}/withdraw-edit`,
    { method: 'POST' },
  );
}
