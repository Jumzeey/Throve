import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { EmptyState } from '@/components/ui/empty-state';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip, type OfferChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getListingImageSource } from '@/data/images';
import type { Offer } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { effectiveOfferStatus, offerChipVariant, offerFooter } from '@/lib/offer-display';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Tab = 'received' | 'sent';

export default function OffersCentreScreen() {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const { offersFor, loading, refresh } = useInbox();
  const { getListing } = useListings();
  const { isConnected } = useNetworkStatus();
  const [tab, setTab] = useState<Tab>('received');
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const pullTask = useCallback(async () => {
    setLoadError(false);
    try {
      await refresh();
    } catch {
      setLoadError(true);
    }
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      void refresh({ silent: true }).catch(() => setLoadError(true));
    }, [refresh, session]),
  );

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const me = session.username;
  const { received, sent } = offersFor(me);
  const list = (tab === 'received' ? received : sent).slice().sort((a, b) => b.createdAt - a.createdAt);
  const isLoading = loading && !refreshing && received.length + sent.length === 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Offers"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/inbox'))}
        large
      />

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('received')} style={[styles.tab, tab === 'received' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'received' ? styles.tabLabelOn : null]}>
            Received · {received.length}
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab('sent')} style={[styles.tab, tab === 'sent' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'sent' ? styles.tabLabelOn : null]}>Sent · {sent.length}</Text>
        </Pressable>
      </View>

      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={[styles.body, { paddingBottom: sheetBottom + 24 }]}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to see current offer status." />
        ) : null}
        {loadError ? (
          <AlertBanner
            variant="error"
            title="We couldn't load your offers"
            message="Please try again in a moment."
          />
        ) : null}

        {isLoading ? (
          <OffersSkeleton />
        ) : list.length === 0 && !loadError ? (
          <EmptyState
            title="No offers yet"
            message="Offers you send or receive will show here."
            style={styles.empty}
          />
        ) : (
          list.map((offer) => {
            const listing = getListing(offer.listingId);
            const status = effectiveOfferStatus(offer);
            const isBuyer = offer.buyer === me;
            const chip = offerChipVariant(offer, isBuyer, status);
            const counterpart =
              tab === 'received'
                ? offer.initiator === 'buyer'
                  ? offer.buyer
                  : offer.seller
                : offer.buyer === me
                  ? offer.seller
                  : offer.buyer;
            const direction = tab === 'received' ? `From ${counterpart}` : `To ${counterpart}`;
            const footer = offerFooter(offer, status, now);

            return (
              <OfferRow
                key={offer.id}
                offer={offer}
                title={listing?.title ?? 'Listing'}
                listPrice={listing?.price}
                direction={direction}
                chip={chip}
                footer={footer}
                thumb={listing ? getListingImageSource(listing) : null}
                onPress={() => router.push(`/inbox/offer/${offer.id}`)}
              />
            );
          })
        )}
      </LiquidRefreshScrollView>
    </View>
  );
}

function OfferRow({
  offer,
  title,
  listPrice,
  direction,
  chip,
  footer,
  thumb,
  onPress,
}: {
  offer: Offer;
  title: string;
  listPrice?: number;
  direction: string;
  chip: OfferChipVariant;
  footer: ReturnType<typeof offerFooter>;
  thumb: ReturnType<typeof getListingImageSource>;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <AppImage source={thumb} style={styles.thumb} />
      <View style={styles.copy}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <StatusChip kind="offer" variant={chip} />
        </View>
        <Text style={styles.direction}>{direction}</Text>
        <Text style={styles.priceLine}>
          <Text style={styles.offerAmount}>{formatNaira(offer.amount)}</Text>
          {listPrice != null ? <Text style={styles.listPrice}>{`  ${formatNaira(listPrice)}`}</Text> : null}
        </Text>
        {footer ? (
          <Text style={[styles.footer, footer.warning ? styles.footerWarning : null]}>{footer.text}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function OffersSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '72%' }]} />
            <View style={[styles.skeletonLine, { width: '48%', marginTop: 10 }]} />
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    marginHorizontal: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.plum,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  tabLabelOn: {
    color: Palette.plum,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: 10,
  },
  empty: {
    marginTop: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  direction: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  priceLine: {
    marginTop: 2,
  },
  offerAmount: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
  },
  listPrice: {
    fontSize: 13,
    fontFamily: Typography.body,
    fontVariant: ['tabular-nums'],
    color: Palette.muted3,
  },
  footer: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  footerWarning: {
    color: Palette.warningText,
  },
  skeletonList: {
    gap: 16,
    paddingTop: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: Palette.skeleton,
  },
  skeletonCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 11,
    borderRadius: 5,
    backgroundColor: Palette.skeleton,
  },
});
