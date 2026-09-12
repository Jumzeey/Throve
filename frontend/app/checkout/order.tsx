import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { ShieldCheckIcon, InfoCircleIcon } from '@/components/ui/icons';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StarRating } from '@/components/ui/star-rating';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { getListingImage } from '@/data/images';
import { CANCEL_REASONS } from '@/data/seed';
import type { Order, OrderStatus, PayoutStatus } from '@/data/types';
import { useKeyboardAwareScroll } from '@/hooks/use-keyboard-aware-scroll';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import * as Clipboard from 'expo-clipboard';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const DISPUTE_REASONS = [
  'Item not as described',
  'Item not received',
  'Damaged in transit',
  'Wrong item sent',
];

function formatShortDate(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  const last2 = digits.slice(-2);
  const head = digits.slice(0, Math.min(6, digits.length - 2));
  const spaced = head.length > 3 ? `${head.slice(0, 3)} ${head.slice(3)}` : head;
  return `+${spaced} ••• ••${last2}`;
}

function headerChip(status: OrderStatus, role: 'purchase' | 'sale') {
  if (status === 'cancelled') return { label: 'CANCELLED', color: Palette.errorText, border: Palette.errorBorder };
  if (status === 'completed') return { label: 'COMPLETED', color: '#3F5A3C', border: '#4F6B4C' };
  if (status === 'delivered') return { label: 'DELIVERED', color: '#3F5A3C', border: '#B9CDB4' };
  if (status === 'in_transit') return { label: 'IN TRANSIT', color: Palette.plum, border: Palette.plum };
  if (status === 'dispatched') return { label: 'DISPATCHED', color: Palette.plum, border: '#C9A9BD' };
  if (status === 'paid' && role === 'sale') {
    return { label: 'AWAITING DISPATCH', color: Palette.warningText, border: '#E9CFA6' };
  }
  return { label: 'PAID', color: Palette.plum, border: '#C9A9BD' };
}

function payoutLabel(status?: PayoutStatus) {
  switch (status) {
    case 'eligible':
      return 'Payout eligible';
    case 'processing':
      return 'Payout processing';
    case 'paid_out':
      return 'Paid out';
    case 'on_hold':
      return 'On Hold';
    case 'failed':
      return 'Failed';
    default:
      return 'Not yet eligible';
  }
}

type TimelineStep = { id: string; label: string; done: boolean; current: boolean; detail?: string };

function buildTimeline(order: Order): TimelineStep[] {
  const status = order.status;
  if (status === 'cancelled') {
    return [{ id: 'cancelled', label: 'Cancelled', done: true, current: true, detail: order.cancelReason }];
  }
  const rank = { paid: 1, dispatched: 3, in_transit: 4, delivered: 5, completed: 6 } as const;
  const currentRank =
    status === 'paid' ? 2 : status in rank ? rank[status as keyof typeof rank] : 0;

  return [
    { id: 'paid', label: 'Paid', done: currentRank >= 1, current: false, detail: formatShortDate(order.paidAt ?? order.createdAt) },
    {
      id: 'awaiting',
      label: 'Awaiting dispatch',
      done: currentRank >= 2,
      current: status === 'paid',
      detail: status === 'paid' ? 'Seller will mark this when they ship' : formatShortDate(order.paidAt),
    },
    {
      id: 'dispatched',
      label: 'Dispatched',
      done: currentRank >= 3,
      current: status === 'dispatched',
      detail: formatShortDate(order.dispatchedAt),
    },
    {
      id: 'in_transit',
      label: 'In transit',
      done: currentRank >= 4,
      current: status === 'in_transit',
      detail: status === 'in_transit' ? 'On the way to you' : formatShortDate(order.inTransitAt),
    },
    {
      id: 'delivered',
      label: 'Delivered',
      done: currentRank >= 5,
      current: status === 'delivered',
      detail: formatShortDate(order.deliveredAt),
    },
    {
      id: 'completed',
      label: 'Completed',
      done: currentRank >= 6,
      current: status === 'completed',
      detail: formatShortDate(order.completedAt),
    },
  ];
}

function withinDisputeWindow(deliveredAt?: string | null) {
  if (!deliveredAt) return false;
  return Date.now() - new Date(deliveredAt).getTime() <= 48 * 60 * 60 * 1000;
}

export default function CheckoutOrderScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const keyboardScroll = useKeyboardAwareScroll();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const checkout = useCheckout();
  const inbox = useInbox();
  const listings = useListings();
  const live = useLive();
  const { isConnected } = useNetworkStatus();

  const [fetched, setFetched] = useState<Order | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState(DISPUTE_REASONS[0]);
  const [disputeNote, setDisputeNote] = useState('');
  const [sellerReply, setSellerReply] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingEdit, setTrackingEdit] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const orderId = Array.isArray(id) ? id[0] : id;
  const cached = (orderId ? checkout.getOrder(orderId) : checkout.lastOrder) ?? checkout.lastOrder;
  const order = cached ?? fetched;

  useEffect(() => {
    if (!orderId || cached) return;
    let cancelled = false;
    setFetching(true);
    setFetchError(false);
    void (async () => {
      try {
        const data = await apiFetch<Order>(`/checkout/orders/${orderId}`);
        if (!cancelled) setFetched(data);
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cached, orderId]);

  useEffect(() => {
    if (order?.trackingNumber) setTrackingInput(order.trackingNumber);
  }, [order?.trackingNumber]);

  const listing = order ? listings.getListing(order.listingId) : undefined;
  const listingMeta = useMemo(() => {
    if (!listing) return null;
    return [listing.department, listing.category, listing.condition].filter(Boolean).join(' · ');
  }, [listing]);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  if ((checkout.loading || fetching) && !order) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Order details" onBack={() => router.back()} />
        <LoadingSkeleton style={styles.skeleton} rows={3} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Order details" onBack={() => router.back()} />
        <View style={styles.missingBody}>
          <AlertBanner
            variant="error"
            title={fetchError ? "We couldn't load this order" : 'Order not found'}
            message="Please try again in a moment."
          />
          <Button label="View all orders" onPress={() => router.replace('/profile/orders')} />
        </View>
      </View>
    );
  }

  const me = session.username;
  const isBuyer = order.buyer === me;
  const isSeller = order.seller === me;
  const role: 'purchase' | 'sale' = isSeller && !isBuyer ? 'sale' : 'purchase';
  const chip = headerChip(order.status, role);
  const timeline = buildTimeline(order);
  const counterpart = isBuyer ? order.seller : order.buyer;
  const canDispatch = isSeller && order.status === 'paid';
  const canMarkDelivered = isSeller && (order.status === 'dispatched' || order.status === 'in_transit');
  const canUpdateTracking = isSeller && ['paid', 'dispatched', 'in_transit', 'delivered'].includes(order.status);
  const canReceive = isBuyer && order.status === 'delivered';
  const canCancel = order.status === 'paid' && (isBuyer || isSeller);
  const canDispute =
    isBuyer && order.status === 'delivered' && !order.dispute && withinDisputeWindow(order.deliveredAt);
  const canReview = isBuyer && order.status === 'completed' && !order.reviewed;
  const protectionFee = order.protectionFee ?? 0;
  const shipTo = [order.address, order.city, order.state].filter(Boolean).join(', ');
  const liveSession = order.fromLiveId ? live.getSession(order.fromLiveId) : undefined;
  const payout = order.payout;
  const disputeActive = order.dispute && ['open', 'under_review'].includes(order.dispute.status);

  async function runAction(action: () => Promise<boolean>) {
    if (!isConnected) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const ok = await action();
      if (!ok) setActionError('Something went wrong. Please try again.');
      else if (orderId) {
        try {
          setFetched(await apiFetch<Order>(`/checkout/orders/${orderId}`));
        } catch {
          /* list refresh already ran */
        }
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setActionBusy(false);
    }
  }

  async function message() {
    if (!order) return;
    const conv = await inbox.openOrCreateConversation(counterpart, order.listingId, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  async function copyTracking() {
    if (!order?.trackingNumber) return;
    await Clipboard.setStringAsync(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={isSeller && !isBuyer ? 'Sale details' : 'Order details'} onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={keyboardScroll.scrollRef}
          onScroll={keyboardScroll.onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.body,
            {
              paddingBottom: Spacing.xxxl + Math.max(keyboardScroll.contentPaddingBottom, bottom),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={keyboardScroll.automaticallyAdjustKeyboardInsets}
        >
          {!isConnected ? (
            <OfflineBanner title="No connection" message="Reconnect to update this order." />
          ) : null}
          {actionError ? <AlertBanner variant="error" title="We couldn't complete that" message={actionError} /> : null}

          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order {order.id}</Text>
            <View style={[styles.statusChip, { borderColor: chip.border }]}>
              <View style={[styles.statusDot, { backgroundColor: chip.color }]} />
              <Text style={[styles.statusText, { color: chip.color }]}>{chip.label}</Text>
            </View>
          </View>

          <View style={styles.itemCard}>
            <AppImage source={getListingImage(order.listingId)} style={styles.thumb} />
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{order.listingTitle}</Text>
              {listingMeta ? <Text style={styles.itemMeta}>{listingMeta}</Text> : null}
              <Text style={styles.itemPrice}>{formatNaira(order.itemPrice)}</Text>
            </View>
          </View>

          <View style={styles.personRow}>
            <ProfileAvatar username={counterpart} style={styles.avatar} />
            <View style={styles.personCopy}>
              <Text style={styles.personName}>{counterpart}</Text>
              <Text style={styles.personRole}>{isBuyer ? 'Seller' : 'Buyer'}</Text>
            </View>
            <Pressable style={styles.messagePill} onPress={() => void message()}>
              <Text style={styles.messagePillText}>{isBuyer ? 'Message seller' : 'Message buyer'}</Text>
            </Pressable>
          </View>

          {isBuyer ? (
            <>
              <Text style={styles.sectionTitle}>Delivery progress</Text>
              <Timeline steps={timeline} />

              <View style={styles.card}>
                <Text style={styles.cardLabel}>Tracking</Text>
                {order.trackingNumber ? (
                  <View style={styles.trackingRow}>
                    <Text style={styles.trackingValue}>{order.trackingNumber}</Text>
                    <Pressable onPress={() => void copyTracking()}>
                      <Text style={styles.copyLink}>{copied ? 'Copied' : 'Copy'}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.cardHint}>Tracking will appear once the seller adds it.</Text>
                )}
                <View style={styles.divider} />
                <Text style={styles.cardLabel}>Delivering to</Text>
                <Text style={styles.address}>
                  {order.name}
                  {'\n'}
                  {shipTo}
                  {'\n'}
                  {maskPhone(order.phone)}
                </Text>
              </View>

              {order.status !== 'cancelled' && order.status !== 'completed' ? (
                <View style={styles.protectBanner}>
                  <ShieldCheckIcon size={18} color="#4F6B4C" />
                  <View style={styles.flex}>
                    <Text style={styles.protectTitle}>Buyer Protection is active</Text>
                    <Text style={styles.protectBody}>
                      Your payment is held until you confirm receipt, or automatically 48 hours after delivery if you
                      haven't opened a dispute
                      {protectionFee > 0 ? ` · fee ${formatNaira(protectionFee)}` : ''}.
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardLabel}>Payment summary</Text>
                <MoneyRow label="Item price" value={formatNaira(order.itemPrice)} />
                <MoneyRow label="Delivery" value={formatNaira(order.deliveryFee)} />
                <MoneyRow
                  label="Buyer Protection fee"
                  value={formatNaira(protectionFee)}
                  onInfoPress={() => router.push('/buyer-protection')}
                />
                <View style={styles.divider} />
                <MoneyRow label="Total paid" value={formatNaira(order.total)} bold />
              </View>

              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actions}>
                {canReceive ? (
                  <>
                    <Button
                      label="Item received"
                      loading={actionBusy}
                      disabled={!isConnected}
                      onPress={() => void runAction(() => checkout.confirmReceived(order.id, me))}
                    />
                    <Text style={styles.help}>
                      Confirm receipt to complete the order now, or it completes automatically 48 hours after delivery
                      if no eligible dispute is opened.
                    </Text>
                  </>
                ) : order.status !== 'completed' && order.status !== 'cancelled' ? (
                  <>
                    <Button label="Item received" disabled />
                    <Text style={styles.help}>Available once the order is Delivered.</Text>
                  </>
                ) : null}

                <Button label="Message seller" variant="secondary" onPress={() => void message()} />

                {canCancel && !cancelOpen ? (
                  <Button label="Cancel order" variant="secondary" onPress={() => setCancelOpen(true)} />
                ) : null}
                {!canCancel && order.status !== 'cancelled' && order.status !== 'completed' ? (
                  <>
                    <Button label="Cancel order" disabled />
                    <Text style={styles.help}>
                      Cancelling is only possible while an order is Paid or Awaiting dispatch.
                    </Text>
                  </>
                ) : null}
              </View>

              {cancelOpen ? <CancelBox onPick={(reason) => void runAction(async () => {
                await checkout.cancelOrder(order.id, me, reason);
                setCancelOpen(false);
                return true;
              })} onBack={() => setCancelOpen(false)} /> : null}

              <View style={styles.card}>
                <Text style={styles.disputeTitle}>Something wrong with your order?</Text>
                <Text style={styles.disputeBody}>
                  You can open a dispute within 48 hours of delivery. Opening one pauses automatic completion and holds
                  the seller's payout while it is reviewed.
                </Text>
                {canDispute && !disputeOpen ? (
                  <Button
                    label="Open a dispute"
                    variant="secondary"
                    style={styles.disputeBtn}
                    onPress={() => setDisputeOpen(true)}
                  />
                ) : order.dispute ? (
                  <AlertBanner
                    variant="warning"
                    title={`Dispute — ${order.dispute.reason}`}
                    message={`Status: ${order.dispute.status.replace('_', ' ')}. Opened ${formatShortDate(order.dispute.createdAt)}.`}
                  />
                ) : (
                  <>
                    <Button label="Open a dispute" disabled style={styles.disputeBtn} />
                    <Text style={styles.helpCenter}>Available once the order is Delivered</Text>
                  </>
                )}
              </View>

              {disputeOpen ? (
                <View style={styles.cancelBox}>
                  <Text style={styles.cancelTitle}>Open a dispute</Text>
                  {DISPUTE_REASONS.map((reason) => (
                    <Pressable key={reason} style={styles.reason} onPress={() => setDisputeReason(reason)}>
                      <Text style={[styles.reasonLabel, disputeReason === reason ? styles.reasonSelected : null]}>
                        {reason}
                      </Text>
                    </Pressable>
                  ))}
                  <View ref={keyboardScroll.setAnchor('dispute')} collapsable={false}>
                    <TextField
                      label="Details (optional)"
                      value={disputeNote}
                      onChangeText={setDisputeNote}
                      multiline
                      onFocus={() => keyboardScroll.onFieldFocus('dispute')}
                    />
                  </View>
                  <Button
                    label="Submit dispute"
                    loading={actionBusy}
                    onPress={() =>
                      void runAction(async () => {
                        await checkout.openDispute(order.id, disputeReason, disputeNote);
                        setDisputeOpen(false);
                        return true;
                      })
                    }
                  />
                  <Button label="Back" variant="ghost" onPress={() => setDisputeOpen(false)} />
                </View>
              ) : null}

              {canReview ? (
                <ReviewBox
                  stars={stars}
                  setStars={setStars}
                  comment={comment}
                  setComment={setComment}
                  busy={actionBusy}
                  disabled={!isConnected}
                  onFocusComment={() => keyboardScroll.onFieldFocus('review')}
                  commentAnchorRef={keyboardScroll.setAnchor('review')}
                  onSubmit={() => void runAction(() => checkout.submitReview(order.id, me, stars, comment))}
                />
              ) : order.reviewed ? (
                <AlertBanner variant="success" title="Review submitted" message="Thanks — your feedback helps the community." />
              ) : (
                <View style={styles.reviewLocked}>
                  <Text style={styles.reviewLockedTitle}>Leave a seller review</Text>
                  <Text style={styles.reviewLockedBody}>Available once this order is Completed.</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {disputeActive ? (
                <AlertBanner
                  variant="warning"
                  title="Payout on hold — this transaction is currently under review."
                  message={`The buyer opened a dispute on ${formatShortDate(order.dispute?.createdAt)}. Automatic completion is paused until the dispute is resolved.`}
                />
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardLabel}>Your payout</Text>
                <MoneyRow label="Item sale price" value={formatNaira(payout?.itemSalePrice ?? order.itemPrice)} />
                <MoneyRow
                  label={`Throve commission (${((payout?.commissionRate ?? 0.075) * 100).toFixed(1)}%)`}
                  value={`−${formatNaira(payout?.commission ?? 0)}`}
                  danger
                />
                <MoneyRow
                  label="Payment processing fee"
                  value={`−${formatNaira(payout?.processingFee ?? 0)}`}
                  danger
                />
                <View style={styles.divider} />
                <MoneyRow label="Net payout" value={formatNaira(payout?.netPayout ?? order.itemPrice)} bold />
                <View
                  style={[
                    styles.payoutStatusRow,
                    order.payoutStatus === 'on_hold' || order.payoutStatus === 'not_yet_eligible'
                      ? styles.payoutMuted
                      : styles.payoutEligible,
                  ]}
                >
                  <Text style={styles.payoutStatusLabel}>Payout status</Text>
                  <Text
                    style={[
                      styles.payoutStatusValue,
                      order.payoutStatus === 'on_hold' || order.payoutStatus === 'not_yet_eligible'
                        ? styles.payoutMutedText
                        : styles.payoutEligibleText,
                    ]}
                  >
                    {payoutLabel(order.payoutStatus)}
                  </Text>
                </View>
              </View>

              {order.dispute ? (
                <View style={styles.card}>
                  <View style={styles.disputeHeader}>
                    <Text style={styles.disputeTitle}>Dispute — {order.dispute.reason}</Text>
                    <View style={styles.underReview}>
                      <Text style={styles.underReviewText}>UNDER REVIEW</Text>
                    </View>
                  </View>
                  <Text style={styles.disputeBody}>
                    Opened {formatShortDate(order.dispute.createdAt)}. You can respond and attach evidence such as
                    dispatch proof or listing photographs.
                  </Text>
                  {order.dispute.sellerResponse ? (
                    <Text style={styles.cardHint}>Your reply: {order.dispute.sellerResponse}</Text>
                  ) : (
                    <>
                      <View ref={keyboardScroll.setAnchor('reply')} collapsable={false}>
                        <TextField
                          label="Respond"
                          value={sellerReply}
                          onChangeText={setSellerReply}
                          multiline
                          placeholder="Explain what happened"
                          onFocus={() => keyboardScroll.onFieldFocus('reply')}
                        />
                      </View>
                      <Button
                        label="Respond"
                        loading={actionBusy}
                        disabled={!sellerReply.trim() || !isConnected}
                        onPress={() =>
                          void runAction(async () => {
                            await checkout.respondToDispute(order.id, sellerReply.trim());
                            setSellerReply('');
                            return true;
                          })
                        }
                      />
                    </>
                  )}
                </View>
              ) : null}

              {payout?.verificationRequired ? (
                <View style={styles.verifyCard}>
                  <Text style={styles.disputeTitle}>Payout verification required</Text>
                  <Text style={styles.disputeBody}>
                    Complete your identity and bank verification before any payout can be released.
                  </Text>
                  <Button
                    label="Complete verification"
                    variant="secondary"
                    onPress={() => router.push('/profile/settings')}
                  />
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>Shipping</Text>
              <View style={styles.card}>
                <MoneyRow
                  label="Marked dispatched"
                  value={order.dispatchedAt ? formatShortDate(order.dispatchedAt) : '—'}
                />
                <MoneyRow label="Tracking" value={order.trackingNumber ?? '—'} />
                {order.deliveredAt ? (
                  <MoneyRow label="Delivered" value={formatShortDate(order.deliveredAt)} />
                ) : null}
              </View>

              {trackingEdit || !order.trackingNumber ? (
                <View style={styles.card}>
                  <View ref={keyboardScroll.setAnchor('tracking')} collapsable={false}>
                    <TextField
                      label="Tracking number"
                      value={trackingInput}
                      onChangeText={setTrackingInput}
                      autoCapitalize="characters"
                      onFocus={() => keyboardScroll.onFieldFocus('tracking')}
                    />
                  </View>
                  <Button
                    label={order.trackingNumber ? 'Save tracking' : 'Add tracking'}
                    loading={actionBusy}
                    disabled={!trackingInput.trim() || !isConnected || !canUpdateTracking}
                    onPress={() =>
                      void runAction(async () => {
                        await checkout.updateTracking(order.id, trackingInput.trim());
                        setTrackingEdit(false);
                        return true;
                      })
                    }
                  />
                  {order.trackingNumber ? (
                    <Button label="Cancel" variant="ghost" onPress={() => setTrackingEdit(false)} />
                  ) : null}
                </View>
              ) : (
                <Button label="Update tracking" variant="secondary" onPress={() => setTrackingEdit(true)} />
              )}

              <View style={styles.actions}>
                {canDispatch ? (
                  <Button
                    label="Mark as dispatched"
                    loading={actionBusy}
                    disabled={!isConnected}
                    onPress={() => void runAction(() => checkout.markDispatched(order.id, me))}
                  />
                ) : (
                  <>
                    <Button label="Mark as dispatched" disabled />
                    <Text style={styles.help}>
                      {order.status === 'paid'
                        ? 'Reconnect to mark this order dispatched.'
                        : 'Already dispatched. Cancelling is only available while an order is Paid or Awaiting dispatch.'}
                    </Text>
                  </>
                )}

                {canMarkDelivered ? (
                  <Button
                    label="Mark as delivered"
                    variant="secondary"
                    loading={actionBusy}
                    disabled={!isConnected}
                    onPress={() => void runAction(() => checkout.markDelivered(order.id))}
                  />
                ) : null}

                <Button label="Message buyer" variant="secondary" onPress={() => void message()} />

                {canCancel && !cancelOpen ? (
                  <Button label="Cancel order" variant="secondary" onPress={() => setCancelOpen(true)} />
                ) : null}
              </View>

              {cancelOpen ? (
                <CancelBox
                  onPick={(reason) =>
                    void runAction(async () => {
                      await checkout.cancelOrder(order.id, me, reason);
                      setCancelOpen(false);
                      return true;
                    })
                  }
                  onBack={() => setCancelOpen(false)}
                />
              ) : null}
            </>
          )}

          {liveSession?.status === 'live' && order.fromLiveId ? (
            <Button label="Return to live" variant="live" onPress={() => router.replace(`/live/${order.fromLiveId}`)} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <View key={step.id} style={styles.timelineRow}>
            <View style={styles.dotCol}>
              <View
                style={[
                  styles.dot,
                  step.done || step.current ? styles.dotOn : styles.dotOff,
                  step.id === 'cancelled' ? styles.dotCancel : null,
                ]}
              />
              {!last ? (
                <View style={[styles.lineBar, step.done ? styles.lineOn : styles.lineOff]} />
              ) : null}
            </View>
            <View style={styles.stepCopy}>
              <Text
                style={[
                  styles.stepLabel,
                  step.current ? styles.stepCurrent : step.done ? styles.stepOn : styles.stepOff,
                ]}
              >
                {step.label}
              </Text>
              {step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MoneyRow({
  label,
  value,
  bold,
  danger,
  onInfoPress,
}: {
  label: string;
  value: string;
  bold?: boolean;
  danger?: boolean;
  onInfoPress?: () => void;
}) {
  return (
    <View style={styles.moneyRow}>
      <View style={styles.moneyLabelWrap}>
        <Text style={[styles.moneyLabel, bold ? styles.moneyBold : null]}>{label}</Text>
        {onInfoPress ? (
          <Pressable onPress={onInfoPress} hitSlop={8} accessibilityLabel={`${label} information`}>
            <InfoCircleIcon size={15} color={Palette.muted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.moneyValue, bold ? styles.moneyBold : null, danger ? styles.moneyDanger : null]}>
        {value}
      </Text>
    </View>
  );
}

function CancelBox({ onPick, onBack }: { onPick: (reason: string) => void; onBack: () => void }) {
  return (
    <View style={styles.cancelBox}>
      <Text style={styles.cancelTitle}>Why are you cancelling?</Text>
      {CANCEL_REASONS.map((reason) => (
        <Pressable key={reason} style={styles.reason} onPress={() => onPick(reason)}>
          <Text style={styles.reasonLabel}>{reason}</Text>
        </Pressable>
      ))}
      <Button label="Back" variant="ghost" onPress={onBack} />
    </View>
  );
}

function ReviewBox({
  stars,
  setStars,
  comment,
  setComment,
  busy,
  disabled,
  onSubmit,
  onFocusComment,
  commentAnchorRef,
}: {
  stars: number;
  setStars: (n: number) => void;
  comment: string;
  setComment: (v: string) => void;
  busy: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onFocusComment?: () => void;
  commentAnchorRef?: (node: View | null) => void;
}) {
  return (
    <View style={styles.review}>
      <Text style={styles.sectionTitle}>Leave a seller review</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setStars(value)} hitSlop={6}>
            <StarRating rating={value <= stars ? 1 : 0} size={22} />
          </Pressable>
        ))}
      </View>
      <View ref={commentAnchorRef} collapsable={false}>
        <TextField
          label="Comment"
          placeholder="Optional — share your experience"
          value={comment}
          onChangeText={setComment}
          multiline
          style={styles.comment}
          onFocus={onFocusComment}
        />
      </View>
      <Button label="Submit review" disabled={stars < 1 || disabled} loading={busy} onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  flex: { flex: 1 },
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  skeleton: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  missingBody: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, gap: Spacing.lg },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  orderId: { fontSize: 11.5, fontFamily: Typography.body, color: Palette.muted, fontVariant: ['tabular-nums'] },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10.5, letterSpacing: 0.7, fontFamily: Typography.bodySemiBold },
  itemCard: {
    flexDirection: 'row',
    gap: 13,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    padding: 13,
  },
  thumb: { width: 64, height: 74, borderRadius: 5, backgroundColor: Palette.skeleton },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 14, lineHeight: 19, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  itemMeta: { marginTop: 4, fontSize: 11.5, fontFamily: Typography.body, color: Palette.muted },
  itemPrice: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Palette.borderSoft },
  personCopy: { flex: 1 },
  personName: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  personRole: { fontSize: 11, fontFamily: Typography.body, color: Palette.muted },
  messagePill: {
    borderWidth: 1,
    borderColor: Palette.plum,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  messagePillText: { fontSize: 12, fontFamily: Typography.bodySemiBold, color: Palette.plum },
  sectionTitle: { fontSize: 19, fontFamily: Typography.display, color: Palette.espresso, marginTop: 4 },
  timelineRow: { flexDirection: 'row', gap: 13, minHeight: 36 },
  dotCol: { width: 11, alignItems: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6 },
  dotOn: { backgroundColor: Palette.plum },
  dotOff: { backgroundColor: Palette.ivory, borderWidth: 1.5, borderColor: Palette.borderSoft },
  dotCancel: { backgroundColor: Palette.errorText },
  lineBar: { width: 1.5, flex: 1, minHeight: 18, marginTop: 2 },
  lineOn: { backgroundColor: Palette.plum },
  lineOff: { backgroundColor: Palette.border },
  stepCopy: { flex: 1, paddingBottom: 18 },
  stepLabel: { fontSize: 13.5, fontFamily: Typography.bodySemiBold },
  stepOn: { color: Palette.espresso },
  stepCurrent: { color: Palette.plum },
  stepOff: { color: Palette.muted2 },
  stepDetail: { marginTop: 2, fontSize: 11.5, fontFamily: Typography.body, color: Palette.muted },
  card: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    padding: 15,
    gap: 8,
  },
  cardLabel: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    marginBottom: 3,
  },
  cardHint: { fontSize: 11.5, lineHeight: 18, fontFamily: Typography.body, color: Palette.muted },
  address: { fontSize: 13, lineHeight: 21, fontFamily: Typography.body, color: Palette.body },
  trackingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackingValue: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  copyLink: { fontSize: 12, fontFamily: Typography.bodySemiBold, color: Palette.plum },
  protectBanner: {
    flexDirection: 'row',
    gap: 11,
    borderWidth: 1,
    borderColor: '#DCE3DA',
    backgroundColor: Palette.successBg,
    borderRadius: Radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  protectTitle: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: '#3F5A3C', marginBottom: 3 },
  protectBody: { fontSize: 11.5, lineHeight: 18, fontFamily: Typography.body, color: '#5C6B58' },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  moneyLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  moneyLabel: { flexShrink: 1, fontSize: 13, fontFamily: Typography.body, color: Palette.body },
  moneyValue: { fontSize: 13, fontFamily: Typography.body, color: Palette.espresso, fontVariant: ['tabular-nums'] },
  moneyBold: { fontFamily: Typography.bodySemiBold, fontSize: 15 },
  moneyDanger: { color: Palette.errorText },
  divider: { height: 1, backgroundColor: Palette.divider, marginVertical: 4 },
  actions: { gap: 10 },
  help: { fontSize: 11.5, lineHeight: 18, fontFamily: Typography.body, color: Palette.muted, paddingHorizontal: 4 },
  helpCenter: { fontSize: 11, color: Palette.muted2, textAlign: 'center', marginTop: 4 },
  cancelBox: {
    padding: Spacing.lg,
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  cancelTitle: { fontSize: 14, fontFamily: Typography.bodySemiBold, color: Palette.errorText },
  reason: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    justifyContent: 'center',
  },
  reasonLabel: { fontSize: 13, fontFamily: Typography.body, color: Palette.espresso },
  reasonSelected: { color: Palette.plum, fontFamily: Typography.bodySemiBold },
  disputeTitle: { fontSize: 13.5, fontFamily: Typography.bodySemiBold, color: Palette.espresso, flex: 1 },
  disputeBody: { fontSize: 11.5, lineHeight: 19, fontFamily: Typography.body, color: Palette.muted },
  disputeBtn: { borderColor: Palette.errorText },
  disputeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  underReview: {
    borderWidth: 1,
    borderColor: '#E9CFA6',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  underReviewText: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
  },
  verifyCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: '#F7F1EA',
    borderRadius: Radius.sm,
    padding: 14,
    gap: 10,
  },
  review: { gap: Spacing.md },
  stars: { flexDirection: 'row', gap: Spacing.sm },
  comment: { minHeight: 72, paddingTop: Spacing.sm, textAlignVertical: 'top' },
  reviewLocked: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    padding: 15,
    alignItems: 'center',
  },
  reviewLockedTitle: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    marginBottom: 5,
  },
  reviewLockedBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted2,
    textAlign: 'center',
  },
  payoutStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  payoutMuted: { backgroundColor: Palette.warningBg },
  payoutEligible: { backgroundColor: Palette.successBg },
  payoutStatusLabel: { fontSize: 12, fontFamily: Typography.body, color: Palette.muted },
  payoutStatusValue: { fontSize: 12, fontFamily: Typography.bodySemiBold },
  payoutMutedText: { color: Palette.warningText },
  payoutEligibleText: { color: Palette.successText },
});
