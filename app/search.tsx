import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getAvailableListings } from '@/data/seed';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return getAvailableListings().filter((listing) => {
      return (
        listing.title.toLowerCase().includes(q) ||
        listing.brand.toLowerCase().includes(q) ||
        listing.seller.toLowerCase().includes(q) ||
        listing.category.toLowerCase().includes(q) ||
        listing.department.toLowerCase().includes(q)
      );
    });
  }, [query]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const searched = query.trim().length > 0;

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
