import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import {
  AlertCircleIcon,
  BagIcon,
  ChevronForwardIcon,
  HeartIcon,
  ListingsIcon,
  MapPinIcon,
  SettingsIcon,
  StarIcon,
  VideoIcon,
} from '@/components/ui/icons';
import { SellerProfileSkeleton } from '@/components/ui/loading-skeleton';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { getListingImageSource } from '@/data/images';
import { sellerRatingInfo } from '@/data/seed';
import type { Listing, Review } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Tab = 'active' | 'sold';

export default function ProfileScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { listingsForSeller, savedListingsFor, loading: listingsLoading, refresh } = useListings();
  const checkout = useCheckout();
  const live = useLive();
  const { isConnected } = useNetworkStatus();
  const [tab, setTab] = useState<Tab>('active');
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState({ avg: 0, count: 0 });

  const username = session?.username ?? '';

  const mine = useMemo(() => {
    if (!username) return [];
    return listingsForSeller(username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [listingsForSeller, username]);

  const activeListings = useMemo(
    () => mine.filter((item) => item.status === 'available' || item.status === 'reserved'),
    [mine],
  );
  const soldListings = useMemo(() => mine.filter((item) => item.status === 'sold'), [mine]);
  const shown = tab === 'sold' ? soldListings : activeListings;
  const savedCount = username ? savedListingsFor(username).length : 0;
  const myLiveSessions = useMemo(
    () => live.sessions.filter((item) => item.host === username),
    [live.sessions, username],
  );
  const missingPhoto = !session?.photoUri;
  const missingBio = !session?.bio?.trim();
  const profileIncomplete = Boolean(session && (missingPhoto || missingBio));
  const incompleteTitle =
    missingPhoto && missingBio ? 'Add a photo and bio' : missingPhoto ? 'Add a photo' : 'Add a bio';
  const incompleteBody =
    missingPhoto && missingBio
      ? 'Add a photo and a short bio to complete your profile.'
      : missingPhoto
        ? 'Add a profile photo to complete your profile.'
        : 'Add a short bio to complete your profile.';
  const showSkeleton = listingsLoading && mine.length === 0 && !loadError;

  const reload = useCallback(async () => {
    setLoadError(false);
    const ok = await refresh();
    if (!ok) setLoadError(true);
  }, [refresh]);

  useEffect(() => {
    if (!username) return;
    const liveStats = checkout.ratingInfo(username);
    const fallback = liveStats.count ? liveStats : sellerRatingInfo(username);
    setStats(fallback.count ? fallback : { avg: 0, count: 0 });
    void apiFetch<{ reviews: Review[]; avg: number; count: number }>(
      `/checkout/reviews/${encodeURIComponent(username)}`,
    )
      .then((data) => {
        if (data.count) setStats({ avg: data.avg, count: data.count });
      })
      .catch(() => undefined);
  }, [checkout, username]);

  if (!session) return null;

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.top}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={() => router.push('/profile/settings')} hitSlop={12} style={styles.settingsBtn}>
          <SettingsIcon size={18} color={Palette.espresso} />
        </Pressable>
      </View>

      {showSkeleton ? (
        <SellerProfileSkeleton />
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]}>
          {!isConnected ? (
            <OfflineBanner title="No connection" message="Reconnect to load your profile." />
          ) : null}

          {loadError && isConnected ? (
            <AlertBanner
              variant="error"
              title="We couldn't load your profile"
              message="Please try again in a moment."
            />
          ) : null}

          {loadError && isConnected ? (
            <Button label="Try again" variant="secondary" onPress={() => void reload()} />
          ) : null}

          <View style={styles.identity}>
            <ProfileAvatar uri={session.photoUri} username={session.username} style={styles.avatar} />
            <View style={styles.identityMeta}>
              <Text style={styles.username}>{session.username}</Text>
              {stats.count > 0 ? (
                <View style={styles.ratingLine}>
                  <StarIcon size={13} />
                  <Text style={styles.ratingValue}>{stats.avg.toFixed(1)}</Text>
                  <Text style={styles.ratingCount}>
                    · {stats.count} review{stats.count === 1 ? '' : 's'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.ratingEmpty}>No reviews yet</Text>
              )}
              {session.location ? (
                <View style={styles.locationRow}>
                  <MapPinIcon size={13} color={Palette.muted} />
                  <Text style={styles.location}>{session.location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {session.bio ? <Text style={styles.bio}>{session.bio}</Text> : null}

          {profileIncomplete ? (
            <View style={styles.incompleteBlock}>
              <View style={styles.incompleteBanner}>
                <AlertCircleIcon color={Palette.warning} />
                <View style={styles.incompleteCopy}>
                  <Text style={styles.incompleteTitle}>{incompleteTitle}</Text>
                  <Text style={styles.incompleteBody}>{incompleteBody}</Text>
                </View>
              </View>
              <Button
                label="Complete profile"
                variant="secondary"
                onPress={() => router.push('/profile/edit')}
              />
            </View>
          ) : (
            <Button label="Edit profile" variant="secondary" onPress={() => router.push('/profile/edit')} />
          )}

          <View style={styles.menu}>
            <MenuRow
              icon={<ListingsIcon />}
              label="My listings"
              hint={String(mine.filter((i) => i.status !== 'draft' && i.status !== 'removed').length)}
              onPress={() => router.push('/(tabs)/sell')}
            />
            <MenuRow
              icon={<HeartIcon size={18} color={Palette.plum} />}
              label="Saved items"
              hint={String(savedCount)}
              onPress={() => router.push('/profile/saved')}
            />
            <MenuRow icon={<BagIcon />} label="Orders" onPress={() => router.push('/profile/orders')} />
            <MenuRow
              icon={<VideoIcon size={18} color={Palette.plum} />}
              label="My live sessions"
              last
              onPress={() => router.push(session.canHostLive ? '/live/prepare' : '/live/host-access')}
            />
          </View>

          <View style={styles.tabs}>
            <Pressable onPress={() => setTab('active')} style={[styles.tab, tab === 'active' && styles.tabOn]}>
              <Text style={[styles.tabLabel, tab === 'active' && styles.tabLabelOn]}>
                Active · {activeListings.length}
              </Text>
            </Pressable>
            <Pressable onPress={() => setTab('sold')} style={[styles.tab, tab === 'sold' && styles.tabOn]}>
              <Text style={[styles.tabLabel, tab === 'sold' && styles.tabLabelOn]}>
                Sold · {soldListings.length}
              </Text>
            </Pressable>
          </View>

          {tab === 'active' && shown.length === 0 ? (
            <View style={styles.emptyActive}>
              <Text style={styles.emptyActiveTitle}>Nothing listed right now</Text>
              <Button
                label="Create listing"
                onPress={() => {
                  router.push('/sell/create');
                }}
              />
            </View>
          ) : null}

          {tab === 'sold' && shown.length === 0 ? (
            <View style={styles.emptyStack}>
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyMuted}>You haven't sold anything yet.</Text>
              </View>
              {myLiveSessions.length === 0 ? (
                <View style={styles.emptyDashed}>
                  <Text style={styles.emptyMuted}>No live sessions yet.</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {shown.length > 0 ? (
            <View style={styles.grid}>
              {shown.map((listing) => (
                <ListingTile
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/sell/${listing.id}`)}
                />
              ))}
            </View>
          ) : null}

          <Text style={styles.privacyNote}>
            Email, phone number, delivery address, banking and KYC information never appear on the profile surface.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  last,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuRowBorder, pressed && styles.pressed]}>
      {icon}
      <Text style={styles.menuLabel}>{label}</Text>
      {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
      <ChevronForwardIcon />
    </Pressable>
  );
}

function ListingTile({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <AppImage source={getListingImageSource(listing)} style={styles.tileImage} />
      <Text style={styles.tileTitle} numberOfLines={2}>
        {listing.title}
      </Text>
      <Text style={styles.tilePrice}>{formatNaira(listing.price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 26,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  identityMeta: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  username: {
    fontSize: 25,
    lineHeight: 28,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  ratingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingValue: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  ratingCount: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  ratingEmpty: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  location: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  bio: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  incompleteBlock: {
    gap: 11,
  },
  incompleteBanner: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
    backgroundColor: Palette.warningBg,
  },
  incompleteCopy: { flex: 1, gap: 3 },
  incompleteTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
  },
  incompleteBody: {
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  menu: {
    borderWidth: 1,
    borderColor: Palette.accent200,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  menuHint: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.label,
  },
  pressed: { opacity: 0.88 },
  tabs: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: Palette.accent200,
  },
  tab: {
    paddingBottom: 10,
  },
  tabOn: {
    borderBottomWidth: 2,
    borderBottomColor: Palette.plum,
    marginBottom: -1,
  },
  tabLabel: {
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.label,
  },
  tabLabelOn: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  tile: {
    width: '47%',
    gap: 4,
  },
  tileImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 6,
    backgroundColor: Palette.skeleton,
  },
  tileTitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  tilePrice: {
    marginTop: 2,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  emptyActive: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyActiveTitle: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  emptyStack: {
    gap: 9,
  },
  emptyDashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyMuted: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  privacyNote: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    marginTop: Spacing.sm,
  },
});
