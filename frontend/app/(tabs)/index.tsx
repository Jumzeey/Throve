import { OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { EmptyState } from '@/components/ui/empty-state';
import { BellIcon, ImagePlaceholderIcon, SearchIcon } from '@/components/ui/icons';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { filterListings } from '@/data/filter-listings';
import { getLiveImage, getSellerAvatar } from '@/data/images';
import type { LiveSession } from '@/data/types';
import { DEPARTMENTS } from '@/data/seed';
import { useLive } from '@/context/live-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScreenInsets } from '@/hooks/use-screen-insets';

const DEPARTMENT_IMAGES = {
  Women: require('@/assets/hifi/womens-midi-dress.jpg'),
  Men: require('@/assets/hifi/mens-shirt.jpg'),
  Kids: require('@/assets/hifi/kids-dress.jpg'),
} as const;

function SectionHeading({
  title,
  onSeeAll,
  liveDot,
}: {
  title: string;
  onSeeAll?: () => void;
  liveDot?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {liveDot ? <View style={styles.liveDot} /> : null}
        <Text style={styles.sectionTitleInline}>{title}</Text>
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LiveNowCard({ session, onPress }: { session: LiveSession; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.liveCard}>
      <View style={styles.liveImageWrap}>
        <AppImage source={getLiveImage(session.id)} style={styles.liveImage} />
        <View style={styles.liveBottomGradient} />
        <View style={styles.liveBadges}>
          <View style={styles.liveBadgeRed}>
            <Text style={styles.liveBadgeRedText}>LIVE</Text>
          </View>
          <View style={styles.liveBadgeDark}>
            <Text style={styles.liveBadgeDarkText}>{session.viewers ?? 0} watching</Text>
          </View>
        </View>
        <View style={styles.liveFooter}>
          <Text style={styles.liveCardTitle} numberOfLines={2}>
            {session.title ?? 'Live session'}
          </Text>
          <View style={styles.liveHostRow}>
            <AppImage source={getSellerAvatar(session.host)} style={styles.liveHostAvatar} />
            <Text style={styles.liveHostName} numberOfLines={1}>
              {session.host}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function UpcomingLiveRow({ session, onPress }: { session: LiveSession; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.upcomingRow}>
      <View style={styles.upcomingThumb}>
        <AppImage source={getLiveImage(session.id)} style={styles.upcomingThumbImage} />
      </View>
      <View style={styles.upcomingMeta}>
        <Text style={styles.upcomingTitle} numberOfLines={2}>
          {session.title ?? 'Upcoming live'}
        </Text>
        <Text style={styles.upcomingSub} numberOfLines={1}>
          {session.host}
          {session.scheduledAt ? ` · ${session.scheduledAt}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function DepartmentCircle({
  label,
  onPress,
  image,
  all,
}: {
  label: string;
  onPress: () => void;
  image?: number;
  all?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.deptItem}>
      <View style={[styles.deptCircle, all && styles.deptCircleAll]}>
        {all ? (
          <Text style={styles.deptAllText}>All</Text>
        ) : image ? (
          <Image source={image} style={styles.deptImage} />
        ) : (
          <ImagePlaceholderIcon size={20} color={Palette.muted3} />
        )}
      </View>
      <Text style={styles.deptLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { listings: catalog, toggleSave } = useListings();
  const { isConnected } = useNetworkStatus();
  const listings = useMemo(() => filterListings(catalog).slice(0, 4), [catalog]);
  const { liveNow, upcoming } = useLive();

  const sellers = useMemo(() => Array.from(new Set(catalog.map((l) => l.seller))).slice(0, 3), [catalog]);

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>throve</Text>
        <Pressable onPress={() => router.push('/(tabs)/inbox')} hitSlop={12} style={styles.bellBtn}>
          <BellIcon />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/search')} style={styles.searchBar}>
        <SearchIcon size={17} color={Palette.muted} />
        <Text style={styles.searchPlaceholder}>Search items, brands or sellers</Text>
      </Pressable>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabScrollBottom }]} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <View style={styles.offline}>
            <OfflineBanner message="Reconnect to see the latest listings and live sessions." />
          </View>
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Curated finds.{'\n'}Loved again.</Text>
            <Text style={styles.heroSub}>Timeless style, from closets across Nigeria.</Text>
            <Pressable onPress={() => router.push('/category-browse')} style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Shop now</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Shop by department" onSeeAll={() => router.push('/category-browse')} />
          <View style={styles.deptGrid}>
            {DEPARTMENTS.map((department) => (
              <DepartmentCircle
                key={department}
                label={department}
                image={DEPARTMENT_IMAGES[department]}
                onPress={() => router.push({ pathname: '/category-browse', params: { department } })}
              />
            ))}
            <DepartmentCircle label="Browse" all onPress={() => router.push('/category-browse')} />
          </View>
        </View>

        {liveNow.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading title="Live now" liveDot onSeeAll={() => router.push('/(tabs)/live')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
              {liveNow.map((liveSession) => (
                <LiveNowCard
                  key={liveSession.id}
                  session={liveSession}
                  onPress={() => router.push(`/live/${liveSession.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {upcoming.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading title="Upcoming live" onSeeAll={() => router.push('/(tabs)/live')} />
            <View style={styles.upcomingBox}>
              {upcoming.map((liveSession) => (
                <UpcomingLiveRow
                  key={liveSession.id}
                  session={liveSession}
                  onPress={() => router.push('/(tabs)/live')}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeading title="New listings" onSeeAll={() => router.push('/category-browse')} />
          {listings.length === 0 ? (
            <View style={styles.listingsBody}>
              <EmptyState title="Nothing here yet" message="Check back soon for new curated finds." />
            </View>
          ) : (
            <View style={styles.listingsBody}>
              <ListingGrid
                listings={listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    meta="condition"
                    showSave
                    saved={Boolean(session?.username && listing.savedBy.includes(session.username))}
                    onSave={() => {
                      if (session?.username) void toggleSave(listing.id, session.username);
                    }}
                    onPress={() => router.push(`/product/${listing.id}`)}
                  />
                ))}
              />
            </View>
          )}
        </View>

        {sellers.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading title="Sellers to discover" onSeeAll={() => router.push('/search')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sellerRow}>
              {sellers.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => router.push({ pathname: '/seller/[username]', params: { username: name } })}
                  style={styles.sellerCard}>
                  <AppImage source={getSellerAvatar(name)} style={styles.sellerAvatar} />
                  <Text style={styles.sellerName}>{name}</Text>
                  <Text style={styles.sellerView}>View</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  brand: {
    fontSize: 30,
    lineHeight: 30,
    fontFamily: Typography.display,
    color: Palette.plum,
    letterSpacing: -0.3,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    height: 46,
    paddingHorizontal: 15,
    backgroundColor: Palette.sand,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 23,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  content: {},
  offline: { marginHorizontal: 20, marginBottom: 12 },
  hero: {
    marginHorizontal: 20,
    marginBottom: 26,
    height: 210,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.espresso,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(90,31,69,0.88)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 26,
    gap: 12,
  },
  heroTitle: {
    fontFamily: Typography.display,
    fontSize: 29,
    lineHeight: 33,
    color: Palette.ivory,
    maxWidth: 190,
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.82)',
    maxWidth: 170,
  },
  heroCta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: Palette.ivory,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
  },
  heroCtaText: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  section: { marginBottom: 26 },
  listingsBody: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sectionTitleInline: {
    fontFamily: Typography.display,
    fontSize: 20,
    color: Palette.espresso,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.liveRed,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  deptGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  deptItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  deptCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.hatchAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptCircleAll: {
    borderColor: Palette.plum,
    backgroundColor: Palette.ivory,
  },
  deptImage: {
    width: '100%',
    height: '100%',
  },
  deptAllText: {
    fontFamily: Typography.display,
    fontSize: 17,
    color: Palette.plum,
  },
  deptLabel: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.espresso,
    textAlign: 'center',
  },
  liveRow: { paddingHorizontal: 20, gap: 12 },
  liveCard: { width: 208 },
  liveImageWrap: {
    width: 208,
    height: 250,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.liveDarkAlt,
  },
  liveImage: { width: '100%', height: '100%' },
  liveBottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '52%',
    backgroundColor: 'rgba(43,33,31,0.85)',
  },
  liveBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  liveBadgeRed: {
    backgroundColor: Palette.liveRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeRedText: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    color: Palette.ivory,
    letterSpacing: 0.9,
  },
  liveBadgeDark: {
    backgroundColor: 'rgba(43,33,31,0.62)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeDarkText: {
    fontSize: 9.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  liveFooter: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  liveCardTitle: {
    fontFamily: Typography.display,
    fontSize: 17,
    lineHeight: 20,
    color: Palette.ivory,
    marginBottom: 8,
  },
  liveHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveHostAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.6)',
  },
  liveHostName: {
    flex: 1,
    fontSize: 11,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.9)',
  },
  upcomingBox: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Palette.accent200,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.accent200,
    gap: 1,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.ivory,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  upcomingThumb: {
    width: 52,
    height: 52,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Palette.liveDarkAlt,
  },
  upcomingThumbImage: { width: '100%', height: '100%' },
  upcomingMeta: { flex: 1, minWidth: 0 },
  upcomingTitle: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  upcomingSub: {
    marginTop: 3,
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  sellerRow: { paddingHorizontal: 20, gap: 12 },
  sellerCard: {
    width: 128,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    padding: 16,
    alignItems: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  sellerAvatar: { width: 52, height: 52, borderRadius: 26, marginBottom: 9 },
  sellerName: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  sellerView: {
    marginTop: 10,
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
    borderWidth: 1,
    borderColor: Palette.plum,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
});
