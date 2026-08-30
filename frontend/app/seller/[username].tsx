import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StarRating } from '@/components/ui/star-rating';
import { listingStatusStyle } from '@/components/ui/simulated-stage';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { getListingImage, getSellerAvatar } from '@/data/images';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SellerProfileScreen() {
  const router = useRouter();
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = Array.isArray(raw) ? raw[0] : raw;
  const { session } = useAuth();
  const { listingsForSeller } = useListings();
  const { ratingInfo, getReviews } = useCheckout();
  const inbox = useInbox();
  const live = useLive();
  const [tab, setTab] = useState<'active' | 'sold'>('active');
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [publicProfile, setPublicProfile] = useState<{ bio: string; location: string; photoUri?: string } | null>(null);

  useEffect(() => {
    if (!username || session?.username === username) return;
    apiFetch<{ bio: string; location: string; photoUri?: string }>(`/profiles/${username}/public`)
      .then(setPublicProfile)
      .catch(() => setPublicProfile({ bio: '', location: '' }));
  }, [session?.username, username]);

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!username) return <Redirect href="/(tabs)" />;

  const profile = session.username === username
    ? { bio: session.bio, location: session.location }
    : publicProfile ?? { bio: '', location: '' };
  const mine = listingsForSeller(username);
  const shown = tab === 'sold' ? mine.filter((i) => i.status === 'sold') : mine.filter((i) => i.status === 'available' || i.status === 'reserved');
  const rating = ratingInfo(username);
  const reviews = getReviews(username);
  const liveSession = live.liveNow.find((i) => i.host === username);
  const isOwn = session.username === username;
  const me = session.username;
  const messageListing = mine[0];

  async function message() {
    if (!messageListing) return;
    const conv = await inbox.openOrCreateConversation(username, messageListing.id, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Seller profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            <AppImage source={getSellerAvatar(username)} style={styles.avatar} />
            {liveSession ? <View style={styles.liveDot} /> : null}
          </View>
          <Text style={styles.name}>@{username}</Text>
          {profile.location ? <Text style={styles.meta}>{profile.location}</Text> : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <Pressable onPress={() => setReviewsOpen(true)} style={styles.ratingRow}>
            <StarRating rating={rating.avg} />
            <Text style={styles.ratingText}>
              {rating.count > 0 ? `${rating.avg.toFixed(1)} (${rating.count} reviews)` : 'No reviews yet'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.muted2} />
          </Pressable>
          {liveSession ? (
            <Pressable onPress={() => router.push(`/live/${liveSession.id}`)} style={styles.liveBtn}>
              <Text style={styles.liveLabel}>LIVE — join now</Text>
            </Pressable>
          ) : null}
          {!isOwn ? (
            <Button label="Message" variant="secondary" disabled={!messageListing} onPress={message} style={styles.message} />
          ) : null}
        </View>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('active')} style={[styles.tab, tab === 'active' && styles.tabOn]}>
            <Text style={[styles.tabLabel, tab === 'active' && styles.tabLabelOn]}>Active</Text>
          </Pressable>
          <Pressable onPress={() => setTab('sold')} style={[styles.tab, tab === 'sold' && styles.tabOn]}>
            <Text style={[styles.tabLabel, tab === 'sold' && styles.tabLabelOn]}>Sold</Text>
          </Pressable>
        </View>
        {shown.length === 0 ? (
          <Text style={styles.empty}>Nothing here yet.</Text>
        ) : (
          <View style={styles.grid}>
            {shown.map((item) => {
              const status = listingStatusStyle(item.status);
              return (
                <Pressable key={item.id} onPress={() => router.push(`/product/${item.id}`)} style={styles.card}>
                  <View style={styles.photo}>
                    <AppImage source={getListingImage(item.id)} style={StyleSheet.absoluteFillObject} />
                    <View style={[styles.statusChip, { backgroundColor: status.backgroundColor }]}>
                      <Text style={[styles.statusChipText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{formatNaira(item.price)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <Modal visible={reviewsOpen} transparent animationType="slide" onRequestClose={() => setReviewsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setReviewsOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>Reviews</Text>
              <Pressable onPress={() => setReviewsOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={20} color={Palette.muted2} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList}>
              {reviews.length === 0 ? (
                <Text style={styles.empty}>No reviews yet.</Text>
              ) : (
                reviews.map((review, i) => (
                  <View key={`${review.buyer}-${i}`} style={styles.review}>
                    <View style={styles.reviewTop}>
                      <Text style={styles.reviewBuyer}>{review.buyer}</Text>
                      <StarRating rating={review.rating} size={12} />
                    </View>
                    {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  body: { paddingBottom: 24 },
  identity: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 6 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  liveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Palette.live,
    borderWidth: 2,
    borderColor: Palette.background,
  },
  name: { fontSize: 17, fontFamily: Typography.heading, color: Palette.text },
  meta: { fontSize: 13, fontFamily: Typography.body, color: Palette.muted2 },
  bio: { fontSize: 13, lineHeight: 20, fontFamily: Typography.body, color: Palette.muted, textAlign: 'center', maxWidth: 280 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  ratingText: { fontSize: 13, fontFamily: Typography.body, color: Palette.text },
  liveBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Palette.live,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  liveLabel: { fontSize: 12, fontFamily: Typography.bodySemiBold, color: Palette.background },
  message: { marginTop: 8, height: 42, paddingHorizontal: 24, alignSelf: 'center' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: Palette.accent },
  tabLabel: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.muted3 },
  tabLabelOn: { color: Palette.accent700 },
  empty: { textAlign: 'center', paddingTop: 40, fontSize: 13, fontFamily: Typography.body, color: Palette.muted3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  card: { width: '47%', flexGrow: 1, maxWidth: '48%' },
  photo: { aspectRatio: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  statusChip: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusChipText: { fontSize: 10, fontFamily: Typography.bodySemiBold },
  cardTitle: { marginTop: 8, fontSize: 13, lineHeight: 17, fontFamily: Typography.bodySemiBold, color: Palette.text },
  cardPrice: { marginTop: 3, fontSize: 14, fontFamily: Typography.heading, color: Palette.accent700 },
  overlay: { flex: 1, backgroundColor: 'rgba(23,23,23,0.3)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: 20,
    maxHeight: '70%',
  },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { flex: 1, fontSize: 17, fontFamily: Typography.heading, color: Palette.text },
  sheetList: { maxHeight: 360 },
  review: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Palette.divider },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewBuyer: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.text },
  reviewComment: { marginTop: 4, fontSize: 13, lineHeight: 20, fontFamily: Typography.body, color: Palette.muted },
  reviewDate: { marginTop: 3, fontSize: 11, fontFamily: Typography.body, color: Palette.muted3 },
});
