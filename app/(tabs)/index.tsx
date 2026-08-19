import { AppImage } from '@/components/ui/app-image';
import { DepartmentChips } from '@/components/ui/department-chips';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { Palette, Radius, Typography } from '@/constants/theme';
import { getLiveImage } from '@/data/images';
import { useListings } from '@/context/listings-context';
import { filterListings } from '@/data/filter-listings';
import { DEPARTMENTS } from '@/data/seed';
import { useLive } from '@/context/live-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEPARTMENT_CHIPS = DEPARTMENTS.map((d) => ({ label: d, value: d }));

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { listings: catalog } = useListings();
  const listings = filterListings(catalog).slice(0, 8);
  const { liveNow, upcoming } = useLive();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Throve</Text>
        <Pressable onPress={() => router.push('/search')} hitSlop={12}>
          <Ionicons name="search-outline" size={20} color={Palette.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {liveNow.length > 0 ? (
          <View style={styles.liveBlock}>
            <View style={styles.liveHeader}>
              <View style={styles.liveDotRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveNowLabel}>LIVE NOW</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/live')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
              {liveNow.map((session) => (
                <Pressable
                  key={session.id}
                  onPress={() => router.push(`/live/${session.id}`)}
                  style={styles.liveCard}>
                  <View style={styles.liveImageWrap}>
                    <AppImage source={getLiveImage(session.id)} style={styles.liveImage} />
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>LIVE · {session.viewers}</Text>
                    </View>
                  </View>
                  <Text style={styles.liveHost}>@{session.host}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {upcoming.length > 0 ? (
          <View style={styles.liveBlock}>
            <Text style={styles.sectionLabel}>UPCOMING</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
              {upcoming.map((session) => (
                <Pressable
                  key={session.id}
                  onPress={() => router.push('/(tabs)/live')}
                  style={styles.liveCard}>
                  <View style={styles.liveImageWrap}>
                    <AppImage source={getLiveImage(session.id)} style={styles.liveImage} />
                    <View style={styles.upcomingBadge}>
                      <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
                    </View>
                  </View>
                  <Text style={styles.liveHost}>@{session.host}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.chipSection}>
          <DepartmentChips
            chips={DEPARTMENT_CHIPS}
            selected="__none__"
            onSelect={(value) => router.push({ pathname: '/category-browse', params: { department: value } })}
          />
        </View>

        <Text style={styles.sectionLabel}>NEW LISTINGS</Text>

        {listings.length === 0 ? (
          <Text style={styles.empty}>No new listings.</Text>
        ) : (
          <View style={styles.grid}>
            <ListingGrid
              listings={listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} onPress={() => router.push(`/product/${listing.id}`)} />
              ))}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  brand: {
    fontSize: 24,
    fontFamily: Typography.headingBold,
    color: Palette.text,
  },
  content: { paddingBottom: 24 },
  liveBlock: { paddingHorizontal: 20, paddingBottom: 12 },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.live,
  },
  liveNowLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.live,
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.accent700,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  liveRow: { gap: 12, paddingBottom: 4 },
  liveCard: { width: 150 },
  liveImageWrap: {
    width: 150,
    height: 150,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  liveImage: { width: '100%', height: '100%' },
  liveBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Palette.live,
    backgroundColor: Palette.background,
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
    color: Palette.live,
  },
  upcomingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: Palette.chipBg,
  },
  upcomingBadgeText: {
    fontSize: 9,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted,
  },
  liveHost: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  chipSection: { paddingLeft: 20, paddingBottom: 16 },
  grid: { paddingHorizontal: 20, paddingTop: 4 },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 40,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
});
