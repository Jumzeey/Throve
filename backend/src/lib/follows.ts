import { createServiceClient } from './supabase.js';
import { followerNewListingEmail } from './email/templates/listings.js';

export type FollowStats = {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export async function getFollowStats(sellerId: string, viewerId?: string): Promise<FollowStats> {
  const admin = createServiceClient();
  const [{ count: followerCount }, { count: followingCount }, followLookup] = await Promise.all([
    admin.from('seller_follows').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId),
    admin.from('seller_follows').select('*', { count: 'exact', head: true }).eq('follower_id', sellerId),
    viewerId && viewerId !== sellerId
      ? admin
          .from('seller_follows')
          .select('follower_id')
          .eq('follower_id', viewerId)
          .eq('seller_id', sellerId)
          .maybeSingle()
      : Promise.resolve({ data: null as { follower_id: string } | null }),
  ]);

  return {
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    isFollowing: Boolean(followLookup.data),
  };
}

export async function listFollowerIds(sellerId: string): Promise<string[]> {
  const admin = createServiceClient();
  const { data, error } = await admin.from('seller_follows').select('follower_id').eq('seller_id', sellerId);
  if (error) {
    console.warn('[follows]', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.follower_id as string);
}

export async function notifyFollowersOfListing(input: {
  sellerId: string;
  sellerUsername: string;
  listingId: string;
  listingTitle: string;
  price: number;
  brand?: string;
  size?: string;
  condition?: string;
  photoUrl?: string;
}): Promise<void> {
  const followerIds = await listFollowerIds(input.sellerId);
  if (!followerIds.length) return;

  const email = followerNewListingEmail({
    listingId: input.listingId,
    title: input.listingTitle,
    sellerUsername: input.sellerUsername,
    price: input.price,
    brand: input.brand,
    size: input.size,
    condition: input.condition,
    photoUrl: input.photoUrl,
  });

  const { notifyUser } = await import('./notify.js');
  await Promise.all(
    followerIds.map((userId) =>
      notifyUser({
        userId,
        category: 'listing',
        type: 'seller_new_listing',
        title: `${input.sellerUsername} posted a new item`,
        body: input.listingTitle,
        data: {
          listingId: input.listingId,
          sellerUsername: input.sellerUsername,
        },
        deepLink: `product/${input.listingId}`,
        email,
      }),
    ),
  );
}
