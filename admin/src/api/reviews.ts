import { apiFetch } from '@/lib/api';
import type { AdminReview } from '@/types/domain';

export type AdminReviewDto = AdminReview & {
  aiUnavailable?: boolean;
};

export type AdminReviewCounts = {
  all: number;
  flagged: number;
  reported: number;
  eligibility: number;
  with_comment: number;
};

export type AdminReviewDetail = {
  review: AdminReviewDto;
};

export function fetchAdminReviews(queue: string, q: string) {
  const query = encodeURIComponent(q.trim());
  return apiFetch<{
    reviews: AdminReviewDto[];
    counts: AdminReviewCounts;
  }>(`/admin/reviews?queue=${encodeURIComponent(queue)}&q=${query}`);
}

export function fetchAdminReview(id: string) {
  return apiFetch<AdminReviewDetail>(`/admin/reviews/${encodeURIComponent(id)}`);
}

export function noteAdminReview(id: string, reason: string) {
  return apiFetch<AdminReviewDetail>(`/admin/reviews/${encodeURIComponent(id)}/note`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function escalateAdminReview(id: string, reason: string) {
  return apiFetch<AdminReviewDetail>(`/admin/reviews/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function hideAdminReview(id: string, reason: string) {
  return apiFetch<AdminReviewDetail>(`/admin/reviews/${encodeURIComponent(id)}/hide`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
