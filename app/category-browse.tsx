import { DepartmentChips } from '@/components/ui/department-chips';
import { FiltersButton } from '@/components/ui/filters-button';
import { FiltersSheet } from '@/components/ui/filters-sheet';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DEFAULT_FILTERS, filterListings } from '@/data/filter-listings';
import { DEPARTMENTS, getCategoriesForDepartment } from '@/data/seed';
import type { ListingFilters } from '@/data/types';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const DEPARTMENT_CHIPS = [{ label: 'All', value: '' }, ...DEPARTMENTS.map((department) => ({ label: department, value: department }))];

export default function CategoryBrowseScreen() {
  const router = useRouter();
  const { session } = useAuth();
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
    return filterListings(undefined, {
      department,
      category,
      brand: filters.brand,
      condition: filters.condition,
      price: filters.price,
      sort: filters.sort,
    });
  }, [category, department, filters]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Category Browse" onBack={() => router.back()} />
      <View style={styles.chips}>
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
          <DepartmentChips chips={categoryChips} selected={category} onSelect={setCategory} />
        </View>
      ) : null}
      <View style={styles.countRow}>
        <Text style={styles.count}>{listings.length} items</Text>
        <FiltersButton onPress={() => setSheetOpen(true)} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {listings.length === 0 ? (
          <Text style={styles.empty}>No items in this category yet.</Text>
        ) : (
          <ListingGrid
            listings={listings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                meta="condition"
                onPress={() => router.push(`/product/${item.id}`)}
              />
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
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  chips: {
    paddingLeft: 20,
    paddingBottom: 8,
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
