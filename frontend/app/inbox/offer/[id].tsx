import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { ChatBubbleIcon, ClockIcon, InfoCircleIcon } from '@/components/ui/icons';
import { OfferSheet } from '@/components/ui/offer-sheet';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getListingImageSource } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { effectiveOfferStatus, formatOfferCountdown, offerChipVariant } from '@/lib/offer-display';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function OfferDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const inbox = useInbox();
  const { getListing } = useListings();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const offer = id ? inbox.getOffer(id) : undefined;
  if (!offer || (offer.buyer !== session.username && offer.seller !== session.username)) {
    return <Redirect href="/inbox/offers" />;
  }

  const listing = getListing(offer.listingId);
  const me = session.username;
  const isBuyer = offer.buyer === me;
  const status = effectiveOfferStatus(offer);
  const chip = offerChipVariant(offer, isBuyer, status);
  const countdown = formatOfferCountdown(offer.expiresAt, now);
  const listingReserved = listing?.status === 'reserved';
  const listingSold = listing?.status === 'sold' || listing?.status === 'removed';
  const listingAvailable = listing?.status === 'available';
  const canCheckout = isBuyer && status === 'accepted' && listingAvailable;
  const checkoutBlocked = isBuyer && status === 'accepted' && (listingReserved || listingSold);
  const metaLine = [listing?.department, listing?.category, listing?.condition].filter(Boolean).join(' · ');
  const priceLabel =
    status === 'accepted' ? 'Accepted offer price' : offer.initiator === 'seller' ? "Seller's counter" : 'Offer price';

  async function runAction(task: () => Promise<unknown>) {
    if (!isConnected) return;
    setBusy(true);
    setActionError(false);
    try {
      await task();
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }

  async function openChat() {
    const counterpart = isBuyer ? offer.seller : offer.buyer;
    const conv = await inbox.openOrCreateConversation(counterpart, offer.listingId, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  async function startBuy() {
    if (!listing || !canCheckout) return;
    await runAction(async () => {
      const started = await checkout.startCheckout({
        listingId: listing.id,
        buyer: me,
        liveSessionId: null,
        offerId: offer.id,
        itemPrice: offer.amount,
        listedPrice: listing.price,
      });
      if (started) router.push('/checkout/shipping');
      else setActionError(true);
    });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Offer details" onBack={() => router.back()} large />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: sheetBottom + 24 }]}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to respond to this offer." style={styles.banner} />
        ) : null}
        {actionError ? (
          <AlertBanner
            variant="error"
            title="We couldn't complete that"
            message="Please try again in a moment."
            style={styles.banner}
          />
        ) : null}

        <View style={styles.headRow}>
          <Text style={styles.headLabel}>{isBuyer ? 'Your offer' : 'Offer received'}</Text>
          {listingReserved && status === 'accepted' ? (
            <StatusChip kind="listing" variant="reserved" />
          ) : listingSold && status === 'accepted' ? (
            <StatusChip kind="listing" variant="sold" />
          ) : (
            <StatusChip kind="offer" variant={chip} />
          )}
        </View>

        <Pressable
          onPress={() => listing && router.push(`/product/${listing.id}`)}
          style={styles.product}>
          <AppImage source={listing ? getListingImageSource(listing) : null} style={styles.thumb} />
          <View style={styles.productMeta}>
            <Text style={styles.productTitle}>{listing?.title ?? 'Listing'}</Text>
            {metaLine ? <Text style={styles.productSub}>{metaLine}</Text> : null}
            <Text style={styles.viewListing}>View listing</Text>
          </View>
        </Pressable>

        {chip === 'countered' || (offer.initiator === 'seller' && offer.previousAmount != null) ? (
          <View style={styles.counterCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceMuted}>Listed</Text>
              <Text style={styles.priceValue}>{listing ? formatNaira(listing.price) : '—'}</Text>
            </View>
            {offer.previousAmount != null ? (
              <View style={[styles.priceRow, styles.priceDivider]}>
                <Text style={styles.priceMuted}>You offered</Text>
                <Text style={styles.priceValue}>{formatNaira(offer.previousAmount)}</Text>
              </View>
            ) : null}
            <View style={[styles.priceRow, styles.priceHighlight]}>
              <Text style={styles.priceBody}>{"Seller's counter"}</Text>
              <Text style={styles.priceStrong}>{formatNaira(offer.amount)}</Text>
            </View>
            {countdown && status === 'pending' ? (
              <Text style={styles.expiresInline}>Expires in {countdown}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceBody}>Listing price</Text>
              <Text style={styles.priceValue}>{listing ? formatNaira(listing.price) : '—'}</Text>
            </View>
            <View style={[styles.priceRow, styles.priceHighlight]}>
              <Text style={styles.priceBody}>{priceLabel}</Text>
              <Text style={styles.priceStrong}>{formatNaira(offer.amount)}</Text>
            </View>
          </View>
        )}

        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Buyer</Text>
            <Text style={styles.metaValue}>{isBuyer ? `You (${me})` : offer.buyer}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Seller</Text>
            {isBuyer ? (
              <Pressable onPress={() => router.push(`/seller/${offer.seller}`)} hitSlop={6}>
                <Text style={[styles.metaValue, styles.metaLink]}>{offer.seller}</Text>
              </Pressable>
            ) : (
              <Text style={styles.metaValue}>{`You (${me})`}</Text>
            )}
          </View>
          {countdown && (status === 'pending' || status === 'accepted') ? (
            <View style={[styles.metaRow, styles.metaRowLast]}>
              <Text style={styles.metaLabel}>Offer expires</Text>
              <Text style={styles.metaWarn}>In {countdown}</Text>
            </View>
          ) : null}
        </View>

        {status === 'accepted' && listingAvailable ? (
          <View style={styles.infoBox}>
            <InfoCircleIcon color={Palette.plum} />
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Still available to other buyers</Text>
              <Text style={styles.infoBody}>
                An accepted offer doesn't reserve or sell the item. It is reserved only when you start checkout, and sold
                once payment completes.
              </Text>
            </View>
          </View>
        ) : null}

        {listingReserved && status === 'accepted' ? (
          <View style={styles.reservedBox}>
            <ClockIcon color={Palette.warning} />
            <View style={styles.infoCopy}>
              <Text style={styles.reservedTitle}>Temporarily unavailable</Text>
              <Text style={styles.reservedBody}>
                Someone else is completing checkout. If it isn't completed, the item returns to Available and your
                accepted price still applies until it expires.
              </Text>
            </View>
          </View>
        ) : null}

        {status === 'rejected' ? (
          <Text style={styles.helper}>
            The seller declined this offer. You can still open the listing or send a new offer if it's available.
          </Text>
        ) : null}
        {status === 'withdrawn' ? (
          <Text style={styles.helper}>You withdrew this offer. Its history stays here for reference.</Text>
        ) : null}
        {status === 'expired' ? (
          <Text style={styles.helper}>
            This offer expired 24 hours after it was sent. You can view it but no longer act on it.
          </Text>
        ) : null}
        {listingSold && status === 'accepted' ? (
          <Text style={styles.helper}>
            This item has sold, so checkout, new offers and all purchase actions are closed. Your offer history stays
            viewable and the seller's profile can still be opened. Nothing about the buyer is shown.
          </Text>
        ) : null}
        {listingReserved && status === 'accepted' ? (
          <Text style={styles.helper}>
            Checkout is disabled while another buyer holds the reservation. Nothing about them is shown.
          </Text>
        ) : null}

        <View style={styles.actions}>
          {status === 'pending' && !isBuyer && offer.initiator === 'buyer' ? (
            <>
              <Button
                label="Accept offer"
                disabled={!isConnected || busy}
                loading={busy}
                onPress={() => runAction(() => inbox.acceptOffer(offer.id, me))}
              />
              <View style={styles.rowActions}>
                <Button
                  label="Counter"
                  variant="secondary"
                  disabled={!isConnected || busy || !listing}
                  onPress={() => setCounterOpen(true)}
                  style={styles.half}
                />
                <Pressable
                  disabled={!isConnected || busy}
                  onPress={() => runAction(() => inbox.rejectOffer(offer.id, me))}
                  style={[styles.outlineMuted, (!isConnected || busy) && styles.outlineDisabled]}>
                  <Text style={styles.outlineMutedLabel}>Reject</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {status === 'pending' && isBuyer && offer.initiator === 'buyer' ? (
            <>
              <Button
                label="Withdraw offer"
                variant="secondary"
                disabled={!isConnected || busy}
                loading={busy}
                onPress={() => runAction(() => inbox.withdrawOffer(offer.id, me))}
              />
              <Text style={styles.caption}>Withdraw is available only while the offer is still pending.</Text>
            </>
          ) : null}

          {status === 'pending' && isBuyer && offer.initiator === 'seller' ? (
            <View style={styles.rowActions}>
              <Button
                label="Accept"
                disabled={!isConnected || busy}
                loading={busy}
                onPress={() => runAction(() => inbox.acceptOffer(offer.id, me))}
                style={styles.half}
              />
              <Pressable
                disabled={!isConnected || busy}
                onPress={() => runAction(() => inbox.rejectOffer(offer.id, me))}
                style={[styles.outlineMuted, (!isConnected || busy) && styles.outlineDisabled]}>
                <Text style={styles.outlineMutedLabel}>Reject</Text>
              </Pressable>
            </View>
          ) : null}

          {status === 'pending' && !isBuyer && offer.initiator === 'seller' ? (
            <Button
              label="Withdraw offer"
              variant="secondary"
              disabled={!isConnected || busy}
              loading={busy}
              onPress={() => runAction(() => inbox.withdrawOffer(offer.id, me))}
            />
          ) : null}

          {canCheckout ? (
            <>
              <Button
                label={`Continue to checkout · ${formatNaira(offer.amount)}`}
                disabled={!isConnected || busy}
                loading={busy}
                onPress={startBuy}
              />
              <OpenChatButton onPress={() => runAction(openChat)} disabled={busy} />
              <Text style={styles.caption}>
                Checkout starts on Shipping details and reserves the item while you complete it.
              </Text>
            </>
          ) : null}

          {checkoutBlocked ? (
            <>
              <Button label="Continue to checkout · unavailable" disabled />
              {listingSold ? (
                <Button
                  label="See seller's other items"
                  variant="secondary"
                  onPress={() => router.push(`/seller/${offer.seller}`)}
                />
              ) : null}
            </>
          ) : null}

          {status === 'accepted' && !isBuyer && listingAvailable ? (
            <>
              <Text style={styles.helper}>Waiting for the buyer to start checkout.</Text>
              <OpenChatButton onPress={() => runAction(openChat)} disabled={busy} />
            </>
          ) : null}

          {status === 'rejected' ? <OpenChatButton onPress={() => runAction(openChat)} disabled={busy} /> : null}

          {status === 'expired' ? (
            <>
              <Button label="Accept" disabled />
              <View style={styles.rowActions}>
                <Button label="Counter" disabled style={styles.half} />
                <Button label="Withdraw" disabled style={styles.half} />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {listing ? (
        <OfferSheet
          visible={counterOpen}
          listingPrice={listing.price}
          title="Counter offer"
          onClose={() => setCounterOpen(false)}
          onSubmit={(amount) => {
            setCounterOpen(false);
            void runAction(() => inbox.counterOffer(offer.id, amount, me));
          }}
        />
      ) : null}
    </View>
  );
}

function OpenChatButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.chatBtn, disabled && styles.outlineDisabled]}>
      <ChatBubbleIcon size={16} color={Palette.plum} />
      <Text style={styles.chatLabel}>Open chat</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    gap: 16,
  },
  banner: {
    marginBottom: 0,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headLabel: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 13,
    borderWidth: 1,
    borderColor: Palette.divider,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
  },
  thumb: {
    width: 64,
    height: 78,
    borderRadius: 5,
    backgroundColor: Palette.skeleton,
  },
  productMeta: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  productSub: {
    marginTop: 4,
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  viewListing: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  priceCard: {
    borderWidth: 1,
    borderColor: Palette.divider,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    paddingHorizontal: 15,
    paddingVertical: 4,
  },
  counterCard: {
    borderWidth: 1,
    borderColor: Palette.divider,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivory,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  priceDivider: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  priceHighlight: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    alignItems: 'baseline',
    paddingTop: 11,
    paddingBottom: 12,
  },
  priceMuted: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  priceBody: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  priceValue: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  priceStrong: {
    fontSize: 20,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  expiresInline: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.warningText,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    marginTop: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  metaRowLast: {
    borderBottomWidth: 0,
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  metaLink: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  metaWarn: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.warningText,
    fontVariant: ['tabular-nums'],
  },
  infoBox: {
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Palette.divider,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
  },
  reservedBox: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
    borderRadius: Radius.sm,
    backgroundColor: Palette.warningBg,
  },
  reservedTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
    marginBottom: 3,
  },
  reservedBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    marginBottom: 3,
  },
  infoBody: {
    fontSize: 11.5,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  helper: {
    fontSize: 11.5,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 9,
  },
  half: {
    flex: 1,
  },
  outlineMuted: {
    flex: 1,
    minHeight: 52,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  outlineMutedLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.body,
  },
  outlineDisabled: {
    opacity: 0.55,
  },
  chatBtn: {
    minHeight: 48,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Palette.plum,
    backgroundColor: Palette.ivoryElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  caption: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
});
