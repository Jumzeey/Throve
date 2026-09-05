import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import {
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  ProhibitedIcon,
  WifiOffIcon,
} from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useCheckout } from '@/context/checkout-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { checkoutTotals } from '@/data/checkout';
import { getListingImageSource } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

WebBrowser.maybeCompleteAuthSession();

type PayUiState =
  | 'ready'
  | 'opening'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'uncertain'
  | 'offline';

export default function PaymentScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const live = useLive();
  const { getListing } = useListings();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const draft = checkout.draft;
  const [ui, setUi] = useState<PayUiState>('ready');
  const [txRef, setTxRef] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successNavRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPoll(), [clearPoll]);

  useEffect(() => {
    if (!isConnected && ui !== 'success' && ui !== 'processing' && ui !== 'opening') {
      setUi('offline');
    } else if (isConnected && ui === 'offline') {
      setUi('ready');
    }
  }, [isConnected, ui]);

  useEffect(() => {
    if (ui !== 'success' || successNavRef.current) return;
    successNavRef.current = true;
    const t = setTimeout(() => router.replace('/checkout/confirmation'), 900);
    return () => clearTimeout(t);
  }, [ui, router]);

  if (!draft) {
    if (checkout.lastOrder) return <Redirect href="/checkout/confirmation" />;
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId) ?? getListing(draft.listingId);
  const remaining = checkout.remaining;
  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  if (!draft.deliveryMethod) {
    return <Redirect href="/checkout/delivery" />;
  }

  const itemPrice = draft.itemPrice ?? listing.price;
  const totals = checkoutTotals({
    itemPrice,
    deliveryMethod: draft.deliveryMethod,
    listedPrice: draft.listedPrice,
  });
  const deliveryLabelText =
    totals.delivery.value === 'Express' ? 'Express delivery' : 'Standard delivery';
  const actionLocked = ui === 'opening' || ui === 'processing' || ui === 'success' || ui === 'uncertain';

  async function finishVerify(ref: string, simulateOutcome?: 'success' | 'failed' | 'cancelled') {
    setUi('processing');
    try {
      const result = await checkout.verifyPayment(ref, simulateOutcome);
      if (result.status === 'successful') {
        setUi('success');
        return;
      }
      if (result.status === 'failed') {
        setUi('failed');
        return;
      }
      if (result.status === 'cancelled') {
        setUi('cancelled');
        return;
      }
      setUi('uncertain');
      startPolling(ref);
    } catch {
      setUi('uncertain');
      startPolling(ref);
    }
  }

  function startPolling(ref: string) {
    clearPoll();
    let ticks = 0;
    pollRef.current = setInterval(() => {
      ticks += 1;
      void (async () => {
        try {
          const status = await checkout.getPaymentStatus(ref);
          if (status.status === 'successful') {
            clearPoll();
            const verified = await checkout.verifyPayment(ref);
            if (verified.status === 'successful') setUi('success');
            else setUi('uncertain');
            return;
          }
          if (status.status === 'failed') {
            clearPoll();
            setUi('failed');
            return;
          }
          if (status.status === 'cancelled') {
            clearPoll();
            setUi('cancelled');
            return;
          }
          if (ticks >= 12) {
            clearPoll();
            setUi('uncertain');
          }
        } catch {
          /* keep polling */
        }
      })();
    }, 2500);
  }

  async function startPay() {
    if (!isConnected || actionLocked) return;
    successNavRef.current = false;
    setUi('opening');
    try {
      const init = await checkout.initPayment();
      setTxRef(init.txRef);

      if (init.mode === 'simulate') {
        setUi('processing');
        await new Promise((r) => setTimeout(r, 650));
        await finishVerify(init.txRef, 'success');
        return;
      }

      if (!init.checkoutUrl) {
        setUi('failed');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(init.checkoutUrl, init.redirectUrl);
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setUi('cancelled');
        return;
      }
      await finishVerify(init.txRef);
    } catch {
      if (!isConnected) setUi('offline');
      else setUi('failed');
    }
  }

  async function retryPay() {
    clearPoll();
    setTxRef(null);
    setUi('ready');
    await startPay();
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Payment" onBack={actionLocked ? undefined : () => router.back()} />
      <CheckoutProgress step={4} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl + bottom }]}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Total to pay</Text>
          <Text style={styles.amount}>{formatNaira(totals.total)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.itemRow}>
            <AppImage source={getListingImageSource(listing)} style={styles.thumb} />
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>{listing.title}</Text>
              <Text style={styles.itemSub}>
                {listing.seller} · {deliveryLabelText.replace(' delivery', '')} delivery
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Row label="Item price" value={formatNaira(totals.itemPrice)} />
          <Row label="Delivery" value={formatNaira(totals.delivery.fee)} />
          <Row label="Buyer Protection" value={formatNaira(totals.protectionFee)} />
          <View style={styles.divider} />
          <Row label="Total" value={formatNaira(totals.total)} bold />
        </View>

        {ui === 'opening' ? (
          <StatusCard
            tone="opening"
            icon={<ActivityIndicator color={Palette.plum} />}
            title="Opening secure payment..."
            body="Please don't close this screen."
          />
        ) : null}

        {ui === 'success' ? (
          <StatusCard
            tone="success"
            icon={<CheckIcon color={Palette.success} />}
            title="Payment confirmed"
            body="Taking you to your order confirmation."
          />
        ) : null}

        {ui === 'failed' ? (
          <StatusCard
            tone="error"
            icon={<AlertCircleIcon color={Palette.error} />}
            title="Payment wasn't completed"
            body="Your order has not been confirmed. Your checkout details are still here."
          />
        ) : null}

        {ui === 'cancelled' ? (
          <StatusCard
            tone="neutral"
            icon={<ProhibitedIcon color={Palette.muted} />}
            title="You left the payment screen"
            body="Your order has not been confirmed. The item remains reserved only while your checkout timer is active. If a payment was already submitted we'll confirm its status before anything else."
          />
        ) : null}

        {ui === 'uncertain' ? (
          <StatusCard
            tone="warning"
            icon={<ClockIcon color={Palette.warning} />}
            title="We're confirming your payment"
            body="This can take a short while. Please don't pay again — we'll update your order as soon as it's confirmed."
          />
        ) : null}

        {ui === 'offline' ? (
          <StatusCard
            tone="neutral"
            icon={<WifiOffIcon color={Palette.warning} />}
            title="No connection"
            body="Reconnect to continue to payment. If a payment was already started we'll confirm its status."
          />
        ) : null}

        {ui === 'ready' || ui === 'opening' || ui === 'processing' ? (
          <View style={styles.secureBox}>
            <LockIcon size={15} color={Palette.plum} />
            <View style={styles.secureCopy}>
              <Text style={styles.secureTitle}>Secure payment with Flutterwave</Text>
              <Text style={styles.secureBody}>You'll continue to Flutterwave's secure payment experience.</Text>
            </View>
          </View>
        ) : null}

        {ui === 'failed' ? (
          <Button label="Try payment again" onPress={retryPay} disabled={!isConnected} />
        ) : null}

        {ui === 'cancelled' ? (
          <View style={styles.rowActions}>
            <Button
              label="Back to review"
              variant="secondary"
              style={styles.halfBtn}
              onPress={() => router.replace('/checkout/summary')}
            />
            <Button label="Pay now" style={styles.halfBtn} onPress={retryPay} disabled={!isConnected} />
          </View>
        ) : null}

        {ui === 'uncertain' ? (
          <Button label="Continue to secure payment · unavailable" disabled />
        ) : null}

        {ui === 'offline' && txRef ? (
          <Button
            label="Check payment status"
            onPress={() => {
              setUi('uncertain');
              startPolling(txRef);
            }}
            disabled={!isConnected}
          />
        ) : null}

        {ui === 'ready' || ui === 'opening' || ui === 'processing' ? (
          <>
            <Button
              label={ui === 'processing' ? 'Processing payment...' : 'Continue to secure payment'}
              loading={ui === 'opening' || ui === 'processing'}
              onPress={startPay}
              disabled={!isConnected || actionLocked}
            />
            <Text style={styles.disclaimer}>
              Your payment is held until the order is completed — when you confirm receipt, or 48 hours after delivery
              if no eligible dispute is open.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold]}>{value}</Text>
    </View>
  );
}

function StatusCard({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'opening' | 'success' | 'error' | 'warning' | 'neutral';
  icon: ReactNode;
  title: string;
  body: string;
}) {
  const tones = {
    opening: { bg: Palette.sand, border: Palette.border, title: Palette.espresso },
    success: { bg: Palette.successBg, border: Palette.successBorder, title: Palette.successText },
    error: { bg: Palette.errorBg, border: Palette.errorBorder, title: Palette.error },
    warning: { bg: Palette.warningBg, border: Palette.warningBorder, title: Palette.warningText },
    neutral: { bg: Palette.ivoryElevated, border: Palette.border, title: Palette.espresso },
  }[tone];

  return (
    <View style={[styles.statusCard, { backgroundColor: tones.bg, borderColor: tones.border }]}>
      {icon}
      <View style={styles.statusCopy}>
        <Text style={[styles.statusTitle, { color: tones.title }]}>{title}</Text>
        <Text style={styles.statusBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  amountBlock: { gap: 4 },
  amountLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  amount: {
    fontSize: 34,
    fontFamily: Typography.displayBold,
    color: Palette.espresso,
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.lg,
    gap: 10,
  },
  itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: Palette.sand },
  itemMeta: { flex: 1, gap: 3 },
  itemTitle: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemSub: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  divider: { height: 1, backgroundColor: Palette.divider, marginVertical: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { flex: 1, fontSize: 13, fontFamily: Typography.body, color: Palette.body },
  rowValue: { fontSize: 13, fontFamily: Typography.bodyMedium, color: Palette.espresso },
  rowBold: { fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  secureBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  secureCopy: { flex: 1, gap: 2 },
  secureTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  secureBody: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    lineHeight: 17,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Typography.body,
    color: Palette.muted2,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
  },
  statusBody: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  rowActions: { flexDirection: 'row', gap: 10 },
  halfBtn: { flex: 1 },
});
