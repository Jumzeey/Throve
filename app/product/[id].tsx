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
import Ionicons from '@expo/vector-icons/Ionicons';
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
          <Ionicons name="chevron-back" size={18} color={Palette.text} />
        </Pressable>
        <Text style={styles.missing}>This listing is unavailable.</Text>
      </View>
    );
  }

  const product = listing;
  const username = session.username;
  const saved = product.savedBy.includes(username);
  const statusLabel = product.status === 'available' ? null : product.status === 'reserved' ? 'Reserved' : 'Sold';
  const isOwn = username === product.seller;
  const canOffer = !isOwn && product.status === 'available';
  const canBuy = !isOwn && product.status === 'available';
  const sellerRating = checkout.ratingInfo(product.seller);

  function messageSeller() {
    const conv = inbox.openOrCreateConversation(product.seller, product.id, username);
    router.push(`/inbox/chat/${conv.id}`);
  }

  function buyNow() {
    const started = checkout.startCheckout({ listingId: product.id, buyer: username, liveSessionId: null });
    if (started) router.push('/checkout/shipping');
  }

  return (
    <View style={styles.screen}>
      <ScrollView>
        <View>
          <PhotoPager count={listing.photoCount} listingId={listing.id} />
          <Pressable onPress={() => router.back()} style={[styles.circleBtn, { top: insets.top + 8, left: 14 }]}>
            <Ionicons name="chevron-back" size={18} color={Palette.text} />
          </Pressable>
          <Pressable onPress={() => toggleSave(product.id, username)} style={[styles.circleBtn, { top: insets.top + 8, right: 14 }]}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={16} color={saved ? Palette.live : Palette.muted2} />
          </Pressable>
          {statusLabel ? (
            <View style={[styles.status, listing.status === 'reserved' ? styles.reserved : styles.sold]}>
              <Text style={[styles.statusText, listing.status === 'reserved' ? styles.reservedText : styles.soldText]}>
                {statusLabel.toUpperCase()}
              </Text>
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
          <Text style={styles.description}>{listing.description}</Text>
          <Text style={styles.shipping}>{listing.shipping}</Text>
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
            <Ionicons name="chevron-forward" size={16} color={Palette.muted2} />
          </Pressable>
        </View>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!isOwn ? <Button label="Message" variant="secondary" onPress={messageSeller} style={styles.actionSm} /> : null}
        {!isOwn ? <Button label="Make offer" variant="secondary" disabled={!canOffer} onPress={() => setOfferOpen(true)} style={styles.actionSm} /> : null}
        {canBuy ? <Button label="Buy now" onPress={buyNow} style={styles.actionLg} /> : null}
      </View>
      {!isOwn ? (
        <OfferSheet
          visible={offerOpen}
          listingPrice={product.price}
          onClose={() => setOfferOpen(false)}
          onSubmit={(amount) => {
            const created = inbox.createOffer({
              listingId: product.id,
              buyer: username,
              seller: product.seller,
              amount,
              initiator: 'buyer',
            });
            setOfferOpen(false);
            if (created) setBanner(`Offer of ${formatNaira(amount)} sent`);
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
  screen: { flex: 1, backgroundColor: Palette.background },
  circleBtn: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  reserved: { backgroundColor: Palette.accent100 },
  sold: { backgroundColor: Palette.chipBg },
  statusText: { fontSize: 10, fontFamily: Typography.bodySemiBold, letterSpacing: 0.5 },
  reservedText: { color: Palette.accent700 },
  soldText: { color: Palette.muted },
  banner: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Palette.accent,
    borderRadius: Radius.md,
  },
  bannerText: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.background, textAlign: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: Typography.heading,
    color: Palette.text,
  },
  price: {
    marginTop: 4,
    fontSize: 22,
    fontFamily: Typography.headingBold,
    color: Palette.accent700,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Palette.chipBg },
  chipText: { fontSize: 12, fontFamily: Typography.body, color: Palette.muted },
  description: { marginTop: 16, fontSize: 14, lineHeight: 22, fontFamily: Typography.body, color: Palette.muted },
  shipping: { marginTop: 12, fontSize: 13, lineHeight: 20, fontFamily: Typography.body, color: Palette.muted2 },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
  },
  sellerAvatar: { width: 34, height: 34, borderRadius: 17 },
  sellerMeta: { flex: 1 },
  sellerName: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sellerRating: { fontSize: 12, fontFamily: Typography.body, color: Palette.muted2 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
  },
  actionSm: { flex: 1 },
  actionLg: { flex: 1.4 },
  missing: { marginTop: 40, textAlign: 'center', fontFamily: Typography.body, color: Palette.muted2 },
  missingBack: { marginLeft: 20 },
});
