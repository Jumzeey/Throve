import { createServiceClient } from './supabase.js';
import { notifyUser } from './notify.js';

/** Notify users who saved a listing (excluding given user ids). Never throws. */
export async function notifySavedListingWatchers(input: {
  listingId: string;
  listingTitle: string;
  type: 'saved_listing_sold' | 'saved_listing_removed';
  title: string;
  excludeUserIds?: string[];
}): Promise<void> {
  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from('saved_listings')
      .select('user_id')
      .eq('listing_id', input.listingId);
    if (error) {
      console.warn('[saved-listing-alerts]', error.message);
      return;
    }

    const exclude = new Set((input.excludeUserIds ?? []).filter(Boolean));
    const userIds = [...new Set((data ?? []).map((row) => String(row.user_id)).filter((id) => id && !exclude.has(id)))];
    if (!userIds.length) return;

    await Promise.all(
      userIds.map((userId) =>
        notifyUser({
          userId,
          category: 'listing',
          type: input.type,
          title: input.title,
          body: input.listingTitle,
          deepLink: `product/${input.listingId}`,
          data: { listingId: input.listingId },
        }),
      ),
    );
  } catch (err) {
    console.warn('[saved-listing-alerts]', err instanceof Error ? err.message : err);
  }
}
