import { Button } from '@/components/ui/button';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { ReserveNotice } from '@/components/ui/reserve-notice';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { deliveryLabel, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { getDeliveryOption } from '@/data/checkout';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

export default function CheckoutSummaryScreen() {
  const router = useRouter();
  const live = useLive();
  const checkout = useCheckout();
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)/live" />;
  }

  const listing = live.resolveListing(draft.listingId);
  const claim = live.getClaim(draft.liveSessionId ?? '');
  const remaining = claim ? claim.expiresAt - live.now : 0;
  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  const delivery = getDeliveryOption(draft.deliveryMethod);
  const total = listing.price + delivery.fee;

  function cancel() {
    const liveId = checkout.cancelCheckout();
    if (liveId) router.replace(`/live/${liveId}`);
    else router.replace('/(tabs)/live');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Checkout summary" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <ReserveNotice remaining={remaining} />
        <View style={styles.item}>
          <PlaceholderImage style={styles.thumb} />
          <View>
            <Text style={styles.itemTitle}>{listing.title}</Text>
            <Text style={styles.itemMeta}>Sold by @{listing.seller}</Text>
          </View>
        </View>
        <Text style={styles.ship}>
          Ship to: {draft.name}, {draft.address}, {draft.city}
        </Text>
        <View style={styles.totals}>
          <Row label="Item" value={formatNaira(listing.price)} />
          <Row label={deliveryLabel(draft.deliveryMethod)} value={formatNaira(delivery.fee)} />
          <Row label="Total" value={formatNaira(total)} bold />
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Prototype purchase — no real money will be charged.</Text>
        </View>
        <Button label="Continue to payment" onPress={() => router.push('/checkout/payment')} />
        <Button label="Cancel checkout" variant="danger" onPress={cancel} style={styles.cancel} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowText, bold ? styles.bold : null]}>{label}</Text>
      <Text style={[styles.rowText, bold ? styles.bold : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: 10,
    marginBottom: 16,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  ship: {
    fontSize: 13,
    color: Palette.muted,
    marginBottom: 4,
  },
  totals: {
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
    marginTop: 14,
    paddingTop: 14,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowText: {
    fontSize: 13,
    color: Palette.muted,
  },
  bold: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  notice: {
    marginTop: 16,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fdf3e3',
    borderWidth: 1,
    borderColor: '#ecd39a',
    borderRadius: 8,
  },
  noticeText: {
    fontSize: 12,
    color: '#8a6112',
    textAlign: 'center',
  },
  cancel: {
    marginTop: 8,
    height: 44,
  },
});
