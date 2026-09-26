/**
 * Shared admin API response shapes.
 * New /admin/{resource} list endpoints should return AdminListResponse.
 * Existing GET /admin/listings still uses { listings, counts } until its completion plan.
 */

/** Standard list envelope for new admin domains. */
export type AdminListResponse<T> = {
  items: T[];
  nextCursor: string | null;
  counts?: Record<string, number>;
};

/** Optional detail envelope. */
export type AdminDetailResponse<T> = {
  item: T;
};

/** Mutation success with updated entity. */
export type AdminMutationResponse<T> = {
  item: T;
};

/** Ops badge counts — GET /admin/ops/badges (Operations page plan). */
export type AdminOpsBadges = {
  listings: number;
  reports: number;
  live: number;
  disputes: number;
  orders: number;
  payments: number;
  refunds: number;
  payouts: number;
};

/** Error body from backend sendError / staff middleware. */
export type AdminApiErrorBody = {
  message: string;
  code?: string;
};

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(cursor: string): string {
  const padded = cursor.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Cursor helper for clients: encode/decode opaque page tokens.
 * Backend should use the same `created_at|id` convention when implementing cursor lists.
 */
export function encodeAdminCursor(createdAt: string, id: string): string {
  return toBase64Url(`${createdAt}|${id}`);
}

export function decodeAdminCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const raw = fromBase64Url(cursor);
    const idx = raw.indexOf('|');
    if (idx <= 0) return null;
    const createdAt = raw.slice(0, idx);
    const id = raw.slice(idx + 1);
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
