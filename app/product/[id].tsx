import { Button } from '@/components/ui/button';
import { OfferSheet } from '@/components/ui/offer-sheet';
import { PhotoPager } from '@/components/ui/photo-pager';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { formatNaira, starString } from '@/lib/format';
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

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!listing) {
    return (
      <View style={styles.screen}>
        <Pressable onPress={() => router.back()} style={[styles.missingBack, { marginTop: insets.top + 12 }]}>
          <Text style={styles.backText}>←</Text>
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
  const sellerLine = sellerRating.count > 0 ? `${starString(sellerRating.avg)} (${sellerRating.count} reviews)` : 'No reviews yet';

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
          <PhotoPager count={listing.photoCount} />
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleSave(product.id, username)}
            style={[styles.saveBtn, { top: insets.top + 8 }]}>
            <Text style={[styles.saveHeart, saved ? styles.saveOn : styles.saveOff]}>♥</Text>
          </Pressable>
          {statusLabel ? (
            <View style={[styles.status, listing.status === 'reserved' ? styles.reserved : styles.sold]}>
              <Text style={[styles.statusText, listing.status === 'reserved' ? styles.reservedText : styles.soldText]}>
                {statusLabel}
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
            <PlaceholderImage style={styles.sellerAvatar} />
            <View style={styles.sellerMeta}>
              <Text style={styles.sellerName}>@{listing.seller}</Text>
              <Text style={styles.sellerRating}>{sellerLine}</Text>
            </View>
            <Text style={styles.sellerChevron}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!isOwn ? <Button label="Message" variant="secondary" onPress={messageSeller} style={styles.action} /> : null}
        {!isOwn ? (
          <Button label="Make offer" variant="secondary" disabled={!canOffer} onPress={() => setOfferOpen(true)} style={styles.action} />
        ) : null}
        {canBuy ? <Button label="Buy now" onPress={buyNow} style={styles.action} /> : null}
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
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    color: Palette.text,
  },
  saveBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeart: {
    fontSize: 15,
  },
  saveOn: {
    color: Palette.live,
  },
  saveOff: {
    color: '#b8b5b0',
  },
  status: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reserved: {
    backgroundColor: '#fdf3e3',
  },
  sold: {
    backgroundColor: Palette.chipBg,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reservedText: {
    color: '#8a6112',
  },
  soldText: {
    color: Palette.muted,
  },
  banner: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Palette.text,
    borderRadius: 10,
  },
  bannerText: {
    fontSize: 13,
    color: Palette.background,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: Palette.text,
  },
  price: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: '700',
    color: Palette.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Palette.chipBg,
  },
  chipText: {
    fontSize: 12,
    color: Palette.muted,
  },
  description: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 22,
    color: Palette.muted,
  },
  shipping: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted2,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: 10,
  },
  sellerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  sellerMeta: {
    flex: 1,
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  sellerRating: {
    marginTop: 1,
    fontSize: 12,
    color: Palette.muted2,
  },
  sellerChevron: {
    fontSize: 16,
    color: Palette.muted2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
  },
  action: {
    flex: 1,
    height: 48,
  },
  missing: {
    marginTop: 40,
    textAlign: 'center',
    color: Palette.muted2,
  },
  missingBack: {
    marginLeft: 20,
  },
});
