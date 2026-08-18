import { FiltersButton } from '@/components/ui/filters-button';
import { FiltersSheet } from '@/components/ui/filters-sheet';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
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
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const searched = hasSearchCriteria(query, filters);
  const results = useMemo(() => {
    if (!searched) return [];
    return filterListings(undefined, {
      query,
      department: filters.department,
      category: filters.category,
      brand: filters.brand,
      condition: filters.condition,
      price: filters.price,
      sort: filters.sort,
    });
  }, [filters, query, searched]);

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
        {searched && results.length === 0 ? (
          <Text style={styles.empty}>No results found.</Text>
        ) : (
          <ListingGrid
            listings={results.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() => router.push(`/product/${listing.id}`)}
              />
            ))}
          />
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
});
