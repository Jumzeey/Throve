import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListingGridSkeleton } from '@/components/ui/loading-skeleton';
import { OfflineBanner } from '@/components/ui/alert-banner';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { getListingImage } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import type { Listing } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatNaira } from '@/lib/format';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScreenInsets } from '@/hooks/use-screen-insets';

const TABS = ['draft', 'available', 'sold', 'hidden'] as const;
type Tab = (typeof TABS)[number];

function matchesTab(listing: Listing, tab: Tab) {
  if (tab === 'available') return listing.status === 'available' || listing.status === 'reserved';
  return listing.status === tab;
}

function isTab(value?: string): value is Tab {
  return TABS.includes(value as Tab);
}

export default function SellScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { session } = useAuth();
  const { listingsForSeller, resetForm, loadFormFromListing, loading } = useListings();
  const { isConnected } = useNetworkStatus();
  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'available');

  useEffect(() => {
    if (isTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  const mine = useMemo(() => {
    if (!session) return [];
    return listingsForSeller(session.username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [listingsForSeller, session]);

  const visible = mine.filter((listing) => matchesTab(listing, tab));

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

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My listings</Text>
        <Button label="+ New listing" onPress={openNew} style={styles.newBtn} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <View style={styles.offline}>
            <OfflineBanner message="Reconnect to publish or update listings." />
          </View>
        ) : null}

        <Pressable onPress={goLive} style={styles.goLive}>
          <Text style={styles.goLiveLabel}>● Go Live</Text>
        </Pressable>
        <View style={styles.tabs}>
          {TABS.map((item) => {
            const active = tab === item;
            return (
              <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, active ? styles.tabOn : null]}>
                <Text style={[styles.tabLabel, active ? styles.tabLabelOn : null]}>
                  {item[0].toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {loading ? (
          <ListingGridSkeleton count={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            message={
              tab === 'draft'
                ? 'Drafts you save while creating a listing will appear here.'
                : `You don't have any ${tab} listings right now.`
            }
            actionLabel={tab === 'draft' ? 'Create listing' : undefined}
            onAction={tab === 'draft' ? openNew : undefined}
            style={styles.empty}
          />
        ) : (
          <View style={styles.grid}>
            {chunk(visible, 2).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((listing) => (
                  <ListingThumb key={listing.id} listing={listing} onPress={() => openListing(listing)} />
                ))}
                {row.length === 1 ? <View style={styles.cell} /> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ListingThumb({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const chipVariant: ListingChipVariant =
    listing.status === 'reserved' ? 'reserved' : (listing.status as ListingChipVariant);

  return (
    <Pressable onPress={onPress} style={styles.cell}>
      <View style={styles.imageWrap}>
        <AppImage source={getListingImage(listing.id)} style={styles.image} />
        <View style={styles.badge}>
          <StatusChip kind="listing" variant={chipVariant} />
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {listing.title}
      </Text>
      <Text style={styles.cardPrice}>{formatNaira(listing.price)}</Text>
    </Pressable>
  );
}

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
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
  offline: {
    marginBottom: Spacing.md,
  },
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    marginBottom: Spacing.lg,
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
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  tabLabelOn: {
    color: Palette.plum,
  },
  empty: {
    marginTop: Spacing.xl,
  },
  grid: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  cell: {
    flex: 1,
  },
  imageWrap: {
    position: 'relative',
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.sand,
  },
  image: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: Radius.sm,
  },
  badge: {
    position: 'absolute',
    top: 9,
    left: 9,
  },
  cardTitle: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  cardPrice: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
});
