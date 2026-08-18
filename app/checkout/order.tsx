import { Button } from '@/components/ui/button';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { deliveryLabel, useCheckout } from '@/context/checkout-context';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useLive } from '@/context/live-context';
import { CANCEL_REASONS } from '@/data/seed';
import type { OrderStatus } from '@/data/types';
import { formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const checkout = useCheckout();
  const inbox = useInbox();
  const live = useLive();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');

  const orderId = Array.isArray(id) ? id[0] : id;
  const order = (orderId ? checkout.getOrder(orderId) : checkout.lastOrder) ?? checkout.lastOrder;

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!order) {
    return <Redirect href="/(tabs)" />;
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

  function message() {
    const conv = inbox.openOrCreateConversation(counterpart, listingId, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={`Order #${order.id}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Prototype order — simulated, no real payment collected.</Text>
        </View>
        <View style={styles.item}>
          <PlaceholderImage style={styles.thumb} />
          <View style={styles.itemMeta}>
            <Text style={styles.itemTitle}>{order.listingTitle}</Text>
            <Text style={styles.itemSub}>
              {isBuyer ? `Sold by @${order.seller}` : `Sold to @${order.buyer}`} · {formatNaira(order.total)}
            </Text>
          </View>
        </View>
        <Text style={styles.line}>Ship to: {order.name}, {order.address}, {order.city}</Text>
        <Text style={styles.line}>{deliveryLabel(order.deliveryMethod)} · {formatNaira(order.deliveryFee)}</Text>

        {order.status === 'cancelled' ? (
          <View style={styles.timelineRow}>
            <View style={styles.dotCol}>
              <View style={[styles.dot, styles.dotCancel]} />
            </View>
            <Text style={styles.cancelLabel}>Cancelled</Text>
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

        {canDispatch ? (
          <Button label="Mark as dispatched" onPress={() => checkout.markDispatched(order.id, me)} style={styles.primary} />
        ) : null}
        {canReceive ? (
          <Button label="Item received" onPress={() => checkout.confirmReceived(order.id, me)} style={styles.primary} />
        ) : null}
        <Button label={`Message ${counterpartRole}`} variant="secondary" onPress={message} style={styles.message} />
        {canCancel && !cancelOpen ? (
          <Pressable onPress={() => setCancelOpen(true)}>
            <Text style={styles.cancelLink}>Cancel order</Text>
          </Pressable>
        ) : null}
        {cancelOpen ? (
          <View style={styles.cancelBox}>
            <Text style={styles.cancelTitle}>Why are you cancelling?</Text>
            {CANCEL_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => {
                  checkout.cancelOrder(order.id, me, reason);
                  setCancelOpen(false);
                }}
                style={styles.reason}>
                <Text style={styles.reasonLabel}>{reason}</Text>
              </Pressable>
            ))}
            <View style={styles.cancelRow}>
              <Button label="Back" variant="danger" onPress={() => setCancelOpen(false)} style={styles.cancelBtn} />
            </View>
          </View>
        ) : null}

        {canReview ? (
          <View style={styles.review}>
            <Text style={styles.reviewTitle}>Rate this seller</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setStars(value)} hitSlop={6}>
                  <Text style={[styles.star, { color: value <= stars ? '#c9a227' : Palette.border }]}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextField
              placeholder="Optional comment"
              value={comment}
              onChangeText={setComment}
              multiline
              style={styles.comment}
            />
            <Button
              label="Submit review"
              disabled={stars < 1}
              onPress={() => checkout.submitReview(order.id, me, stars, comment)}
            />
          </View>
        ) : null}
        {order.reviewed && isBuyer ? (
          <View style={styles.thanks}>
            <Text style={styles.thanksText}>Thanks — your review was submitted.</Text>
          </View>
        ) : null}

        {liveSession?.status === 'live' ? (
          <Button label="Return to live" variant="danger" onPress={() => router.replace(`/live/${order.fromLiveId}`)} style={styles.returnLive} />
        ) : null}
      </ScrollView>
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
  notice: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Palette.chipBg,
    borderRadius: 8,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 11,
    color: Palette.muted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: 10,
    marginBottom: 16,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  itemMeta: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
  },
  itemSub: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  line: {
    fontSize: 13,
    color: Palette.muted,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: Palette.text,
  },
  dotOff: {
    backgroundColor: Palette.background,
    borderWidth: 2,
    borderColor: Palette.border,
  },
  dotCancel: {
    backgroundColor: Palette.live,
  },
  lineBar: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 2,
  },
  lineOn: {
    backgroundColor: Palette.text,
  },
  lineOff: {
    backgroundColor: Palette.borderSoft,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingBottom: 16,
  },
  stepOn: {
    color: Palette.text,
  },
  stepOff: {
    color: Palette.muted3,
  },
  cancelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.live,
  },
  primary: {
    height: 46,
    marginTop: 6,
  },
  message: {
    height: 46,
    marginTop: 8,
  },
  cancelLink: {
    marginTop: 8,
    height: 44,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: Palette.live,
    lineHeight: 44,
  },
  cancelBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: 8,
  },
  cancelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.errorText,
    marginBottom: 10,
  },
  reason: {
    height: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    marginBottom: 6,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.text,
  },
  cancelRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
  },
  review: {
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
    marginTop: 18,
    paddingTop: 16,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  star: {
    fontSize: 22,
  },
  comment: {
    height: 60,
    paddingTop: 8,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  thanks: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Palette.chipBg,
    borderRadius: 8,
  },
  thanksText: {
    fontSize: 13,
    color: Palette.muted,
    textAlign: 'center',
  },
  returnLive: {
    marginTop: 20,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.live,
  },
});
