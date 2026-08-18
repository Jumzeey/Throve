import { DepartmentChips } from '@/components/ui/department-chips';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { Palette } from '@/constants/theme';
import { useListings } from '@/context/listings-context';
import { filterListings } from '@/data/filter-listings';
import { DEPARTMENTS } from '@/data/seed';
import { useLive } from '@/context/live-context';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEPARTMENT_CHIPS = [{ label: 'All', value: '' }, ...DEPARTMENTS.map((department) => ({ label: department, value: department }))];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { listings: catalog } = useListings();
  const listings = filterListings(catalog).slice(0, 8);
  const { liveNow, upcoming } = useLive();
  const homeSessions = [...liveNow, ...upcoming];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Throve</Text>
        <Pressable onPress={() => router.push('/search')} hitSlop={12}>
          <Text style={styles.search}>🔍</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {homeSessions.length > 0 ? (
          <View style={styles.liveBlock}>
            <View style={styles.liveHeader}>
              <Text style={styles.section}>Live Now & Upcoming</Text>
              <Pressable onPress={() => router.push('/(tabs)/live')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
              {homeSessions.map((session) => (
                <Pressable
                  key={session.id}
                  onPress={() =>
                    session.status === 'live' ? router.push(`/live/${session.id}`) : router.push('/(tabs)/live')
                  }
                  style={styles.liveCard}>
                  <View style={styles.liveImageWrap}>
                    <PlaceholderImage style={styles.liveImage} />
                    <View style={[styles.badge, session.status === 'live' ? styles.liveBadge : styles.upcomingBadge]}>
                      <Text style={[styles.badgeText, session.status === 'live' ? styles.liveBadgeText : styles.upcomingBadgeText]}>
                        {session.status === 'live' ? 'LIVE' : 'UPCOMING'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.liveTitle}>{session.title}</Text>
                  <Text style={styles.liveHost}>@{session.host}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Text style={[styles.section, styles.browseLabel]}>Browse</Text>
        <View style={styles.chips}>
          <DepartmentChips
            chips={DEPARTMENT_CHIPS}
            selected="__none__"
            onSelect={(value) =>
              router.push({ pathname: '/category-browse', params: { department: value } })
            }
          />
        </View>

        {listings.length === 0 ? (
          <Text style={styles.empty}>No new listings.</Text>
        ) : (
          <View style={styles.grid}>
            <ListingGrid
              listings={listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/product/${listing.id}`)}
                />
              ))}
            />
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
  },
  search: {
    fontSize: 18,
    color: Palette.text,
  },
  content: {
    paddingBottom: 24,
  },
  liveBlock: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.muted2,
  },
  liveRow: {
    gap: 12,
    paddingBottom: 4,
  },
  liveCard: {
    width: 140,
  },
  liveImageWrap: {
    width: 140,
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
  },
  liveImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  liveBadge: {
    backgroundColor: Palette.live,
  },
  upcomingBadge: {
    backgroundColor: Palette.chipBg,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveBadgeText: {
    color: Palette.background,
  },
  upcomingBadgeText: {
    color: Palette.muted,
  },
  liveTitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.text,
  },
  liveHost: {
    fontSize: 11,
    color: Palette.muted2,
  },
  browseLabel: {
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 8,
  },
  chips: {
    paddingLeft: 20,
    paddingBottom: 12,
  },
  grid: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 40,
    textAlign: 'center',
    fontSize: 13,
    color: Palette.muted3,
  },
});
