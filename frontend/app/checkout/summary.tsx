import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { deliveryLabel, leaveCheckout, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { getDeliveryOption } from '@/data/checkout';
import { getListingImage } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatCountdown, formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

export default function CheckoutSummaryScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const live = useLive();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId);
  const remaining = checkout.remaining;
  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  const listingId = draft.listingId;
  const delivery = getDeliveryOption(draft.deliveryMethod);
  const total = listing.price + delivery.fee;

  async function cancel() {
    const liveId = await checkout.cancelCheckout();
    leaveCheckout(router, liveId, listingId);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Summary" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl + bottom }]}>
        {!isConnected ? <OfflineBanner message="Reconnect to continue checkout." /> : null}
        <AlertBanner
          variant="info"
          title={remaining > 0 ? `Reserved for you — ${formatCountdown(remaining)}` : 'Reservation expired'}
        />
        <Text style={styles.sectionTitle}>Your order</Text>
        <View style={styles.itemCard}>
          <AppImage source={getListingImage(listing.id)} style={styles.thumb} />
          <View style={styles.itemMeta}>
            <Text style={styles.itemTitle}>{listing.title}</Text>
            <Text style={styles.itemSub}>Sold by @{listing.seller}</Text>
          </View>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Ship to</Text>
          <Text style={styles.detailValue}>
            {draft.name}, {draft.address}, {draft.city}
          </Text>
          <Text style={styles.detailPhone}>{draft.phone}</Text>
        </View>
        <View style={styles.totalsCard}>
          <Row label="Item" value={formatNaira(listing.price)} />
          <Row label={deliveryLabel(draft.deliveryMethod)} value={formatNaira(delivery.fee)} />
          <View style={styles.divider} />
          <Row label="Total" value={formatNaira(total)} bold />
        </View>
        <AlertBanner
          variant="warning"
          title="Prototype purchase"
          message="No real card, bank or payment details are collected, and no real money will be charged."
        />
        <Button
          label="Continue to payment"
          onPress={() => router.push('/checkout/payment')}
          disabled={!isConnected}
        />
        <Button label="Cancel checkout" variant="ghost" onPress={cancel} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold ? styles.rowLabelBold : null]}>{label}</Text>
      <Text style={[styles.rowValue, bold ? styles.rowValueBold : null]}>{value}</Text>
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
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
  },
  itemMeta: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemSub: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  detailCard: {
    padding: Spacing.lg,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    gap: 4,
  },
  detailLabel: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.body,
    lineHeight: 21,
  },
  detailPhone: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  totalsCard: {
    padding: Spacing.lg,
    backgroundColor: Palette.sand,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  rowLabelBold: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  rowValueBold: {
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.plum,
  },
});
