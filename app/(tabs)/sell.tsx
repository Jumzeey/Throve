import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { listingStatusStyle } from '@/components/ui/simulated-stage';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import type { Listing } from '@/data/types';
import { formatNaira } from '@/lib/format';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { session } = useAuth();
  const { listingsForSeller, resetForm, loadFormFromListing } = useListings();
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
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My listings</Text>
        <Pressable onPress={openNew} style={styles.newBtn}>
          <Text style={styles.newLabel}>+ New listing</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
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
        {visible.length === 0 ? (
          <Text style={styles.empty}>Nothing here yet.</Text>
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
  const status = listingStatusStyle(listing.status);
  return (
    <Pressable onPress={onPress} style={styles.cell}>
      <View style={styles.imageWrap}>
        <PlaceholderImage style={styles.image} />
        <View style={[styles.badge, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
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
    backgroundColor: Palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
  },
  newBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: Palette.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.background,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  goLive: {
    height: 44,
    borderWidth: 1,
    borderColor: Palette.live,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
    marginBottom: 14,
  },
  goLiveLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.live,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.text,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.muted3,
  },
  tabLabelOn: {
    fontWeight: '700',
    color: Palette.text,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 40,
    fontSize: 13,
    color: Palette.muted3,
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
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: Palette.text,
  },
  cardPrice: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
});
