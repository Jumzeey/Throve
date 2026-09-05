import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { ClockIcon, ProhibitedIcon, ShieldCheckIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { leaveCheckout, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { useListings } from '@/context/listings-context';
import { checkoutTotals } from '@/data/checkout';
import { getListingImageSource } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatCountdown, formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CheckoutSummaryScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const live = useLive();
  const { getListing } = useListings();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId) ?? getListing(draft.listingId);
  const remaining = checkout.remaining;
  const expired = remaining <= 0;
  const sold = listing?.status === 'sold' || listing?.status === 'removed';
  const reservedOk = listing?.status === 'reserved' || Boolean(draft.liveSessionId) || Boolean(draft.offerId);

  if (!draft.deliveryMethod && !expired && !sold) {
    return <Redirect href="/checkout/delivery" />;
  }

  const itemPrice = draft.itemPrice ?? listing?.price ?? 0;
  const listedPrice = draft.listedPrice ?? null;
  const totals = checkoutTotals({
    itemPrice,
    deliveryMethod: draft.deliveryMethod,
    listedPrice,
  });
  const shipLines = {
    name: draft.name,
    address: [draft.address, draft.city, draft.state].filter(Boolean).join(', '),
    phone: draft.phone,
  };
  const deliveryLabelText =
    totals.delivery.value === 'Express' ? 'Express delivery' : 'Standard delivery';
  const deliveryEta = totals.delivery.eta.replace(/^Estimated\s+/i, '');

  async function leave() {
    const liveId = await checkout.cancelCheckout();
    leaveCheckout(router, liveId, draft.listingId);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Review order" onBack={() => router.back()} />
      <CheckoutProgress step={3} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl + bottom }]}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to continue checkout." />
        ) : null}

        {!listing ? (
          <AlertBanner
            variant="error"
            title="We couldn't load your order summary"
            message="Please try again in a moment."
          />
        ) : null}

        {sold ? (
          <View style={styles.soldBox}>
            <ProhibitedIcon color={Palette.muted} />
            <View style={styles.stateCopy}>
              <Text style={styles.soldTitle}>This item has sold</Text>
              <Text style={styles.soldBody}>Checkout is closed for it. Nothing about the buyer is shown.</Text>
            </View>
          </View>
        ) : null}

        {expired && !sold ? (
          <View style={styles.expiredBox}>
            <ClockIcon color={Palette.error} />
            <View style={styles.stateCopy}>
              <Text style={styles.expiredTitle}>This item is no longer reserved for you</Text>
              <Text style={styles.expiredBody}>
                Your hold ran out. Check the listing — if it's still available you can start checkout again.
              </Text>
            </View>
          </View>
        ) : null}

        {!expired && !sold && listing ? (
          <View style={styles.holdBox}>
            <ClockIcon color={Palette.warning} />
            <Text style={styles.holdCopy}>
              {draft.liveSessionId
                ? 'A Live claim keeps its own approved 5-minute window.'
                : 'Held for you while you check out'}
            </Text>
            <Text style={styles.holdTimer}>{formatCountdown(remaining)}</Text>
          </View>
        ) : null}

        {listing ? (
          <View style={styles.itemCard}>
            <AppImage source={getListingImageSource(listing)} style={styles.thumb} />
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>{listing.title}</Text>
              <Text style={styles.itemSub}>
                Sold by{' '}
                <Text style={styles.sellerLink} onPress={() => router.push(`/seller/${listing.seller}`)}>
                  {listing.seller}
                </Text>
              </Text>
              {listedPrice != null && listedPrice !== itemPrice ? (
                <View style={styles.priceStack}>
                  <Text style={styles.listedStruck}>{formatNaira(listedPrice)}</Text>
                  <Text style={styles.itemPrice}>{formatNaira(itemPrice)}</Text>
                </View>
              ) : (
                <Text style={styles.itemPrice}>{formatNaira(itemPrice)}</Text>
              )}
            </View>
          </View>
        ) : null}

        {!sold ? (
          <View style={styles.card}>
            <View style={styles.cardSection}>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>Delivering to</Text>
                {!expired ? (
                  <Pressable onPress={() => router.push('/checkout/shipping')} hitSlop={8}>
                    <Text style={styles.change}>Change</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.cardStrong}>{shipLines.name}</Text>
              <Text style={styles.cardBody}>{shipLines.address}</Text>
              <Text style={styles.cardMuted}>{shipLines.phone}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardSection}>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>Delivery method</Text>
                {!expired ? (
                  <Pressable onPress={() => router.push('/checkout/delivery')} hitSlop={8}>
                    <Text style={styles.change}>Change</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.cardStrong}>{deliveryLabelText}</Text>
              <Text style={styles.cardMuted}>{deliveryEta}</Text>
            </View>
          </View>
        ) : null}

        {!sold ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Payment summary</Text>
            {listedPrice != null && listedPrice !== itemPrice ? (
              <Row label="Listed price" value={formatNaira(listedPrice)} struck />
            ) : null}
            <Row
              label={listedPrice != null && listedPrice !== itemPrice ? 'Accepted offer price' : 'Item price'}
              value={formatNaira(itemPrice)}
            />
            <Row label={deliveryLabelText} value={formatNaira(totals.delivery.fee)} />
            <Row
              label={`Buyer Protection fee (5% of item, max ₦2,500)`}
              value={formatNaira(totals.protectionFee)}
            />
            <View style={styles.totalDivider} />
            <Row label="Total to pay" value={formatNaira(totals.total)} bold />
          </View>
        ) : null}

        {!sold && !expired ? (
          <View style={styles.protectBox}>
            <ShieldCheckIcon color={Palette.success} />
            <View style={styles.stateCopy}>
              <Text style={styles.protectTitle}>Buyer Protection is included</Text>
              <Text style={styles.protectBody}>
                Covers non-delivery and items that are wrong or materially different from the listing. Change of mind
                is not covered.
              </Text>
            </View>
          </View>
        ) : null}

        {expired || sold ? (
          <>
            <Button label="Continue to payment · unavailable" disabled />
            <Button label="Back to listing" variant="secondary" onPress={leave} />
          </>
        ) : (
          <>
            <Button
              label="Continue to payment"
              onPress={() => router.push('/checkout/payment')}
              disabled={!isConnected || !listing || !reservedOk}
            />
            <Text style={styles.disclaimer}>
              Reviewing this page doesn't buy the item — the purchase completes once payment succeeds.
            </Text>
          </>
        )}

        <Text style={styles.footerNote}>
          Buyer checkout shows item, delivery and Buyer Protection only — seller commission, processing fees and payout
          never appear here.
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  struck,
}: {
  label: string;
  value: string;
  bold?: boolean;
  struck?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold ? styles.rowLabelBold : null]}>{label}</Text>
      <Text style={[styles.rowValue, bold ? styles.rowValueBold : null, struck ? styles.struck : null]}>{value}</Text>
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
    paddingTop: Spacing.lg,
    gap: 14,
  },
  holdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
    backgroundColor: Palette.warningBg,
    borderRadius: Radius.sm,
  },
  holdCopy: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.warningText,
  },
  holdTimer: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
    fontVariant: ['tabular-nums'],
  },
  expiredBox: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    backgroundColor: Palette.errorBg,
    borderRadius: Radius.sm,
  },
  expiredTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.error,
    marginBottom: 3,
  },
  expiredBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.errorBody,
  },
  soldBox: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.sand,
    borderRadius: Radius.sm,
  },
  soldTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    marginBottom: 3,
  },
  soldBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  stateCopy: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: Palette.divider,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
  },
  thumb: {
    width: 64,
    height: 78,
    borderRadius: 5,
    backgroundColor: Palette.skeleton,
  },
  itemMeta: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemSub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  sellerLink: {
    color: Palette.plum,
    fontFamily: Typography.bodySemiBold,
  },
  itemPrice: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  priceStack: {
    marginTop: 8,
    gap: 2,
  },
  listedStruck: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  card: {
    borderWidth: 1,
    borderColor: Palette.divider,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
    padding: 14,
    gap: 10,
  },
  cardSection: {
    gap: 3,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  change: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  cardStrong: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  cardMuted: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginVertical: 4,
  },
  totalDivider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  rowLabelBold: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  rowValueBold: {
    fontSize: 18,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  struck: {
    textDecorationLine: 'line-through',
    color: Palette.muted,
  },
  protectBox: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Palette.successBorder,
    backgroundColor: Palette.successBg,
    borderRadius: Radius.sm,
  },
  protectTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.successText,
    marginBottom: 3,
  },
  protectBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: '#5C6B58',
  },
  disclaimer: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  footerNote: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
});
