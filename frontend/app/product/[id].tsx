import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { OfferSheet } from '@/components/ui/offer-sheet';
import { PhotoPager } from '@/components/ui/photo-pager';
import { StarRating } from '@/components/ui/star-rating';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getSellerAvatar } from '@/data/images';
import { formatNaira } from '@/lib/format';
import { ChevronBackIcon, HeartIcon } from '@/components/ui/icons';
import { StatusChip } from '@/components/ui/status-chip';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { getListing, toggleSave } = useListings();
  const inbox = useInbox();
  const checkout = useCheckout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = id ? getListing(id) : undefined;
  const [offerOpen, setOfferOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 2000);
    return () => clearTimeout(timer);
  }, [banner]);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  if (!listing) {
    return (
      <View style={styles.screen}>
        <Pressable onPress={() => router.back()} style={[styles.missingBack, { marginTop: insets.top + 12 }]}>
          <ChevronBackIcon />
        </Pressable>
        <Text style={styles.missing}>This listing is unavailable.</Text>
      </View>
    );
  }

  const product = listing;
  const username = session.username;
  const saved = product.savedBy.includes(username);
  const statusChip = product.status === 'available' ? null : product.status === 'reserved' ? 'reserved' as const : 'sold' as const;
  const isOwn = username === product.seller;
  const canOffer = !isOwn && product.status === 'available';
  const canBuy = !isOwn && product.status === 'available';
  const sellerRating = checkout.ratingInfo(product.seller);

  async function messageSeller() {
    const conv = await inbox.openOrCreateConversation(product.seller, product.id, username);
    router.push(`/inbox/chat/${conv.id}`);
  }

  async function buyNow() {
    const started = await checkout.startCheckout({ listingId: product.id, buyer: username, liveSessionId: null });
    if (started) router.push('/checkout/shipping');
  }

  return (
    <View style={styles.screen}>
      <ScrollView>
        <View>
          <PhotoPager count={listing.photoCount} listingId={listing.id} />
          <View style={styles.heroActions} pointerEvents="box-none">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={[styles.circleBtn, { top: insets.top + 8, left: 14 }]}>
              <ChevronBackIcon />
            </Pressable>
            <Pressable
              onPress={() => {
                void toggleSave(product.id, username).catch(() => setBanner('Could not save this item.'));
              }}
              hitSlop={8}
              style={[styles.circleBtn, { top: insets.top + 8, right: 14 }]}>
              <HeartIcon size={16} filled={saved} color={saved ? Palette.plum : Palette.espresso} />
            </Pressable>
          </View>
          {statusChip ? (
            <View style={styles.status}>
              <StatusChip kind="listing" variant={statusChip} />
            </View>
          ) : null}
          {banner ? (
            <View style={[styles.banner, { top: insets.top + 8 }]}>
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{formatNaira(listing.price)}</Text>
          <View style={styles.chips}>
            <Chip label={`${listing.department} · ${listing.category}`} />
            <Chip label={listing.condition} />
            {listing.size && listing.size !== '—' ? <Chip label={`Size ${listing.size}`} /> : null}
            {listing.brand ? <Chip label={listing.brand} /> : null}
            {listing.colour ? <Chip label={listing.colour} /> : null}
          </View>
          <Text style={styles.sectionHead}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
          <Text style={styles.sectionHead}>Shipping</Text>
          <Text style={styles.shipping}>{listing.shipping}</Text>
          <Text style={styles.sectionHead}>Seller</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/seller/[username]', params: { username: listing.seller } })}
            style={styles.sellerCard}>
            <AppImage source={getSellerAvatar(listing.seller)} style={styles.sellerAvatar} />
            <View style={styles.sellerMeta}>
              <Text style={styles.sellerName}>@{listing.seller}</Text>
              <View style={styles.ratingRow}>
                <StarRating rating={sellerRating.avg} size={12} />
                <Text style={styles.sellerRating}>
                  {sellerRating.count > 0 ? `(${sellerRating.count})` : 'No reviews'}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          {!isOwn ? (
            <Button label="Message seller" variant="secondary" onPress={messageSeller} style={styles.messageSeller} />
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!isOwn ? (
          <Button
            label="Make an offer"
            variant="secondary"
            disabled={!canOffer}
            onPress={() => setOfferOpen(true)}
            style={styles.actionBtn}
          />
        ) : null}
        {canBuy ? <Button label="Buy now" onPress={buyNow} style={styles.actionBtn} /> : null}
      </View>
      {!isOwn ? (
        <OfferSheet
          visible={offerOpen}
          listingPrice={product.price}
          onClose={() => setOfferOpen(false)}
          onSubmit={(amount) => {
            void inbox
              .createOffer({
                listingId: product.id,
                buyer: username,
                seller: product.seller,
                amount,
                initiator: 'buyer',
              })
              .then((created) => {
                setOfferOpen(false);
                if (created) setBanner(`Offer of ${formatNaira(amount)} sent`);
              });
          }}
        />
      ) : null}
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  heroActions: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 4,
  },
  circleBtn: {
    position: 'absolute',
    zIndex: 2,
    elevation: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,247,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    position: 'absolute',
    bottom: 12,
    left: 14,
  },
  banner: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Palette.plum,
    borderRadius: Radius.md,
  },
  bannerText: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.ivory, textAlign: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },
  title: {
    fontSize: 27,
    lineHeight: 32,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  price: {
    marginTop: 7,
    fontSize: 18,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.plum,
  },
  sectionHead: {
    marginTop: 18,
    marginBottom: 6,
    fontSize: 19,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Palette.ivoryElevated, borderWidth: 1, borderColor: Palette.border },
  chipText: { fontSize: 12, fontFamily: Typography.body, color: Palette.muted },
  description: { fontSize: 13.5, lineHeight: 23, fontFamily: Typography.body, color: Palette.body },
  shipping: { fontSize: 13, lineHeight: 20, fontFamily: Typography.body, color: Palette.muted },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
  },
  sellerAvatar: { width: 34, height: 34, borderRadius: 17 },
  sellerMeta: { flex: 1 },
  sellerName: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sellerRating: { fontSize: 12, fontFamily: Typography.body, color: Palette.muted },
  chevron: { fontSize: 20, color: Palette.muted, fontFamily: Typography.body },
  messageSeller: { marginTop: 12 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivory,
  },
  actionBtn: { flex: 1, paddingHorizontal: 12 },
  missing: { marginTop: 40, textAlign: 'center', fontFamily: Typography.body, color: Palette.muted },
  missingBack: { marginLeft: 20 },
});
