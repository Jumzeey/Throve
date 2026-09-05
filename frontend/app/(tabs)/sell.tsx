import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PlusIcon } from '@/components/ui/icons';
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

const FILTERS = ['all', 'draft', 'available', 'reserved', 'sold', 'hidden'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  draft: 'Draft',
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  hidden: 'Hidden',
};

function isFilter(value?: string): value is Filter {
  return FILTERS.includes(value as Filter);
}

function matchesFilter(listing: Listing, filter: Filter) {
  if (filter === 'all') return true;
  return listing.status === filter;
}

export default function SellScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { session } = useAuth();
  const { listingsForSeller, resetForm, loadFormFromListing, loading, refresh } = useListings();
  const { isConnected } = useNetworkStatus();
  const initial = params.tab === 'available' || !params.tab ? 'all' : isFilter(params.tab) ? params.tab : 'all';
  const [filter, setFilter] = useState<Filter>(initial);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFilter(params.tab)) setFilter(params.tab === 'available' ? 'all' : params.tab);
  }, [params.tab]);

  const mine = useMemo(() => {
    if (!session) return [];
    return listingsForSeller(session.username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [listingsForSeller, session]);

  const counts = useMemo(() => {
    const next = { all: mine.length, draft: 0, available: 0, reserved: 0, sold: 0, hidden: 0 };
    for (const listing of mine) {
      if (listing.status in next) next[listing.status as Exclude<Filter, 'all'>] += 1;
    }
    return next;
  }, [mine]);

  const visible = mine.filter((listing) => matchesFilter(listing, filter));

  const reload = useCallback(async () => {
    setRefreshing(true);
    setLoadError(false);
    const ok = await refresh();
    if (!ok) setLoadError(true);
    setRefreshing(false);
  }, [refresh]);

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

  const emptyTitle = filter === 'all' ? 'Nothing listed yet' : `No ${FILTER_LABEL[filter].toLowerCase()} listings`;
  const emptyMessage =
    filter === 'all'
      ? 'List your first piece to start selling on Throve.'
      : filter === 'draft'
        ? 'Drafts you save while creating a listing will appear here.'
        : `You don't have any ${FILTER_LABEL[filter].toLowerCase()} listings right now.`;

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>My listings</Text>
          <Text style={styles.subtitle}>
            {counts.all} listing{counts.all === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable onPress={openNew} style={styles.newBtn} accessibilityRole="button" accessibilityLabel="New listing">
          <PlusIcon size={16} color={Palette.ivory} />
          <Text style={styles.newLabel}>New</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersScroll}>
        {FILTERS.map((item) => {
          const active = filter === item;
          const count = counts[item];
          const label = item === 'all' ? 'All' : `${FILTER_LABEL[item]} · ${count}`;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, active ? styles.filterChipOn : styles.filterChipOff]}>
              <Text style={[styles.filterLabel, active ? styles.filterLabelOn : styles.filterLabelOff]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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

        {loading && mine.length === 0 ? (
          <MyListingsSkeleton />
        ) : visible.length === 0 && !loadError ? (
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            actionLabel={filter === 'all' || filter === 'draft' ? 'Create listing' : undefined}
            onAction={filter === 'all' || filter === 'draft' ? openNew : undefined}
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
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  title: {
    fontSize: 28,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Palette.plum,
  },
  newLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  filtersScroll: { flexGrow: 0 },
  filters: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  filterChipOn: { backgroundColor: Palette.plum },
  filterChipOff: {
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterLabel: { fontSize: 12.5, fontFamily: Typography.bodySemiBold },
  filterLabelOn: { color: Palette.ivory },
  filterLabelOff: { color: Palette.espresso },
  body: { paddingHorizontal: Spacing.xl, paddingTop: 4 },
  banner: { marginBottom: Spacing.md },
  retry: { marginTop: 10 },
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
