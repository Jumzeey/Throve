import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CloseIcon, HeartIcon, ImagePlaceholderIcon } from '@/components/ui/icons';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { OfferSheet } from '@/components/ui/offer-sheet';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getListingImageSource } from '@/data/images';
import type { Listing } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SavedItemsScreen() {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const { savedListingsFor, toggleSave, loading, refresh } = useListings();
  const checkout = useCheckout();
  const inbox = useInbox();
  const { isConnected } = useNetworkStatus();
  const [loadError, setLoadError] = useState(false);
  const [offerFor, setOfferFor] = useState<Listing | null>(null);

  const saved = session?.username ? savedListingsFor(session.username) : [];

  const pullTask = useCallback(async () => {
    setLoadError(false);
    const ok = await refresh();
    if (!ok) setLoadError(true);
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const username = session.username;
  const isLoading = loading && !refreshing && saved.length === 0;

  async function buyNow(listing: Listing) {
    if (listing.status !== 'available') return;
    const started = await checkout.startCheckout({ listingId: listing.id, buyer: username, liveSessionId: null });
    if (started) router.push('/checkout/shipping');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Saved" onBack={() => router.back()} large />
      <Text style={styles.subtitle}>
        {saved.length} item{saved.length === 1 ? '' : 's'}
      </Text>

      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={[styles.body, { paddingBottom: sheetBottom + 24 }]}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to see current item status." />
        ) : null}
        {loadError ? (
          <AlertBanner
            variant="error"
            title="We couldn't load your saved items"
            message="Please try again in a moment."
          />
        ) : null}

        {isLoading ? (
          <SavedSkeleton />
        ) : saved.length === 0 && !loadError ? (
          <EmptyState
            title="Nothing saved yet"
            message="Tap the heart on any listing to keep it here."
            actionLabel="Start browsing"
            onAction={() => router.push('/(tabs)')}
            style={styles.empty}
          />
        ) : (
          <View style={styles.list}>
            {saved.map((item) => (
              <SavedRow
                key={item.id}
                listing={item}
                onOpen={() => {
                  if (item.status === 'removed') return;
                  router.push(`/product/${item.id}`);
                }}
                onSeller={() => {
                  if (item.status === 'removed') return;
                  router.push({ pathname: '/seller/[username]', params: { username: item.seller } });
                }}
                onUnsave={() => void toggleSave(item.id, username)}
                onOffer={() => setOfferFor(item)}
                onBuy={() => void buyNow(item)}
              />
            ))}
          </View>
        )}
      </LiquidRefreshScrollView>

      <OfferSheet
        visible={Boolean(offerFor)}
        listingPrice={offerFor?.price ?? 0}
        onClose={() => setOfferFor(null)}
        onSubmit={(amount) => {
          if (!offerFor) return;
          void inbox
            .createOffer({
              listingId: offerFor.id,
              buyer: username,
              seller: offerFor.seller,
              amount,
              initiator: 'buyer',
            })
            .then((created) => {
              setOfferFor(null);
              if (created) router.push(`/inbox/offer/${created.id}`);
            });
        }}
      />
    </View>
  );
}

function SavedRow({
  listing,
  onOpen,
  onSeller,
  onUnsave,
  onOffer,
  onBuy,
}: {
  listing: Listing;
  onOpen: () => void;
  onSeller: () => void;
  onUnsave: () => void;
  onOffer: () => void;
  onBuy: () => void;
}) {
  const removed = listing.status === 'removed';
  const reserved = listing.status === 'reserved';
  const sold = listing.status === 'sold';
  const hidden = listing.status === 'hidden';
  const available = listing.status === 'available';

  const chipVariant: ListingChipVariant =
    listing.status === 'removed'
      ? 'removed'
      : listing.status === 'reserved'
        ? 'reserved'
        : (listing.status as ListingChipVariant);

  return (
    <View style={styles.row}>
      <Pressable onPress={onOpen} style={styles.rowMain} disabled={removed}>
        {removed ? (
          <View style={styles.removedThumb}>
            <ImagePlaceholderIcon size={22} color={Palette.muted3} />
          </View>
        ) : (
          <AppImage source={getListingImageSource(listing)} style={styles.thumb} />
        )}
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {listing.title}
            </Text>
            <Pressable onPress={onUnsave} hitSlop={8} style={styles.iconBtn}>
              {removed ? <CloseIcon size={14} color={Palette.muted} /> : <HeartIcon size={15} filled color={Palette.plum} />}
            </Pressable>
          </View>

          {removed ? (
            <Text style={styles.meta}>This listing was removed by the seller.</Text>
          ) : (
            <Text style={styles.meta}>
              {listing.condition} ·{' '}
              <Text style={styles.sellerLink} onPress={onSeller}>
                {listing.seller}
              </Text>
            </Text>
          )}

          {!removed ? (
            <Text style={[styles.price, sold && styles.priceSold]}>{formatNaira(listing.price)}</Text>
          ) : null}

          <StatusChip kind="listing" variant={chipVariant} />
        </View>
      </Pressable>

      {available ? (
        <View style={styles.actions}>
          <Button label="Make an offer" variant="secondary" onPress={onOffer} style={styles.actionBtn} />
          <Button label="Buy now" onPress={onBuy} style={styles.actionBtn} />
        </View>
      ) : null}

      {reserved || hidden ? (
        <>
          <View style={styles.actions}>
            <Button label="Make an offer" variant="secondary" disabled style={styles.actionBtn} />
            <Button label="Buy now" disabled style={styles.actionBtn} />
          </View>
          <Text style={styles.helper}>
            {reserved
              ? 'Temporarily unavailable while another buyer completes checkout. Buy now and Make an offer are disabled and non-interactive — no purchase can be started from them.'
              : 'This listing is hidden by the seller. Buy now and Make an offer are unavailable until it is listed again.'}
          </Text>
        </>
      ) : null}

      {sold ? <Button label="Sold" disabled style={styles.fullBtn} /> : null}

      {removed ? <Button label="Remove from Saved" variant="secondary" onPress={onUnsave} style={styles.fullBtn} /> : null}
    </View>
  );
}

function SavedSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: 2 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '78%' }]} />
            <View style={[styles.skeletonLine, { width: '52%', marginTop: 10 }]} />
            <View style={[styles.skeletonLine, { width: '36%', marginTop: 10 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  subtitle: {
    paddingHorizontal: Spacing.xl,
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  empty: {
    marginTop: Spacing.xl,
  },
  list: {
    gap: 0,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    gap: 12,
  },
  rowMain: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
  },
  removedThumb: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  sellerLink: {
    color: Palette.plum,
    fontFamily: Typography.bodySemiBold,
  },
  price: {
    fontSize: 16,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
  },
  priceSold: {
    textDecorationLine: 'line-through',
    color: Palette.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radius.pill,
  },
  fullBtn: {
    minHeight: 42,
    borderRadius: Radius.pill,
  },
  helper: {
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  skeletonList: { gap: 18, marginTop: 8 },
  skeletonRow: { flexDirection: 'row', gap: 12 },
  skeletonThumb: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
    backgroundColor: Palette.skeleton,
  },
  skeletonCopy: { flex: 1, justifyContent: 'center' },
  skeletonLine: { height: 11, borderRadius: 5, backgroundColor: Palette.skeleton },
});
