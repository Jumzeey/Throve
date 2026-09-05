import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ListingGridSkeleton } from '@/components/ui/loading-skeleton';
import { FiltersSheet, SortSheet } from '@/components/ui/filters-sheet';
import {
  ChevronBackIcon,
  CloseIcon,
  FilterSlidersIcon,
  SearchIcon,
  SortArrowsIcon,
  StarIcon,
} from '@/components/ui/icons';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  appliedFilterCount,
  DEFAULT_FILTERS,
  hasSearchCriteria,
  priceFilterLabel,
} from '@/data/filter-listings';
import type { Listing, ListingFilters } from '@/data/types';
import { searchCatalog, type SearchBrand, type SearchSeller } from '@/lib/catalog-search';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function sellerCity(location: string) {
  return location.split(',')[0]?.trim() || location;
}

export default function SearchScreen() {
  const router = useRouter();
  const { top } = useScreenInsets();
  const { session } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [results, setResults] = useState<Listing[]>([]);
  const [sellers, setSellers] = useState<SearchSeller[]>([]);
  const [brands, setBrands] = useState<SearchBrand[]>([]);

  const searched = hasSearchCriteria(query, filters);
  const filterCount = appliedFilterCount(filters);

  useEffect(() => {
    if (!searched) {
      setResults([]);
      setSellers([]);
      setBrands([]);
      setSearching(false);
      setSearchError(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      void searchCatalog(query, filters, controller.signal)
        .then((data) => {
          setResults(data.items);
          setSellers(data.sellers);
          setBrands(data.brands);
          setSearchError(false);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setSearchError(true);
          setResults([]);
          setSellers([]);
          setBrands([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, query, searched]);

  const appliedChips = useMemo(() => {
    const chips: { key: 'department' | 'category' | 'brand' | 'size' | 'condition' | 'price'; label: string }[] = [];
    if (filters.department) chips.push({ key: 'department', label: filters.department });
    if (filters.category) chips.push({ key: 'category', label: filters.category });
    if (filters.brand) chips.push({ key: 'brand', label: filters.brand });
    if (filters.size) chips.push({ key: 'size', label: filters.size });
    if (filters.condition) chips.push({ key: 'condition', label: filters.condition });
    const price = priceFilterLabel(filters.priceMin, filters.priceMax);
    if (price) chips.push({ key: 'price', label: price });
    return chips;
  }, [filters]);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  function clearQuery() {
    setQuery('');
  }

  function clearAll() {
    setQuery('');
    setFilters(DEFAULT_FILTERS);
  }

  function clearFilter(key: 'department' | 'category' | 'brand' | 'size' | 'condition' | 'price') {
    setFilters((current) => ({
      ...current,
      ...(key === 'price' ? { priceMin: '', priceMax: '' } : { [key]: '' }),
      ...(key === 'department' ? { category: '' } : null),
    }));
  }

  function applyBrand(brand: string) {
    setFilters((current) => ({
      ...current,
      brand: current.brand === brand ? '' : brand,
    }));
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(top, 14) }]}>
        <Pressable onPress={goBack} hitSlop={12} style={styles.back}>
          <ChevronBackIcon />
        </Pressable>
        <View style={styles.searchField}>
          <SearchIcon size={17} color={Palette.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search items, brands, sellers…"
            placeholderTextColor={Palette.disabled}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Pressable onPress={clearQuery} hitSlop={8} style={styles.clearBtn}>
              <CloseIcon size={15} color={Palette.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => setFiltersOpen(true)}
          style={[styles.chip, filterCount > 0 ? styles.chipFilled : styles.chipOutline]}>
          <FilterSlidersIcon color={filterCount > 0 ? Palette.ivory : Palette.body} />
          <Text style={[styles.chipLabel, filterCount > 0 ? styles.chipLabelFilled : styles.chipLabelOutline]}>
            {filterCount > 0 ? `Filters · ${filterCount}` : 'Filters'}
          </Text>
        </Pressable>
        <Pressable onPress={() => setSortOpen(true)} style={[styles.chip, styles.chipOutline]}>
          <SortArrowsIcon />
          <Text style={[styles.chipLabel, styles.chipLabelOutline]}>{filters.sort}</Text>
        </Pressable>
        {appliedChips.map((chip) => (
          <Pressable
            key={chip.key}
            onPress={() => clearFilter(chip.key)}
            style={[styles.chip, styles.chipOutline]}>
            <Text style={[styles.chipLabel, styles.chipLabelOutline]}>{chip.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!isConnected ? (
        <View style={styles.offline}>
          <OfflineBanner message="Reconnect to search." />
        </View>
      ) : null}

      <ScrollView style={styles.results} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!searched ? (
          <EmptyState
            title="What are you looking for?"
            message="Search items, brands or sellers. Filters and sorting narrow your results."
          />
        ) : searching ? (
          <ListingGridSkeleton count={4} />
        ) : searchError ? (
          <AlertBanner variant="error" title="Search didn't complete" message="Please try again in a moment." />
        ) : results.length === 0 && sellers.length === 0 && brands.length === 0 ? (
          <EmptyState
            title="No matches"
            message={
              query.trim()
                ? `Nothing available for “${query.trim()}” with these filters.`
                : 'Try different keywords or adjust your filters.'
            }
            actionLabel="Clear filters"
            onAction={clearAll}
          />
        ) : (
          <>
            {sellers.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.kicker}>Sellers</Text>
                <View style={styles.sellerList}>
                  {sellers.map((seller) => {
                    const city = sellerCity(seller.location);
                    return (
                      <Pressable
                        key={seller.username}
                        onPress={() =>
                          router.push({ pathname: '/seller/[username]', params: { username: seller.username } })
                        }
                        style={styles.sellerRow}>
                        <ProfileAvatar uri={seller.photoUri} username={seller.username} style={styles.sellerAvatar} />
                        <View style={styles.sellerCopy}>
                          <Text style={styles.sellerName} numberOfLines={1}>
                            {seller.username}
                          </Text>
                          <View style={styles.sellerMetaRow}>
                            {seller.count > 0 ? (
                              <>
                                <StarIcon size={10} />
                                <Text style={styles.sellerMeta} numberOfLines={1}>
                                  {seller.avg.toFixed(1)} · {seller.count} reviews{city ? ` · ${city}` : ''}
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.sellerMeta} numberOfLines={1}>
                                {city || 'New seller'}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.viewBtn}>
                          <Text style={styles.viewBtnLabel}>View</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {brands.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.kicker}>Brands</Text>
                <View style={styles.brandWrap}>
                  {brands.map((brand) => {
                    const active = filters.brand === brand.name;
                    return (
                      <Pressable
                        key={brand.name}
                        onPress={() => applyBrand(brand.name)}
                        style={[styles.brandChip, active && styles.brandChipActive]}>
                        <Text style={[styles.brandChipLabel, active && styles.brandChipLabelActive]}>
                          {brand.name} · {brand.count} {brand.count === 1 ? 'item' : 'items'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {results.length > 0 ? (
              <>
                <View style={styles.itemsHeader}>
                  <Text style={styles.itemsTitle}>Items</Text>
                  <Text style={styles.itemsCount}>{results.length} available</Text>
                </View>
                <ListingGrid
                  listings={results.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      meta="condition"
                      onPress={() => router.push(`/product/${listing.id}`)}
                    />
                  ))}
                />
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <FiltersSheet
        visible={filtersOpen}
        value={filters}
        showDepartment
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
      />
      <SortSheet
        visible={sortOpen}
        value={filters.sort}
        onClose={() => setSortOpen(false)}
        onSelect={(sort) => setFilters((current) => ({ ...current, sort }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  back: { paddingVertical: 4 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 15,
    backgroundColor: Palette.sand,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 23,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: { flexGrow: 0 },
  chipRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
    alignItems: 'center',
  },
  results: { flex: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  chipFilled: {
    backgroundColor: Palette.plum,
  },
  chipOutline: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
  },
  chipLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
  },
  chipLabelFilled: { color: Palette.ivory },
  chipLabelOutline: { color: Palette.body },
  offline: { marginHorizontal: 20, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  section: { marginBottom: 18 },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    marginBottom: 10,
  },
  sellerList: { gap: 10 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    backgroundColor: Palette.border,
  },
  sellerCopy: { flex: 1, minWidth: 0 },
  sellerName: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  sellerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sellerMeta: {
    flex: 1,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  viewBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.plum,
  },
  viewBtnLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  brandWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  brandChipActive: {
    backgroundColor: Palette.plum,
    borderColor: Palette.plum,
  },
  brandChipLabel: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  brandChipLabelActive: {
    color: Palette.ivory,
    fontFamily: Typography.bodySemiBold,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 12,
  },
  itemsTitle: {
    fontFamily: Typography.display,
    fontSize: 21,
    color: Palette.espresso,
  },
  itemsCount: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    fontVariant: ['tabular-nums'],
    color: Palette.muted,
  },
});
