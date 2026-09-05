import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import {
  ChatBubbleIcon,
  ChevronBackIcon,
  ImagePlaceholderIcon,
  MapPinIcon,
  MoreVerticalIcon,
  StarIcon,
  VideoIcon,
} from '@/components/ui/icons';
import { SellerProfileSkeleton } from '@/components/ui/loading-skeleton';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { StarRating } from '@/components/ui/star-rating';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { getListingImageSource, getLiveImage, isUsableRemoteImageUri } from '@/data/images';
import { REVIEWS, sellerRatingInfo } from '@/data/seed';
import type { Listing, LiveSession, Review } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const PREVIEW_REVIEWS = 2;

export default function SellerProfileScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const { isConnected } = useNetworkStatus();
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = Array.isArray(raw) ? raw[0] : raw;
  const { session, publicProfiles, ensurePublicProfile } = useAuth();
  const { listingsForSeller, loading: listingsLoading } = useListings();
  const checkout = useCheckout();
  const inbox = useInbox();
  const live = useLive();
  const [tab, setTab] = useState<'active' | 'sold'>('active');
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [profileReady, setProfileReady] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const isOwn = Boolean(session && username && session.username === username);

  useEffect(() => {
    if (!username || !session) return;
    if (session.username === username) {
      setProfileReady(true);
      setProfileError(false);
      return;
    }
    setProfileError(false);
    if (publicProfiles[username]) setProfileReady(true);
    void ensurePublicProfile(username)
      .then(() => {
        setProfileReady(true);
        setProfileError(false);
      })
      .catch(() => {
        setProfileReady(true);
        setProfileError(true);
      });
  }, [ensurePublicProfile, publicProfiles, session, username]);

  useEffect(() => {
    if (!username) return;
    const liveReviews = checkout.getReviews(username);
    const fallbackReviews = liveReviews.length ? liveReviews : (REVIEWS[username] ?? []);
    const liveStats = checkout.ratingInfo(username);
    const fallbackStats = liveStats.count ? liveStats : sellerRatingInfo(username);
    setReviews(fallbackReviews);
    setStats(fallbackStats.count ? fallbackStats : { avg: 0, count: 0 });
    void apiFetch<{ reviews: Review[]; avg: number; count: number }>(
      `/checkout/reviews/${encodeURIComponent(username)}`,
    )
      .then((data) => {
        if (data.reviews?.length) setReviews(data.reviews);
        if (data.count) setStats({ avg: data.avg, count: data.count });
      })
      .catch(() => undefined);
  }, [checkout, username]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 2000);
    return () => clearTimeout(timer);
  }, [banner]);

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!username) return <Redirect href="/(tabs)" />;

  const profile = isOwn
    ? { bio: session.bio, location: session.location, photoUri: session.photoUri }
    : publicProfiles[username] ?? { bio: '', location: '' };
  const mine = listingsForSeller(username);
  const activeListings = mine.filter((item) => item.status === 'available' || item.status === 'reserved');
  const soldListings = mine.filter((item) => item.status === 'sold');
  const shown = tab === 'sold' ? soldListings : activeListings;
  const liveNow = live.liveNow.find((item) => item.host === username);
  const upcoming = live.upcoming.find((item) => item.host === username);
  const me = session.username;
  const messageListing = mine[0];
  const previewReviews = reviews.slice(0, PREVIEW_REVIEWS);
  const blocked = inbox.isBlocked(username);
  const showSkeleton = !profileReady || (listingsLoading && mine.length === 0);

  async function message() {
    if (!messageListing) return;
    const conv = await inbox.openOrCreateConversation(username, messageListing.id, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <ChevronBackIcon />
        </Pressable>
        <View style={styles.headerSpacer} />
        {!isOwn ? (
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={styles.headerBtn}>
            <MoreVerticalIcon color={Palette.espresso} />
          </Pressable>
        ) : null}
      </View>

      {showSkeleton ? (
        <SellerProfileSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {!isConnected ? (
            <View style={styles.bannerGap}>
              <OfflineBanner title="No connection" message="Reconnect to view this seller." />
            </View>
          ) : null}
          {profileError && !isOwn ? (
            <AlertBanner
              variant="error"
              title="We couldn't load this profile"
              message="Please try again in a moment."
              style={styles.bannerGap}
            />
          ) : null}

          <View style={styles.identity}>
            <ProfileAvatar uri={profile.photoUri} username={username} style={styles.avatar} />
            <Text style={styles.name}>{username}</Text>
            {stats.count > 0 ? (
              <View style={styles.ratingLine}>
                <StarIcon size={13} />
                <Text style={styles.ratingValue}>{stats.avg.toFixed(1)}</Text>
                <Text style={styles.ratingCountInline}>{stats.count} reviews</Text>
              </View>
            ) : (
              <Text style={styles.ratingCount}>No reviews yet</Text>
            )}
            {profile.location ? (
              <View style={styles.locationRow}>
                <MapPinIcon size={13} color={Palette.muted} />
                <Text style={styles.location}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          </View>

          {!isOwn ? (
            <Pressable
              onPress={() => void message()}
              disabled={!messageListing}
              style={[styles.messageBtn, !messageListing && styles.messageBtnOff]}>
              <ChatBubbleIcon size={16} color={Palette.plum} />
              <Text style={styles.messageLabel}>Message seller</Text>
            </Pressable>
          ) : null}

          {liveNow ? (
            <LiveNowCard session={liveNow} onPress={() => router.push(`/live/${liveNow.id}`)} />
          ) : upcoming ? (
            <UpcomingLiveCard session={upcoming} onPress={() => router.push(`/live/${upcoming.id}`)} />
          ) : (
            <EmptyBox dashed message="This seller isn't live and has nothing scheduled." />
          )}

          <View style={styles.tabs}>
            <Pressable onPress={() => setTab('active')} style={[styles.tab, tab === 'active' && styles.tabOn]}>
              <Text style={[styles.tabLabel, tab === 'active' && styles.tabLabelOn]}>
                Active · {activeListings.length}
              </Text>
            </Pressable>
            <Pressable onPress={() => setTab('sold')} style={[styles.tab, tab === 'sold' && styles.tabOn]}>
              <Text style={[styles.tabLabel, tab === 'sold' && styles.tabLabelOn]}>Sold · {soldListings.length}</Text>
            </Pressable>
          </View>

          {shown.length === 0 ? (
            tab === 'sold' ? (
              <EmptyBox
                dashed
                title="No sales yet"
                message="This seller hasn't sold an item yet."
                style={styles.sectionGap}
              />
            ) : (
              <EmptyBox
                dashed
                title="Nothing listed right now"
                message="This seller has no active listings."
                style={styles.sectionGap}
              />
            )
          ) : (
            <View style={styles.grid}>
              {shown.map((item) => (
                <SellerListingCard key={item.id} listing={item} onPress={() => router.push(`/product/${item.id}`)} />
              ))}
            </View>
          )}

          <View style={styles.reviewsHead}>
            <Text style={styles.reviewsTitle}>Seller reviews</Text>
            {reviews.length > 0 ? (
              <Pressable onPress={() => setReviewsOpen(true)} hitSlop={8}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            ) : null}
          </View>
          {reviews.length === 0 ? (
            <EmptyBox message="No reviews yet." filled />
          ) : (
            <>
              <View style={styles.summary}>
                <Text style={styles.summaryScore}>{stats.avg.toFixed(1)}</Text>
                <StarRating rating={stats.avg} size={16} />
                <Text style={styles.summaryCopy}>
                  {stats.count} review{stats.count === 1 ? '' : 's'} from completed orders
                </Text>
              </View>
              {previewReviews.map((review, index) => (
                <ReviewRow key={`${review.buyer}-${index}`} review={review} last={index === previewReviews.length - 1} />
              ))}
              <Text style={styles.disclaimer}>
                Only buyers from completed Throve orders can leave a review — one per order.
              </Text>
            </>
          )}
        </ScrollView>
      )}

      {banner ? (
        <View style={[styles.toast, { top: top + 52 }]}>
          <Text style={styles.toastText}>{banner}</Text>
        </View>
      ) : null}

      <Modal visible={reviewsOpen} transparent animationType="slide" onRequestClose={() => setReviewsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setReviewsOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: sheetBottom }]} onPress={() => undefined}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Seller reviews</Text>
            <ScrollView style={styles.sheetList}>
              {reviews.map((review, index) => (
                <ReviewRow key={`${review.buyer}-${index}`} review={review} last={index === reviews.length - 1} />
              ))}
              <Text style={styles.disclaimer}>
                Only buyers from completed Throve orders can leave a review — one per order.
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: sheetBottom }]} onPress={() => undefined}>
            <View style={styles.handle} />
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setBanner('Seller reported. Our team will review.');
              }}
              style={styles.menuRow}>
              <Text style={styles.menuLabel}>Report @{username}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void inbox.toggleBlock(username);
                setMenuOpen(false);
                setBanner(blocked ? `Unblocked @${username}` : `Blocked @${username}`);
              }}
              style={styles.menuRow}>
              <Text style={styles.menuDanger}>{blocked ? 'Unblock seller' : 'Block seller'}</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={styles.menuRow}>
              <Text style={styles.menuMuted}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function liveCover(session: LiveSession) {
  if (session.thumbnailUrl && isUsableRemoteImageUri(session.thumbnailUrl)) return session.thumbnailUrl;
  return getLiveImage(session.id);
}

function LiveNowCard({ session, onPress }: { session: LiveSession; onPress: () => void }) {
  const cover = liveCover(session);
  return (
    <Pressable onPress={onPress} style={styles.liveCard}>
      <View style={styles.liveThumb}>
        {cover ? (
          <AppImage source={cover} style={StyleSheet.absoluteFillObject} />
        ) : (
          <ImagePlaceholderIcon size={22} color="rgba(255,247,240,0.55)" />
        )}
      </View>
      <View style={styles.liveCopy}>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
        <Text style={styles.liveWatching}>{session.viewers ?? 0} watching</Text>
        <Text style={styles.liveTitle} numberOfLines={1}>
          {session.title}
        </Text>
      </View>
      <View style={styles.watchBtn}>
        <Text style={styles.watchLabel}>Watch</Text>
      </View>
    </Pressable>
  );
}

function UpcomingLiveCard({ session, onPress }: { session: LiveSession; onPress: () => void }) {
  const cover = liveCover(session);
  return (
    <Pressable onPress={onPress} style={styles.upcomingCard}>
      <View style={styles.upcomingThumb}>
        {cover ? (
          <AppImage source={cover} style={StyleSheet.absoluteFillObject} />
        ) : (
          <VideoIcon size={20} color={Palette.placeholder} />
        )}
      </View>
      <View style={styles.liveCopy}>
        <Text style={styles.upcomingTitle} numberOfLines={1}>
          {session.title}
        </Text>
        <Text style={styles.upcomingWhen}>{session.scheduledAt || 'Scheduled soon'}</Text>
      </View>
      <View style={styles.upcomingChip}>
        <Text style={styles.upcomingChipText}>UPCOMING</Text>
      </View>
    </Pressable>
  );
}

function EmptyBox({
  title,
  message,
  dashed,
  filled,
  style,
}: {
  title?: string;
  message: string;
  dashed?: boolean;
  filled?: boolean;
  style?: object;
}) {
  return (
    <View
      style={[
        styles.emptyBox,
        dashed && styles.emptyDashed,
        filled && styles.emptyFilled,
        style,
      ]}>
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={[styles.emptyMessage, title ? styles.emptySub : null]}>{message}</Text>
    </View>
  );
}

function SellerListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const locked = listing.status === 'reserved' || listing.status === 'sold';
  const chip: ListingChipVariant | null =
    listing.status === 'reserved' || listing.status === 'sold' ? listing.status : null;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.photo}>
        <AppImage source={getListingImageSource(listing)} style={styles.photoImage} />
        {chip ? (
          <View style={styles.chipOverlay}>
            <StatusChip kind="listing" variant={chip} label={chip === 'reserved' ? 'RESERVED' : 'SOLD'} />
          </View>
        ) : null}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {listing.title}
      </Text>
      <Text style={styles.cardPrice}>{formatNaira(listing.price)}</Text>
      <Text style={styles.cardMeta}>
        {listing.condition}
        {locked ? ' · not purchasable' : ''}
      </Text>
    </Pressable>
  );
}

function ReviewRow({ review, last }: { review: Review; last?: boolean }) {
  const comment = review.comment?.trim();
  return (
    <View style={[styles.reviewRow, last && styles.reviewRowLast]}>
      <View style={styles.reviewTop}>
        <ProfileAvatar uri={undefined} username={review.buyer} style={styles.reviewAvatar} />
        <View style={styles.reviewCopy}>
          <Text style={styles.reviewBuyer}>{review.buyer}</Text>
          <Text style={styles.reviewMeta}>{review.date} · Completed order</Text>
        </View>
        <View style={styles.reviewScore}>
          <StarIcon size={12} color={Palette.espresso} />
          <Text style={styles.reviewScoreText}>{review.rating}</Text>
        </View>
      </View>
      {comment ? (
        <Text style={styles.reviewComment}>{comment}</Text>
      ) : (
        <Text style={styles.reviewEmpty}>Rating only — no comment left.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  bannerGap: { marginBottom: 16 },
  identity: { alignItems: 'center', paddingTop: 4, paddingBottom: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  name: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  ratingValue: { fontSize: 14, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  ratingCountInline: { fontSize: 13, fontFamily: Typography.body, color: Palette.muted },
  ratingCount: { marginTop: 8, fontSize: 13, fontFamily: Typography.body, color: Palette.muted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  location: { fontSize: 13, fontFamily: Typography.body, color: Palette.muted },
  bio: {
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
    textAlign: 'center',
    maxWidth: 320,
  },
  messageBtn: {
    minHeight: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Palette.plum,
    backgroundColor: Palette.ivoryElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  messageBtnOff: { opacity: 0.45 },
  messageLabel: { fontSize: 14.5, fontFamily: Typography.bodySemiBold, color: Palette.plum },
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.liveDark,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 22,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.accent200,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 22,
  },
  liveThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Palette.liveDarkAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveCopy: { flex: 1, minWidth: 0 },
  liveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.liveRed,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: Typography.bodyBold,
    color: Palette.ivory,
  },
  liveWatching: { marginTop: 5, fontSize: 12, fontFamily: Typography.body, color: 'rgba(255,247,240,0.72)' },
  liveTitle: { marginTop: 2, fontSize: 14, fontFamily: Typography.bodySemiBold, color: Palette.ivory },
  watchBtn: {
    backgroundColor: Palette.ivory,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  watchLabel: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  upcomingTitle: { fontSize: 14.5, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  upcomingWhen: { marginTop: 4, fontSize: 12.5, fontFamily: Typography.body, color: Palette.muted },
  upcomingChip: {
    borderWidth: 1,
    borderColor: Palette.gold,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  upcomingChipText: {
    fontSize: 10,
    letterSpacing: 0.7,
    fontFamily: Typography.bodyBold,
    color: Palette.gold,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 22,
  },
  emptyDashed: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  emptyFilled: {
    backgroundColor: Palette.ivoryElevated,
    borderColor: Palette.accent200,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  emptySub: { marginTop: 4 },
  sectionGap: { marginBottom: 28 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: Palette.plum },
  tabLabel: { fontSize: 13.5, fontFamily: Typography.bodySemiBold, color: Palette.muted3 },
  tabLabelOn: { color: Palette.plum },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  card: { width: '47.5%' },
  photo: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.sand,
  },
  photoImage: { width: '100%', aspectRatio: 0.82 },
  chipOverlay: { position: 'absolute', top: 8, left: 8 },
  cardTitle: { marginTop: 9, fontSize: 13, lineHeight: 18, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  cardPrice: { marginTop: 4, fontSize: 15, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  cardMeta: { marginTop: 3, fontSize: 11.5, fontFamily: Typography.body, color: Palette.muted },
  reviewsHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsTitle: { fontSize: 18, fontFamily: Typography.display, color: Palette.espresso },
  seeAll: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.plum },
  summary: {
    borderWidth: 1,
    borderColor: Palette.accent200,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  summaryScore: { fontSize: 36, lineHeight: 40, fontFamily: Typography.display, color: Palette.espresso },
  summaryCopy: { fontSize: 12.5, fontFamily: Typography.body, color: Palette.muted, textAlign: 'center' },
  reviewRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  reviewRowLast: { borderBottomWidth: 0 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewCopy: { flex: 1, minWidth: 0 },
  reviewBuyer: { fontSize: 13.5, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  reviewMeta: { marginTop: 2, fontSize: 11.5, fontFamily: Typography.body, color: Palette.muted3 },
  reviewScore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewScoreText: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  reviewComment: { marginTop: 10, fontSize: 13.5, lineHeight: 20, fontFamily: Typography.body, color: Palette.body },
  reviewEmpty: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body,
    fontStyle: 'italic',
    color: Palette.muted3,
  },
  disclaimer: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: Palette.espresso,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  toastText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: Palette.ivory },
  overlay: { flex: 1, backgroundColor: Palette.liveOverlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 21, fontFamily: Typography.display, color: Palette.espresso, marginBottom: 12 },
  sheetList: { maxHeight: 420 },
  menuRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Palette.divider },
  menuLabel: { fontSize: 15, fontFamily: Typography.bodyMedium, color: Palette.espresso },
  menuDanger: { fontSize: 15, fontFamily: Typography.bodyMedium, color: Palette.error },
  menuMuted: { fontSize: 15, fontFamily: Typography.body, color: Palette.muted },
});
