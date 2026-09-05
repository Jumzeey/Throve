import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { getListingImageSource } from '@/data/images';
import type { Listing } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const TABS = ['draft', 'available', 'reserved', 'sold', 'hidden'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  draft: 'Draft',
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  hidden: 'Hidden',
};

function isTab(value?: string): value is Tab {
  return TABS.includes(value as Tab);
}

function matchesTab(listing: Listing, tab: Tab) {
  return listing.status === tab;
}

export default function SellScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { session } = useAuth();
  const { listingsForSeller, resetForm, loadFormFromListing, loading, refresh } = useListings();
  const { isConnected } = useNetworkStatus();
  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'available');
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  const mine = useMemo(() => {
    if (!session) return [];
    return listingsForSeller(session.username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [listingsForSeller, session]);

  const counts = useMemo(() => {
    const next = { draft: 0, available: 0, reserved: 0, sold: 0, hidden: 0 };
    for (const listing of mine) {
      if (listing.status in next) next[listing.status as Tab] += 1;
    }
    return next;
  }, [mine]);

  const visible = mine.filter((listing) => matchesTab(listing, tab));

  const reload = useCallback(async () => {
    setRefreshing(true);
    setLoadError(false);
    const ok = await refresh();
    if (!ok) setLoadError(true);
    setRefreshing(false);
  }, [refresh]);

  function goLive() {
    router.push(session?.canHostLive ? '/live/prepare' : '/live/host-access');
  }

  function openNew() {
    resetForm();
    router.push('/sell/create');
  }

  function openListing(listing: Listing) {
    if (listing.status === 'draft') {
      loadFormFromListing(listing);
      router.push({ pathname: '/sell/create', params: { id: listing.id } });
      return;
    }
    router.push(`/sell/${listing.id}`);
  }

  const emptyMessage =
    tab === 'draft'
      ? 'Drafts you save while creating a listing will appear here.'
      : `You don't have any ${TAB_LABEL[tab].toLowerCase()} listings right now.`;

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My listings</Text>
        <Button label="+ New listing" onPress={openNew} style={styles.newBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]}
        showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <View style={styles.banner}>
            <OfflineBanner title="No connection" message="Reconnect to see your listings." />
          </View>
        ) : null}
        {loadError ? (
          <View style={styles.banner}>
            <AlertBanner
              variant="error"
              title="We couldn't load your listings"
              message="Please try again in a moment."
            />
            <Button label="Try again" variant="secondary" loading={refreshing} onPress={() => void reload()} style={styles.retry} />
          </View>
        ) : null}

        <Pressable onPress={goLive} style={styles.goLive} accessibilityRole="button" accessibilityLabel="Go Live">
          <Text style={styles.goLiveLabel}>● Go Live</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          style={styles.tabsScroll}>
          {TABS.map((item) => {
            const active = tab === item;
            return (
              <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, active ? styles.tabOn : null]}>
                <Text style={[styles.tabLabel, active ? styles.tabLabelOn : null]}>
                  {TAB_LABEL[item]} ({counts[item]})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading && mine.length === 0 ? (
          <MyListingsSkeleton />
        ) : visible.length === 0 && !loadError ? (
          <EmptyState
            title="Nothing here yet"
            message={emptyMessage}
            actionLabel={tab === 'draft' ? 'Create listing' : undefined}
            onAction={tab === 'draft' ? openNew : undefined}
            style={styles.empty}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((listing) => (
              <ListingRow key={listing.id} listing={listing} onPress={() => openListing(listing)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ListingRow({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const draft = listing.status === 'draft';
  const chipVariant: ListingChipVariant =
    listing.status === 'reserved' ? 'reserved' : (listing.status as ListingChipVariant);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <AppImage source={getListingImageSource(listing)} style={styles.thumb} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {listing.title === 'Untitled draft' ? 'Untitled draft' : listing.title}
        </Text>
        <Text style={styles.rowPrice}>{listing.price > 0 ? formatNaira(listing.price) : '—'}</Text>
        <StatusChip kind="listing" variant={chipVariant} />
      </View>
      <Pressable onPress={onPress} style={styles.manageBtn} hitSlop={6}>
        <Text style={styles.manageLabel}>{draft ? 'Continue' : 'Manage'}</Text>
      </Pressable>
    </Pressable>
  );
}

function MyListingsSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '72%' }]} />
            <View style={[styles.skeletonLine, { width: '40%', marginTop: 10 }]} />
            <View style={[styles.skeletonChip, { marginTop: 10 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.3,
  },
  newBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  banner: { marginBottom: Spacing.md },
  retry: { marginTop: 10 },
  goLive: {
    height: 46,
    borderWidth: 1,
    borderColor: Palette.liveRed,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivoryElevated,
    marginBottom: Spacing.lg,
  },
  goLiveLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.liveRed,
  },
  tabsScroll: {
    flexGrow: 0,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  tabs: {
    flexDirection: 'row',
    minWidth: '100%',
  },
  tab: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.plum,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  tabLabelOn: {
    color: Palette.plum,
  },
  empty: { marginTop: Spacing.md },
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 5 },
  rowTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  rowPrice: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  manageBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  skeletonList: { gap: 14 },
  skeletonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  skeletonThumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Palette.skeleton,
  },
  skeletonCopy: { flex: 1 },
  skeletonLine: { height: 11, borderRadius: 5, backgroundColor: Palette.skeleton },
  skeletonChip: { width: 72, height: 22, borderRadius: 4, backgroundColor: Palette.skeleton },
});
