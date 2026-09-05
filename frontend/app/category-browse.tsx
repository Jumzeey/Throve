import { OfflineBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchIcon } from '@/components/ui/icons';
import { ListingGridSkeleton } from '@/components/ui/loading-skeleton';
import { DepartmentChips } from '@/components/ui/department-chips';
import { FiltersButton } from '@/components/ui/filters-button';
import { FiltersSheet } from '@/components/ui/filters-sheet';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { DEFAULT_FILTERS, filterListings } from '@/data/filter-listings';
import { DEPARTMENTS, getCategoriesForDepartment } from '@/data/seed';
import type { ListingFilters } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const DEPARTMENT_CHIPS = [{ label: 'All', value: '' }, ...DEPARTMENTS.map((department) => ({ label: department, value: department }))];

export default function CategoryBrowseScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { listings: catalog } = useListings();
  const { isConnected } = useNetworkStatus();
  const params = useLocalSearchParams<{ department?: string }>();
  const [department, setDepartment] = useState(params.department ?? '');
  const [category, setCategory] = useState('');
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const categoryChips = useMemo(() => {
    const cats = getCategoriesForDepartment(department);
    if (!cats.length) return [];
    return [{ label: 'All', value: '' }, ...cats.map((item) => ({ label: item, value: item }))];
  }, [department]);

  const listings = useMemo(() => {
    return filterListings(catalog, {
      department,
      category,
      brand: filters.brand,
      size: filters.size,
      condition: filters.condition,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sort: filters.sort,
    });
  }, [catalog, category, department, filters]);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  const scopeLabel = department ? (category ? `${department} · ${category}` : department) : 'All';

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Browse"
        large
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        right={
          <Pressable onPress={() => router.push('/search')} style={styles.searchBtn}>
            <SearchIcon />
          </Pressable>
        }
      />
      {!isConnected ? (
        <View style={styles.offline}>
          <OfflineBanner message="Reconnect to see listings." />
        </View>
      ) : null}
      <View style={styles.chips}>
        <Text style={styles.label}>Department</Text>
        <DepartmentChips
          chips={DEPARTMENT_CHIPS}
          selected={department}
          onSelect={(value) => {
            setDepartment(value);
            setCategory('');
          }}
        />
      </View>
      {categoryChips.length > 0 ? (
        <View style={styles.chips}>
          <Text style={styles.label}>Category in {department || 'All'}</Text>
          <DepartmentChips chips={categoryChips} selected={category} onSelect={setCategory} />
        </View>
      ) : null}
      <View style={styles.countRow}>
        <Text style={styles.scope}>{scopeLabel}</Text>
        <Text style={styles.count}>{listings.length} items</Text>
        <FiltersButton onPress={() => setSheetOpen(true)} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {listings.length === 0 ? (
          <EmptyState title="Nothing here yet" message="Try another department or category, or check back later." />
        ) : (
          <ListingGrid
            listings={listings.map((item) => (
              <ListingCard key={item.id} listing={item} meta="condition" onPress={() => router.push(`/product/${item.id}`)} />
            ))}
          />
        )}
      </ScrollView>
      <FiltersSheet
        visible={sheetOpen}
        value={{ ...filters, department, category }}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters({ ...next, department: '', category: '' });
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offline: { marginHorizontal: 20, marginBottom: 8 },
  chips: { paddingLeft: 20, paddingBottom: 12 },
  label: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    marginBottom: 9,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scope: {
    flex: 1,
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
});
