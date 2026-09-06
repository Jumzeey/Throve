import type { DbRow } from './db-types.js';

export type LiveStreamProductDto = {
  id: string;
  liveSessionId: string;
  listingId: string;
  livePrice: number;
  stock: number;
  reservedCount: number;
  soldCount: number;
  available: number;
  isPinned: boolean;
  sortOrder: number;
  title?: string;
  photoUrls?: string[];
  category?: string;
  department?: string;
  size?: string;
  condition?: string;
};

export type LiveClaimDto = {
  id: string;
  sessionId: string;
  productId: string;
  listingId: string;
  username: string;
  quantity: number;
  status: 'active' | 'converted' | 'expired' | 'released';
  expiresAt: number;
};

export function mapLiveStreamProduct(row: DbRow, listing?: DbRow | null): LiveStreamProductDto {
  const stock = Number(row.stock ?? 0);
  const reserved = Number(row.reserved_count ?? 0);
  const sold = Number(row.sold_count ?? 0);
  return {
    id: String(row.id),
    liveSessionId: String(row.live_session_id),
    listingId: String(row.listing_id),
    livePrice: Number(row.live_price ?? 0),
    stock,
    reservedCount: reserved,
    soldCount: sold,
    available: Math.max(0, stock - reserved - sold),
    isPinned: Boolean(row.is_pinned),
    sortOrder: Number(row.sort_order ?? 0),
    title: listing?.title ? String(listing.title) : undefined,
    photoUrls: Array.isArray(listing?.photo_urls) ? (listing.photo_urls as string[]) : undefined,
    category: listing?.category ? String(listing.category) : undefined,
    department: listing?.department ? String(listing.department) : undefined,
    size: listing?.size ? String(listing.size) : undefined,
    condition: listing?.condition ? String(listing.condition) : undefined,
  };
}

export function mapLiveClaim(row: DbRow, username: string): LiveClaimDto {
  return {
    id: String(row.id),
    sessionId: String(row.live_session_id ?? row.session_id),
    productId: String(row.live_stream_product_id ?? ''),
    listingId: String(row.listing_id ?? ''),
    username,
    quantity: Number(row.quantity ?? 1),
    status: (row.status as LiveClaimDto['status']) ?? 'active',
    expiresAt: new Date(String(row.expires_at)).getTime(),
  };
}

export function mapLiveSession(
  row: DbRow,
  host: string,
  products?: LiveStreamProductDto[],
  moderators: string[] = [],
  hostPhotoUrl?: string | null,
) {
  const pinned = products?.find((p) => p.isPinned) ?? products?.[0];
  const category = pinned?.category ?? undefined;
  return {
    id: row.id,
    host,
    hostPhotoUrl: hostPhotoUrl ?? undefined,
    title: row.title,
    status: row.status,
    viewers: row.viewers ?? undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    pinnedListingId: pinned?.listingId ?? row.pinned_listing_id ?? undefined,
    pinnedProductId: pinned?.id,
    department: row.department ?? pinned?.department ?? undefined,
    category,
    description: row.description ?? undefined,
    featuredListingIds: row.featured_listing_ids ?? products?.map((p) => p.listingId) ?? [],
    livekitRoomName: row.livekit_room_name ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? pinned?.photoUrls?.[0] ?? undefined,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    products: products ?? [],
    moderators,
  };
}
