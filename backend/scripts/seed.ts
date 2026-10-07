import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServiceClient } from '../src/lib/supabase.js';
import {
  DEFAULT_SHIPPING,
  listingUuid,
  SEED_LISTINGS,
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

  console.log('Done. Reload the app — Home, Browse and Search should show demo catalog.');
  console.log('Demo seller login: ada.thrifts@throve.dev (use Simulate on login)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
