import { FiltersButton } from '@/components/ui/filters-button';
import { FiltersSheet } from '@/components/ui/filters-sheet';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { DEFAULT_FILTERS, filterListings, hasSearchCriteria } from '@/data/filter-listings';
import type { ListingFilters } from '@/data/types';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { listings: catalog } = useListings();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.searchRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <TextField
          placeholder="Search products, brands, sellers"
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.searchField}
        />
      </View>
      <View style={styles.countRow}>
        <Text style={styles.count}>{searched ? `${results.length} results` : 'Search to see results'}</Text>
        <FiltersButton onPress={() => setSheetOpen(true)} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {searched && results.length === 0 && sellers.length === 0 ? (
          <Text style={styles.empty}>No results found.</Text>
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
                    <View style={styles.sellerAvatarWrap}>
                      <PlaceholderImage style={styles.sellerAvatar} />
                    </View>
                    <Text style={styles.sellerName}>@{name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <ListingGrid
              listings={results.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/product/${listing.id}`)}
                />
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
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  back: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 16,
    color: Palette.text,
  },
  searchField: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  count: {
    fontSize: 12,
    color: Palette.muted2,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 50,
    fontSize: 13,
    color: Palette.muted3,
  },
  sellers: {
    marginBottom: 12,
  },
  sellersLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  sellerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  sellerAvatar: {
    width: 36,
    height: 36,
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
});
