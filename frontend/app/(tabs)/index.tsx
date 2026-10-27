import { OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { HomeBannerCarousel } from '@/components/home/home-banner-carousel';
import { BellIcon, BookmarkIcon, ImagePlaceholderIcon, SearchIcon } from '@/components/ui/icons';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { ListingCard } from '@/components/ui/listing-card';
import { ListingGrid } from '@/components/ui/listing-grid';
import { CardRowSkeleton, ListingGridSkeleton } from '@/components/ui/loading-skeleton';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { ThroveLogo } from '@/components/ui/throve-logo';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { useNotifications } from '@/context/notifications-context';
import { filterListings } from '@/data/filter-listings';
import { getLiveImage } from '@/data/images';
import type { LiveSession } from '@/data/types';
import { DEPARTMENTS } from '@/data/seed';
import { formatLiveSchedule } from '@/lib/format';
import { FOLLOWING_PREVIEW_PER_SELLER, latestPerSeller } from '@/lib/following-feed';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

function sessionCover(session: LiveSession) {
  if (session.thumbnailUrl?.startsWith('http')) return session.thumbnailUrl;
  return getLiveImage(session.id);
}

function LiveNowCard({
  session,
  hostPhotoUri,
  onPress,
}: {
  session: LiveSession;
  hostPhotoUri?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.liveCard}>
      <View style={styles.liveImageWrap}>
        <AppImage source={sessionCover(session)} style={styles.liveImage} />
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
            <ProfileAvatar
              uri={hostPhotoUri ?? session.hostPhotoUrl}
              username={session.host}
              style={styles.liveHostAvatar}
            />
            <Text style={styles.liveHostName} numberOfLines={1}>
              {session.host}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const HOME_UPCOMING_PREVIEW = 5;

function UpcomingLiveCard({
  session,
  saved,
  onPress,
  onSave,
}: {
  session: LiveSession;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
}) {
  const when = formatLiveSchedule(session.scheduledAt);
  return (
    <Pressable onPress={onPress} style={styles.upcomingCard}>
      <View style={styles.upcomingImageWrap}>
        <AppImage source={sessionCover(session)} style={styles.upcomingImage} />
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onSave();
          }}
          style={styles.heartBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark this live'}
        >
          <BookmarkIcon size={15} filled={saved} color={saved ? Palette.plum : Palette.espresso} />
        </Pressable>
      </View>
      <Text style={styles.upcomingCardTitle} numberOfLines={2}>
        {session.title ?? 'Upcoming live'}
      </Text>
      <Text style={styles.upcomingCardSub} numberOfLines={1}>
        {session.host}
      </Text>
      {when ? (
        <Text style={styles.upcomingWhen} numberOfLines={1}>
          {when}
        </Text>
      ) : null}
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
  const { session, publicProfiles, ensurePublicProfile } = useAuth();
  const {
    listings: catalog,
    followingListings,
    toggleSave,
    refresh: refreshListings,
    loading: listingsLoading,
  } = useListings();
  const { unreadCount } = useNotifications();
  const { isConnected } = useNetworkStatus();
  const listings = useMemo(() => filterListings(catalog).slice(0, 4), [catalog]);
  const followingFeed = useMemo(
    () => latestPerSeller(followingListings, FOLLOWING_PREVIEW_PER_SELLER),
    [followingListings],
  );
  const { liveNow, upcoming, refresh: refreshLive, isLiveSaved, toggleSaveLive, loading: liveLoading } = useLive();
  // Placeholders only on the first load; a refresh keeps showing what's already there.
  const listingsPending = listingsLoading && catalog.length === 0;
  const livePending = liveLoading && liveNow.length === 0 && upcoming.length === 0;

  const sellers = useMemo(() => Array.from(new Set(catalog.map((l) => l.seller))).slice(0, 3), [catalog]);

  useEffect(() => {
    const usernames = new Set<string>([...sellers, ...liveNow.map((item) => item.host)]);
    for (const username of usernames) {
      if (!username) continue;
      void ensurePublicProfile(username).catch(() => undefined);
    }
  }, [ensurePublicProfile, liveNow, sellers]);

  const [bannerRefresh, setBannerRefresh] = useState(0);
  const pullTask = useCallback(async () => {
    setBannerRefresh((n) => n + 1);
    await Promise.all([refreshListings(), refreshLive()]);
  }, [refreshListings, refreshLive]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.header}>
        <ThroveLogo size={36} />
        <Pressable onPress={() => router.push('/inbox/alerts')} hitSlop={12} style={styles.bellBtn}>
          <BellIcon />
          {unreadCount > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/search')} style={styles.searchBar}>
        <SearchIcon size={17} color={Palette.muted} />
        <Text style={styles.searchPlaceholder}>Search items, brands or sellers</Text>
      </Pressable>

      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={[styles.content, { paddingBottom: tabScrollBottom }]}
      >
        {!isConnected ? (
          <View style={styles.offline}>
            <OfflineBanner message="Reconnect to see the latest listings and live sessions." />
          </View>
        ) : null}

        <HomeBannerCarousel refreshSignal={bannerRefresh} />

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

        {livePending ? (
          <View style={styles.section}>
            <SectionHeading title="Live now" liveDot />
            <CardRowSkeleton count={2} width={208} height={250} lines={0} />
          </View>
        ) : null}

        {liveNow.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading title="Live now" liveDot onSeeAll={() => router.push('/(tabs)/live')} />
            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.liveRow}
            >
              {liveNow.map((liveSession) => (
                <LiveNowCard
                  key={liveSession.id}
                  session={liveSession}
                  hostPhotoUri={
                    publicProfiles[liveSession.host]?.photoUri ??
                    (session?.username === liveSession.host ? session.photoUri : undefined)
                  }
                  onPress={() => router.push(`/live/${liveSession.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {upcoming.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading title="Upcoming live" onSeeAll={() => router.push('/(tabs)/live')} />
            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.upcomingScroll}
            >
              {upcoming.slice(0, HOME_UPCOMING_PREVIEW).map((liveSession) => (
                <UpcomingLiveCard
                  key={liveSession.id}
                  session={liveSession}
                  saved={isLiveSaved(liveSession.id)}
                  onPress={() =>
                    router.push({ pathname: '/seller/[username]', params: { username: liveSession.host } })
                  }
                  onSave={() => {
                    if (!session) {
                      router.push('/(auth)/welcome');
                      return;
                    }
                    void toggleSaveLive(liveSession.id);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {session && (listingsPending || followingFeed.length > 0) ? (
          <View style={styles.section}>
            <SectionHeading
              title="From sellers you follow"
              onSeeAll={listingsPending ? undefined : () => router.push('/following')}
            />
            {listingsPending ? (
              <CardRowSkeleton count={3} width={132} height={170} />
            ) : (
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.followRow}
              >
                {followingFeed.map((listing) => (
                  <View key={listing.id} style={styles.followCard}>
                    <ListingCard
                      listing={listing}
                      meta="condition"
                      showSave
                      saved={Boolean(session.username && listing.savedBy.includes(session.username))}
                      onSave={() => {
                        void toggleSave(listing.id, session.username);
                      }}
                      onPress={() => router.push(`/product/${listing.id}`)}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {listingsPending || listings.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading
            title="New listings"
            onSeeAll={listingsPending ? undefined : () => router.push('/category-browse')}
          />
          {listingsPending ? (
            <View style={styles.listingsBody}>
              <ListingGridSkeleton count={4} inset={false} />
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
        ) : null}

        {listingsPending ? (
          <View style={styles.section}>
            <SectionHeading title="Sellers to discover" />
            <CardRowSkeleton count={3} width={128} height={64} round />
          </View>
        ) : null}

        {sellers.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading title="Sellers to discover" onSeeAll={() => router.push('/search')} />
            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sellerRow}
            >
              {sellers.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => router.push({ pathname: '/seller/[username]', params: { username: name } })}
                  style={styles.sellerCard}>
                  <ProfileAvatar
                    uri={
                      publicProfiles[name]?.photoUri ??
                      (session?.username === name ? session.photoUri : undefined)
                    }
                    username={name}
                    style={styles.sellerAvatar}
                  />
                  <Text style={styles.sellerName}>{name}</Text>
                  <Text style={styles.sellerView}>View</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </LiquidRefreshScrollView>
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
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: Palette.liveRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontSize: 9,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
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
  followRow: { paddingHorizontal: 20, gap: 10, paddingRight: 20 },
  followCard: { width: 132 },
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
  upcomingScroll: { paddingHorizontal: 20, gap: 10, paddingRight: 20 },
  upcomingCard: { width: 168 },
  upcomingImageWrap: {
    position: 'relative',
    width: 168,
    height: 200,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.liveDarkAlt,
  },
  upcomingImage: { width: '100%', height: '100%' },
  heartBtn: {
    position: 'absolute',
    zIndex: 2,
    elevation: 3,
    top: 9,
    right: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,247,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingCardTitle: {
    marginTop: 9,
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  upcomingCardSub: {
    marginTop: 3,
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  upcomingWhen: {
    marginTop: 3,
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.plum,
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
