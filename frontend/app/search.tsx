import { OfflineBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ListingGridSkeleton } from '@/components/ui/loading-skeleton';
import { AppImage } from '@/components/ui/app-image';
import { FiltersButton } from '@/components/ui/filters-button';
import { FiltersSheet } from '@/components/ui/filters-sheet';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { DEFAULT_FILTERS, filterListings, hasSearchCriteria } from '@/data/filter-listings';
import { getSellerAvatar } from '@/data/images';
import type { ListingFilters } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SearchScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { listings: catalog } = useListings();
  const { isConnected } = useNetworkStatus();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const searched = hasSearchCriteria(query, filters);
  const results = useMemo(() => {
    if (!searched) return [];
    return filterListings(catalog, {
      query,
      department: filters.department,
      category: filters.category,
      brand: filters.brand,
      condition: filters.condition,
      price: filters.price,
      sort: filters.sort,
    });
  }, [catalog, filters, query, searched]);

  const sellers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Array.from(new Set(catalog.map((item) => item.seller))).filter((name) => name.toLowerCase().includes(q));
  }, [catalog, query]);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Search"
        large
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        right={<FiltersButton onPress={() => setSheetOpen(true)} />}
      />
      <View style={styles.searchWrap}>
        <TextField
          placeholder="Search items, brands, sellers…"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (t.trim()) {
              setSearching(true);
              setTimeout(() => setSearching(false), 400);
            }
          }}
          autoFocus
          autoCapitalize="none"
          returnKeyType="search"
          containerStyle={styles.searchField}
        />
      </View>
      {!isConnected ? (
        <View style={styles.offline}>
          <OfflineBanner message="Reconnect to search." />
        </View>
      ) : null}
      {searched ? (
        <View style={styles.countRow}>
          <Text style={styles.sectionTitle}>Results</Text>
          <Text style={styles.count}>{results.length} items</Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!searched ? (
          <EmptyState title="What are you looking for?" message="Search by item, brand, or seller name." />
        ) : searching ? (
          <ListingGridSkeleton count={4} />
        ) : results.length === 0 && sellers.length === 0 ? (
          <EmptyState title="No matches" message="Try different keywords or adjust your filters." />
        ) : (
          <>
            {sellers.length > 0 ? (
              <View style={styles.sellers}>
                <Text style={styles.sellersLabel}>Sellers</Text>
                {sellers.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => router.push({ pathname: '/seller/[username]', params: { username: name } })}
                    style={styles.sellerRow}>
                    <AppImage source={getSellerAvatar(name)} style={styles.sellerAvatar} />
                    <Text style={styles.sellerName}>@{name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <ListingGrid
              listings={results.map((listing) => (
                <ListingCard key={listing.id} listing={listing} meta="condition" onPress={() => router.push(`/product/${listing.id}`)} />
              ))}
            />
          </>
        )}
      </ScrollView>
      <FiltersSheet
        visible={sheetOpen}
        value={filters}
        showDepartment
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchField: {
    width: '100%',
  },
  offline: { marginHorizontal: 20, marginBottom: 8 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: Typography.display,
    fontSize: 21,
    color: Palette.espresso,
  },
  count: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  sellers: { marginBottom: 20 },
  sellersLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    marginBottom: 10,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  sellerAvatar: { width: 36, height: 36, borderRadius: 18 },
  sellerName: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
});
