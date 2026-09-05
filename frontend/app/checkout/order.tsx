import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StarRating } from '@/components/ui/star-rating';
import { StatusChip } from '@/components/ui/status-chip';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { deliveryLabel, useCheckout } from '@/context/checkout-context';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useLive } from '@/context/live-context';
import { CANCEL_REASONS } from '@/data/seed';
import { getListingImage } from '@/data/images';
import type { OrderStatus } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: 'paid', label: 'Paid' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'completed', label: 'Completed' },
];

function timelineIndex(status: OrderStatus) {
  if (status === 'cancelled') return -1;
  if (status === 'paid') return 0;
  if (status === 'dispatched') return 1;
  if (status === 'in_transit') return 2;
  return 3;
}

export default function CheckoutOrderScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const checkout = useCheckout();
  const inbox = useInbox();
  const live = useLive();
  const { isConnected } = useNetworkStatus();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const orderId = Array.isArray(id) ? id[0] : id;
  const order = (orderId ? checkout.getOrder(orderId) : checkout.lastOrder) ?? checkout.lastOrder;

  useEffect(() => {
    if (!checkout.loading && !order) {
      void checkout.refresh();
    }
  }, [checkout.loading, checkout.refresh, order]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (checkout.loading && !order) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Order" onBack={() => router.back()} />
        <LoadingSkeleton style={styles.skeleton} rows={2} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Order" onBack={() => router.back()} />
        <View style={styles.missingBody}>
          <AlertBanner variant="error" title="Order not found" message="This order may have been removed or is unavailable." />
          <Button label="View all orders" onPress={() => router.replace('/profile/orders')} />
        </View>
      </View>
    );
  }

  const me = session.username;
  const isBuyer = order.buyer === me;
  const isSeller = order.seller === me;
  const listingId = order.listingId;
  const liveSession = order.fromLiveId ? live.getSession(order.fromLiveId) : undefined;
  const currentIdx = timelineIndex(order.status);
  const counterpart = isBuyer ? order.seller : order.buyer;
  const counterpartRole = isBuyer ? 'seller' : 'buyer';
  const canDispatch = isSeller && order.status === 'paid';
  const canReceive = isBuyer && (order.status === 'dispatched' || order.status === 'in_transit');
  const canCancel = order.status === 'paid' && (isBuyer || isSeller);
  const canReview = isBuyer && order.status === 'completed' && !order.reviewed;

  async function runAction(action: () => Promise<boolean>) {
    if (!isConnected) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const ok = await action();
      if (!ok) setActionError('Something went wrong. Please try again.');
    } catch {
      setActionError('Something went wrong. Check your connection and try again.');
    } finally {
      setActionBusy(false);
    }
  }

  async function message() {
    const conv = await inbox.openOrCreateConversation(counterpart, listingId, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={`Order #${order.id}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl + bottom }]}>
        {!isConnected ? <OfflineBanner message="Reconnect to update this order." /> : null}
        <AlertBanner variant="info" title="Prototype order" message="Simulated purchase — no real payment collected." />
        <View style={styles.itemCard}>
          <AppImage source={getListingImage(order.listingId)} style={styles.thumb} />
          <View style={styles.itemMeta}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{order.listingTitle}</Text>
              <StatusChip kind="order" variant={order.status} />
            </View>
            <Text style={styles.itemSub}>
              {isBuyer ? `Sold by @${order.seller}` : `Sold to @${order.buyer}`} · {formatNaira(order.total)}
            </Text>
          </View>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Delivery</Text>
          <Text style={styles.detailValue}>
            Ship to: {order.name}, {order.address}, {order.city}
          </Text>
          <Text style={styles.detailSub}>
            {deliveryLabel(order.deliveryMethod)} · {formatNaira(order.deliveryFee)}
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Progress</Text>
        {order.status === 'cancelled' ? (
          <View style={styles.timelineRow}>
            <View style={styles.dotCol}>
              <View style={[styles.dot, styles.dotCancel]} />
            </View>
            <Text style={styles.cancelLabel}>Cancelled{order.cancelReason ? ` — ${order.cancelReason}` : ''}</Text>
          </View>
        ) : (
          TIMELINE.map((step, index) => {
            const done = index <= currentIdx;
            const last = index === TIMELINE.length - 1;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.dotCol}>
                  <View style={[styles.dot, done ? styles.dotOn : styles.dotOff]} />
                  {last ? null : <View style={[styles.lineBar, index < currentIdx ? styles.lineOn : styles.lineOff]} />}
                </View>
                <Text style={[styles.stepLabel, done ? styles.stepOn : styles.stepOff]}>{step.label}</Text>
              </View>
            );
          })
        )}
        {actionError ? <AlertBanner variant="error" title="Action failed" message={actionError} /> : null}
        {canDispatch ? (
          <Button
            label="Mark as dispatched"
            loading={actionBusy}
            disabled={!isConnected}
            onPress={() => runAction(() => checkout.markDispatched(order.id, me))}
          />
        ) : null}
        {canReceive ? (
          <Button
            label="Item received"
            loading={actionBusy}
            disabled={!isConnected}
            onPress={() => runAction(() => checkout.confirmReceived(order.id, me))}
          />
        ) : null}
        <Button label={`Message ${counterpartRole}`} variant="secondary" onPress={message} />
        {canCancel && !cancelOpen ? (
          <Button label="Cancel order" variant="ghost" onPress={() => setCancelOpen(true)} />
        ) : null}
        {cancelOpen ? (
          <View style={styles.cancelBox}>
            <Text style={styles.cancelTitle}>Why are you cancelling?</Text>
            {CANCEL_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => {
                  runAction(async () => {
                    await checkout.cancelOrder(order.id, me, reason);
                    setCancelOpen(false);
                    return true;
                  });
                }}
                style={styles.reason}>
                <Text style={styles.reasonLabel}>{reason}</Text>
              </Pressable>
            ))}
            <Button label="Back" variant="ghost" onPress={() => setCancelOpen(false)} />
          </View>
        ) : null}
        {canReview ? (
          <View style={styles.review}>
            <Text style={styles.sectionTitle}>Rate this seller</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setStars(value)} hitSlop={6}>
                  <StarRating rating={value <= stars ? 1 : 0} size={22} />
                </Pressable>
              ))}
            </View>
            <TextField
              label="Comment"
              placeholder="Optional — share your experience"
              value={comment}
              onChangeText={setComment}
              multiline
              style={styles.comment}
            />
            <Button
              label="Submit review"
              disabled={stars < 1 || !isConnected}
              loading={actionBusy}
              onPress={() => runAction(() => checkout.submitReview(order.id, me, stars, comment))}
            />
          </View>
        ) : null}
        {order.reviewed && isBuyer ? (
          <AlertBanner variant="success" title="Review submitted" message="Thanks — your feedback helps the community." />
        ) : null}
        {liveSession?.status === 'live' ? (
          <Button label="Return to live" variant="live" onPress={() => router.replace(`/live/${order.fromLiveId}`)} />
        ) : null}
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
    gap: Spacing.lg,
  },
  skeleton: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  missingBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.lg,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
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
  itemMeta: { flex: 1, gap: Spacing.xs },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemSub: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  detailCard: {
    padding: Spacing.lg,
    backgroundColor: Palette.sand,
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
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.body,
    lineHeight: 20,
  },
  detailSub: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    minHeight: 36,
  },
  dotCol: {
    width: 12,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOn: {
    backgroundColor: Palette.plum,
  },
  dotOff: {
    backgroundColor: Palette.ivory,
    borderWidth: 2,
    borderColor: Palette.border,
  },
  dotCancel: {
    backgroundColor: Palette.error,
  },
  lineBar: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 2,
  },
  lineOn: {
    backgroundColor: Palette.plum,
  },
  lineOff: {
    backgroundColor: Palette.borderSoft,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    paddingBottom: Spacing.lg,
  },
  stepOn: {
    color: Palette.espresso,
  },
  stepOff: {
    color: Palette.muted3,
  },
  cancelLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.error,
  },
  cancelBox: {
    padding: Spacing.lg,
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  cancelTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.errorText,
  },
  reason: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    justifyContent: 'center',
  },
  reasonLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  review: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  comment: {
    minHeight: 72,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
});
