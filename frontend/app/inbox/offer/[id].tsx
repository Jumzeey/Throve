import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip, type OfferChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { getListingImage } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { formatNaira, formatRelativeTime } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function OfferDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const inbox = useInbox();
  const { getListing } = useListings();
  const checkout = useCheckout();

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const offer = id ? inbox.getOffer(id) : undefined;
  if (!offer || (offer.buyer !== session.username && offer.seller !== session.username)) {
    return <Redirect href="/inbox/offers" />;
  }

  const current = offer;
  const listing = getListing(current.listingId);
  const me = session.username;
  const isBuyer = current.buyer === me;
  const pending = current.status === 'pending';
  const counterpart = isBuyer ? current.seller : current.buyer;
  const canBuy = isBuyer && current.status === 'accepted' && listing?.status === 'available';

  async function openChat() {
    const conv = await inbox.openOrCreateConversation(counterpart, current.listingId, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  async function startBuy() {
    if (!listing) return;
    const started = await checkout.startCheckout({ listingId: listing.id, buyer: me, liveSessionId: null });
    if (started) router.push('/checkout/shipping');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Offer details" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable onPress={() => listing && router.push(`/product/${listing.id}`)} style={styles.product}>
          <AppImage source={getListingImage(current.listingId)} style={styles.thumb} />
          <View style={styles.productMeta}>
            <Text style={styles.productTitle}>{listing?.title ?? 'Listing'}</Text>
            <Text style={styles.productSub}>
              Listed at {listing ? formatNaira(listing.price) : '—'} · {isBuyer ? `to @${offer.seller}` : `from @${offer.buyer}`}
            </Text>
          </View>
        </Pressable>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>{isBuyer ? 'Your offer' : 'Offer received'}</Text>
            <Text style={styles.amount}>{formatNaira(offer.amount)}</Text>
          </View>
          <StatusChip kind="offer" variant={current.status as OfferChipVariant} />
        </View>
        <Text style={styles.date}>{formatRelativeTime(offer.createdAt)}</Text>

        {isBuyer && pending ? (
          <Button label="Withdraw offer" variant="danger" onPress={() => inbox.withdrawOffer(current.id, me)} style={styles.action} />
        ) : null}
        {!isBuyer && pending ? (
          <View style={styles.sellerRow}>
            <Button label="Reject" variant="secondary" onPress={() => inbox.rejectOffer(current.id, me)} style={styles.half} />
            <Button label="Accept" onPress={() => inbox.acceptOffer(current.id, me)} style={styles.half} />
          </View>
        ) : null}
        {canBuy ? <Button label="Continue to checkout" onPress={startBuy} style={styles.action} /> : null}
        <Button label="Message" variant="secondary" onPress={openChat} style={styles.action} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    backgroundColor: Palette.ivoryElevated,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
  },
  productMeta: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  productSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  amount: {
    marginTop: 4,
    fontSize: 28,
    fontFamily: Typography.displayBold,
    color: Palette.plum,
  },
  date: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
  action: {
    marginTop: Spacing.md,
    minHeight: 48,
  },
  sellerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.md,
  },
  half: {
    flex: 1,
    minHeight: 48,
  },
});
