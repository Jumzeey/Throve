import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { getDeliveryOption } from '@/data/checkout';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

export default function SimulatedPaymentScreen() {
  const router = useRouter();
  const live = useLive();
  const checkout = useCheckout();
  const [busy, setBusy] = useState(false);
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId);
  const remaining = checkout.remaining;
  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  const total = listing.price + getDeliveryOption(draft.deliveryMethod).fee;

  function pay() {
    setBusy(true);
    const order = checkout.completePayment();
    if (!order) {
      setBusy(false);
      return;
    }
    router.replace('/checkout/confirmation');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Simulated payment" onBack={() => router.back()} />
      <View style={styles.body}>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            This is a prototype. No real card, bank or payment details are collected, and no real money will be charged.
          </Text>
        </View>
        <Text style={styles.amountLabel}>Simulated amount</Text>
        <Text style={styles.amount}>{formatNaira(total)}</Text>
        <Button label="Complete simulated payment" loading={busy} onPress={pay} style={styles.cta} />
      </View>
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
    paddingTop: 8,
  },
  notice: {
    padding: 14,
    backgroundColor: '#fdf3e3',
    borderWidth: 1,
    borderColor: '#ecd39a',
    borderRadius: 10,
    marginBottom: 24,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8a6112',
    textAlign: 'center',
  },
  amountLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: Palette.muted2,
    marginBottom: 8,
  },
  amount: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 28,
  },
  cta: {
    height: 54,
  },
});
