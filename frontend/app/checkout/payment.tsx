import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { getDeliveryOption } from '@/data/checkout';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

export default function SimulatedPaymentScreen() {
  const router = useRouter();
  const live = useLive();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function pay() {
    if (!isConnected) return;
    setError(null);
    setBusy(true);
    try {
      const order = await checkout.completePayment();
      if (!order) {
        setError('Payment could not be completed. Please try again.');
        return;
      }
      router.replace('/checkout/confirmation');
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Payment" onBack={() => router.back()} />
      <View style={styles.body}>
        {!isConnected ? <OfflineBanner message="Reconnect to complete payment." /> : null}
        <AlertBanner
          variant="warning"
          title="Simulated payment"
          message="This is a prototype. No real card, bank or payment details are collected, and no real money will be charged."
        />
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Amount due</Text>
          <Text style={styles.amount}>{formatNaira(total)}</Text>
          <Text style={styles.itemLine}>{listing.title}</Text>
        </View>
        {error ? <AlertBanner variant="error" title="Payment failed" message={error} /> : null}
        <Button
          label="Complete simulated payment"
          loading={busy}
          onPress={pay}
          disabled={!isConnected}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  amountBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  amountLabel: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  amount: {
    fontSize: 36,
    fontFamily: Typography.displayBold,
    color: Palette.plum,
    letterSpacing: -0.5,
  },
  itemLine: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
  cta: { marginTop: Spacing.md },
});
