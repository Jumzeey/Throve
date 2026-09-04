import { EmptyState } from '@/components/ui/empty-state';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { OfflineBanner } from '@/components/ui/alert-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip, type OfferChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useInbox } from '@/context/inbox-context';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import type { Offer } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatNaira, formatRelativeTime } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function OffersCentreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { offersFor, loading, refresh } = useInbox();
  const { getListing } = useListings();
  const { isConnected } = useNetworkStatus();
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  const pullTask = useCallback(async () => {
    await refresh();
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const { received, sent } = offersFor(session.username);
  const list = tab === 'received' ? received : sent;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Offers centre" onBack={() => router.back()} />
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('received')} style={[styles.tab, tab === 'received' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'received' ? styles.tabLabelOn : null]}>Received</Text>
        </Pressable>
        <Pressable onPress={() => setTab('sent')} style={[styles.tab, tab === 'sent' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'sent' ? styles.tabLabelOn : null]}>Sent</Text>
        </Pressable>
      </View>
      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={styles.body}
      >
        {!isConnected ? (
          <View style={styles.offline}>
            <OfflineBanner message="Reconnect to view and respond to offers." />
          </View>
        ) : null}

        {loading && !refreshing ? (
          <LoadingSkeleton rows={4} />
        ) : list.length === 0 ? (
          <EmptyState
            title={tab === 'received' ? 'No offers yet' : 'No offers sent'}
            message={
              tab === 'received'
                ? 'When buyers make offers on your listings, they will appear here.'
                : 'Offers you send on listings will appear here.'
            }
            style={styles.empty}
          />
        ) : (
          list.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              listingTitle={getListing(offer.listingId)?.title ?? 'Listing'}
              counterpart={tab === 'received' ? (offer.initiator === 'buyer' ? offer.buyer : offer.seller) : offer.initiator === 'buyer' ? offer.seller : offer.buyer}
              prefix={tab === 'received' ? 'from' : 'to'}
              onPress={() => router.push(`/inbox/offer/${offer.id}`)}
            />
          ))
        )}
      </LiquidRefreshScrollView>
    </View>
  );
}

function OfferCard({
  offer,
  listingTitle,
  counterpart,
  prefix,
  onPress,
}: {
  offer: Offer;
  listingTitle: string;
  counterpart: string;
  prefix: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{listingTitle}</Text>
        <StatusChip kind="offer" variant={offer.status as OfferChipVariant} />
      </View>
      <Text style={styles.cardMeta}>
        {prefix} @{counterpart} · {formatRelativeTime(offer.createdAt)}
      </Text>
      <Text style={styles.cardAmount}>{formatNaira(offer.amount)}</Text>
    </Pressable>
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
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
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
    paddingBottom: Spacing.xxl,
  },
  offline: {
    marginBottom: Spacing.md,
  },
  empty: {
    marginTop: Spacing.xxxl,
  },
  card: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 12,
    backgroundColor: Palette.ivoryElevated,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  cardAmount: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.plum,
  },
});
