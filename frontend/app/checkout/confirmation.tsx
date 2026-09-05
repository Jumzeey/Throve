import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { CheckIcon, ClockIcon, ShieldCheckIcon } from '@/components/ui/icons';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useLive } from '@/context/live-context';
import { getDeliveryOption } from '@/data/checkout';
import { getListingImage } from '@/data/images';
import type { Order } from '@/data/types';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Phase = 'creating' | 'uncertain' | 'confirmed';

export default function CheckoutConfirmationScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const { session } = useAuth();
  const checkout = useCheckout();
  const inbox = useInbox();
  const live = useLive();
  const params = useLocalSearchParams<{ txRef?: string; tx_ref?: string }>();
  const txRef = (params.txRef ?? params.tx_ref ?? '').toString() || null;

  const order = checkout.lastOrder;
  const [phase, setPhase] = useState<Phase>(() => (order ? 'confirmed' : txRef ? 'creating' : 'confirmed'));
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticksRef = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const resolveFromTx = useCallback(async () => {
    if (!txRef) return false;
    try {
      const status = await checkout.getPaymentStatus(txRef);
      if (status.status === 'successful') {
        const verified = await checkout.verifyPayment(txRef);
        if (verified.status === 'successful' && verified.order) {
          setPhase('confirmed');
          clearPoll();
          return true;
        }
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        clearPoll();
        router.replace('/checkout/payment');
        return false;
      }
    } catch {
      /* keep waiting */
    }
    return false;
  }, [checkout, clearPoll, router, txRef]);

  useEffect(() => {
    if (order) {
      setPhase('confirmed');
      clearPoll();
      return;
    }
    if (!txRef) return;

    setPhase('creating');
    ticksRef.current = 0;
    void resolveFromTx();

    pollRef.current = setInterval(() => {
      ticksRef.current += 1;
      void (async () => {
        const ok = await resolveFromTx();
        if (!ok && ticksRef.current >= 8) {
          clearPoll();
          setPhase('uncertain');
        }
      })();
    }, 2500);

    return () => clearPoll();
  }, [clearPoll, order, resolveFromTx, txRef]);

  if (!order && !txRef) {
    return <Redirect href="/(tabs)" />;
  }

  if (phase === 'creating' && !order) {
    return (
      <View style={styles.screen}>
        <View style={[styles.centeredBody, { paddingBottom: bottom + Spacing.xxxl }]}>
          <View style={styles.creatingCard}>
            <ActivityIndicator color={Palette.plum} size="large" />
            <Text style={styles.creatingTitle}>Payment confirmed — creating your order…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (phase === 'uncertain' && !order) {
    return (
      <View style={styles.screen}>
        <View style={[styles.centeredBody, { paddingBottom: bottom + Spacing.xxxl }]}>
          <View style={styles.uncertainCard}>
            <View style={styles.uncertainBanner}>
              <ClockIcon color={Palette.warning} />
              <View style={styles.uncertainCopy}>
                <Text style={styles.uncertainTitle}>Your payment was confirmed. We're finishing your order.</Text>
                <Text style={styles.uncertainBody}>
                  Please don't pay again. You can check the status here or in Orders.
                </Text>
              </View>
            </View>
            <View style={styles.rowActions}>
              <Button
                label="Check status"
                variant="secondary"
                style={styles.halfBtn}
                loading={busy}
                onPress={async () => {
                  setBusy(true);
                  setPhase('creating');
                  ticksRef.current = 0;
                  const ok = await resolveFromTx();
                  if (!ok) setPhase('uncertain');
                  setBusy(false);
                }}
              />
              <Button
                label="Go to Orders"
                variant="secondary"
                style={[styles.halfBtn, styles.softBtn]}
                onPress={() => router.replace('/profile/orders')}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!order) {
    return <Redirect href="/(tabs)" />;
  }

  return <ConfirmedOrderView order={order} />;
}

function ConfirmedOrderView({ order }: { order: Order }) {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const { session } = useAuth();
  const inbox = useInbox();
  const live = useLive();
  const [messaging, setMessaging] = useState(false);

  const delivery = getDeliveryOption(order.deliveryMethod);
  const deliveryLine = `${order.deliveryMethod} · ${delivery.eta.replace(/^Estimated\s+/i, '')}`;
  const deliverTo = [order.city, order.state].filter(Boolean).join(', ') || order.address;
  const liveSession = order.fromLiveId ? live.getSession(order.fromLiveId) : undefined;
  const liveActive = liveSession?.status === 'live';
  const fromLiveEnded = Boolean(order.fromLiveId) && !liveActive;
  const me = session?.username ?? '';

  async function messageSeller() {
    if (!me || messaging) return;
    setMessaging(true);
    try {
      const conv = await inbox.openOrCreateConversation(order.seller, order.listingId, me);
      router.push(`/inbox/chat/${conv.id}`);
    } finally {
      setMessaging(false);
    }
  }

  function viewOrder() {
    router.replace(`/checkout/order?id=${order.id}`);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl + bottom }]}>
        <View style={styles.hero}>
          <View style={styles.successIcon}>
            <CheckIcon size={28} color={Palette.success} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>Order confirmed</Text>
          <Text style={styles.lead}>
            Your order is confirmed. The seller can now prepare your parcel for dispatch.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.itemRow}>
            <AppImage source={getListingImage(order.listingId)} style={styles.thumb} />
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>{order.listingTitle}</Text>
              <Text style={styles.itemSub}>
                Sold by{' '}
                <Text style={styles.sellerLink} onPress={() => router.push(`/seller/${order.seller}`)}>
                  {order.seller}
                </Text>
              </Text>
              <Text style={styles.itemPrice}>{formatNaira(order.itemPrice)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <SummaryRow label="Order reference" value={order.id} />
          <SummaryRow label="Delivery" value={deliveryLine} />
          <SummaryRow label="Delivering to" value={deliverTo} />
          <SummaryRow label="Amount paid" value={formatNaira(order.total)} emphasize />
        </View>

        <View style={styles.escrowBox}>
          <ShieldCheckIcon color={Palette.success} />
          <Text style={styles.escrowCopy}>
            Your payment is held until the order is completed — when you confirm receipt, or 48 hours after delivery if
            no eligible dispute is open.
          </Text>
        </View>

        {liveActive ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.liveReturnBtn, pressed && styles.pressed]}
              onPress={() => router.replace(`/live/${order.fromLiveId}`)}>
              <View style={styles.liveDot} />
              <Text style={styles.liveReturnLabel}>Return to live</Text>
            </Pressable>
            <Button label="View order details" variant="secondary" onPress={viewOrder} />
            <Text style={styles.liveNote}>The item shows as Sold in the live when you return.</Text>
          </View>
        ) : fromLiveEnded ? (
          <View style={styles.actions}>
            <Button label="View order details" onPress={viewOrder} />
            <Button
              label="View seller profile"
              variant="secondary"
              onPress={() => router.push(`/seller/${order.seller}`)}
            />
            <Text style={styles.liveNote}>No return-to-live action is shown once the session has ended.</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Button label="View order details" onPress={viewOrder} />
            <View style={styles.rowActions}>
              <Button
                label="Message seller"
                variant="secondary"
                style={styles.halfBtn}
                loading={messaging}
                onPress={() => void messageSeller()}
              />
              <Button
                label="Return home"
                variant="secondary"
                style={[styles.halfBtn, styles.softBtn]}
                onPress={() => router.replace('/(tabs)')}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={[styles.summaryRow, emphasize && styles.summaryRowLast]}>
      <Text style={[styles.summaryLabel, emphasize && styles.summaryLabelEmph]}>{label}</Text>
      <Text style={[styles.summaryValue, emphasize && styles.summaryValueEmph]}>{value}</Text>
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
    paddingTop: Spacing.xxxl,
    gap: Spacing.lg,
  },
  centeredBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Palette.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Typography.displayBold,
    color: Palette.espresso,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 300,
  },
  card: {
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.lg,
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
  },
  itemMeta: { flex: 1, gap: 4 },
  itemTitle: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemSub: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  sellerLink: {
    color: Palette.plum,
    fontFamily: Typography.bodySemiBold,
  },
  itemPrice: {
    marginTop: 2,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  summaryRowLast: {
    paddingBottom: 0,
    borderBottomWidth: 0,
    paddingTop: 2,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.body,
    flexShrink: 0,
  },
  summaryLabelEmph: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  summaryValueEmph: {
    fontSize: 16,
    fontFamily: Typography.bodySemiBold,
  },
  escrowBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderRadius: Radius.sm,
    backgroundColor: Palette.successBg,
    borderWidth: 1,
    borderColor: Palette.successBorder,
  },
  escrowCopy: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: { flex: 1 },
  softBtn: {
    borderColor: Palette.border,
  },
  liveReturnBtn: {
    minHeight: 52,
    borderRadius: Radius.button,
    backgroundColor: Palette.liveDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.liveRed,
  },
  liveReturnLabel: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  liveNote: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  pressed: { opacity: 0.88 },
  creatingCard: {
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
  },
  creatingTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  uncertainCard: {
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.lg,
    gap: 14,
  },
  uncertainBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderRadius: Radius.sm,
    backgroundColor: Palette.warningBg,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
  },
  uncertainCopy: { flex: 1, gap: 4 },
  uncertainTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
  },
  uncertainBody: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
});
