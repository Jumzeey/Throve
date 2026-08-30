import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServiceClient } from '../src/lib/supabase.js';
import {
  DEFAULT_SHIPPING,
  listingUuid,
  liveUuid,
  SEED_LISTINGS,
  SEED_LIVE,
  SEED_REVIEWS,
  SEED_USERS,
  userUuid,
  usernameToKey,
} from './seed-data.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const admin = createServiceClient();

async function ensureUser(user: (typeof SEED_USERS)[number]) {
  const id = userUuid(user.key);
  const metadata = { name: user.name, username: user.username, dob: user.dob ?? '' };

  const created = await admin.auth.admin.createUser({
    id,
    email: user.email,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (created.error && !created.error.message.toLowerCase().includes('already')) {
    throw new Error(`User ${user.username}: ${created.error.message}`);
  }

  const { error } = await admin
    .from('profiles')
    .update({
      email: user.email,
      name: user.name,
      username: user.username,
      dob: user.dob ?? null,
      bio: user.bio ?? '',
      location: user.location ?? '',
      setup_complete: user.setupComplete ?? false,
      can_host_live: user.canHostLive ?? false,
    })
    .eq('id', id);

  if (error) throw error;
  return id;
}

async function seedListings(userIds: Map<string, string>) {
  for (const item of SEED_LISTINGS) {
    const sellerKey = usernameToKey(item.seller);
    if (!sellerKey) throw new Error(`Unknown seller ${item.seller}`);
    const sellerId = userIds.get(item.seller)!;
    const photos = Array.from({ length: item.photoCount }, (_, index) => `seed://${item.slug}/${index + 1}`);

    const { error } = await admin.from('listings').upsert(
      {
        id: listingUuid(item.slug),
        seller_id: sellerId,
        title: item.title,
        brand: item.brand,
        price: item.price,
        size: item.size,
        condition: item.condition,
        department: item.department,
        category: item.category,
        status: item.status,
        description: item.description,
        shipping: DEFAULT_SHIPPING,
        colour: item.colour ?? null,
        photo_urls: photos,
        created_at: `${item.createdAt}T12:00:00.000Z`,
      },
      { onConflict: 'id' },
    );

    if (error) throw error;
  }
}

async function seedSavedListings(userIds: Map<string, string>) {
  for (const item of SEED_LISTINGS) {
    if (!item.savedBy?.length) continue;
    const listingId = listingUuid(item.slug);
    for (const username of item.savedBy) {
      const userId = userIds.get(username);
      if (!userId) continue;
      const { error } = await admin.from('saved_listings').upsert(
        { user_id: userId, listing_id: listingId },
        { onConflict: 'user_id,listing_id' },
      );
      if (error) throw error;
    }
  }
}

async function seedReviews(userIds: Map<string, string>) {
  for (const review of SEED_REVIEWS) {
    const sellerId = userIds.get(review.seller);
    const buyerId = userIds.get(review.buyer);
    if (!sellerId || !buyerId) continue;

    const { data: existing } = await admin
      .from('reviews')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('buyer_id', buyerId)
      .eq('comment', review.comment)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from('reviews').insert({
      seller_id: sellerId,
      buyer_id: buyerId,
      rating: review.rating,
      comment: review.comment,
    });
    if (error) throw error;
  }
}

async function seedLive(userIds: Map<string, string>) {
  for (const session of SEED_LIVE) {
    const hostId = userIds.get(session.host);
    if (!hostId) throw new Error(`Unknown host ${session.host}`);

    const sessionId = liveUuid(session.key);
    const pinnedListingId = session.pinnedListing ? listingUuid(session.pinnedListing) : null;
    const featuredIds = (session.featuredListingSlugs ?? []).map(listingUuid);

    const { error: sessionError } = await admin.from('live_sessions').upsert(
      {
        id: sessionId,
        host_id: hostId,
        title: session.title,
        status: session.status,
        viewers: session.viewers ?? null,
        scheduled_at: session.scheduledAt ?? null,
        department: session.department ?? null,
        pinned_listing_id: pinnedListingId,
        featured_listing_ids: featuredIds,
        livekit_room_name: `live_${sessionId}`,
        started_at: session.status === 'live' ? new Date().toISOString() : null,
      },
      { onConflict: 'id' },
    );
    if (sessionError) throw sessionError;

    if (session.featuredListingSlugs?.length) {
      for (const [index, slug] of session.featuredListingSlugs.entries()) {
        const listingId = listingUuid(slug);
        const listing = SEED_LISTINGS.find((row) => row.slug === slug);
        const { data: product, error: productError } = await admin
          .from('live_stream_products')
          .upsert(
            {
              live_session_id: sessionId,
              listing_id: listingId,
              live_price: listing?.price ?? 0,
              stock: 1,
              reserved_count: 0,
              sold_count: 0,
              is_pinned: slug === session.pinnedListing,
              sort_order: index,
            },
            { onConflict: 'live_session_id,listing_id' },
          )
          .select('id')
          .single();
        if (productError) throw productError;

        if (slug === session.pinnedListing && product) {
          await admin.from('live_sessions').update({ pinned_listing_id: listingId }).eq('id', sessionId);
        }
      }
    }

    if (session.comments?.length) {
      for (const comment of session.comments) {
        const userId = userIds.get(comment.user);
        if (!userId) continue;
        const { data: existing } = await admin
          .from('live_comments')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .eq('text', comment.text)
          .maybeSingle();
        if (existing) continue;

        const { error } = await admin.from('live_comments').insert({
          session_id: sessionId,
          user_id: userId,
          text: comment.text,
        });
        if (error) throw error;
      }
    }
  }
}

async function main() {
  console.log('Seeding Throve demo data…');

  const userIds = new Map<string, string>();
  for (const user of SEED_USERS) {
    const id = await ensureUser(user);
    userIds.set(user.username, id);
    console.log(`  user  ${user.username}`);
  }

  await seedListings(userIds);
  console.log(`  ${SEED_LISTINGS.length} listings`);

  await seedSavedListings(userIds);
  console.log('  saved listings');

  await seedReviews(userIds);
  console.log(`  ${SEED_REVIEWS.length} reviews`);

  await seedLive(userIds);
  console.log(`  ${SEED_LIVE.length} live sessions`);

  console.log('Done. Reload the app — Home, Browse, Live and Search should show demo catalog.');
  console.log('Demo seller login: ada.thrifts@throve.dev (use Simulate on login)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
