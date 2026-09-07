import type { Listing } from '@/data/types';

/** Newest first, at most `limit` listings per seller. */
export function latestPerSeller(listings: Listing[], limit: number) {
  const sorted = [...listings].sort((a, b) => {
    const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
  const counts = new Map<string, number>();
  const out: Listing[] = [];
  for (const listing of sorted) {
    const key = listing.seller.trim().toLowerCase();
    const n = counts.get(key) ?? 0;
    if (n >= limit) continue;
    counts.set(key, n + 1);
    out.push(listing);
  }
  return out;
}

/** Home + See all: latest listings shown per followed seller. */
export const FOLLOWING_PREVIEW_PER_SELLER = 3;
