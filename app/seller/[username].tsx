import { Button } from '@/components/ui/button';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { ScreenHeader } from '@/components/ui/screen-header';
import { listingStatusStyle } from '@/components/ui/simulated-stage';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { getPublicSeller } from '@/data/seed';
import { formatNaira, starString } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!username) {
    return <Redirect href="/(tabs)" />;
  }

  const seller = getPublicSeller(username);
  const profile = session.username === username
    ? { bio: session.bio, location: session.location || seller.location }
    : seller;
  const mine = listingsForSeller(username);
  const shown = tab === 'sold' ? mine.filter((item) => item.status === 'sold') : mine.filter((item) => item.status === 'available' || item.status === 'reserved');
  const rating = ratingInfo(username);
  const reviews = getReviews(username);
  const ratingLine = rating.count > 0 ? `${starString(rating.avg)} (${rating.count} reviews)` : 'No reviews yet';
  const liveSession = live.liveNow.find((item) => item.host === username);
  const isOwn = session.username === username;
  const me = session.username;
  const messageListing = mine[0];

  function message() {
    if (!messageListing) return;
    const conv = inbox.openOrCreateConversation(username, messageListing.id, me);
    router.push(`/inbox/chat/${conv.id}`);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Seller profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.identity}>
          <PlaceholderImage style={styles.avatar} />
          <Text style={styles.name}>@{username}</Text>
          {profile.location ? <Text style={styles.meta}>{profile.location}</Text> : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <Pressable onPress={() => setReviewsOpen(true)}>
            <Text style={styles.rating}>{ratingLine} ›</Text>
          </Pressable>
          {liveSession ? (
            <Pressable onPress={() => router.push(`/live/${liveSession.id}`)} style={styles.liveBtn}>
              <Text style={styles.liveLabel}>● LIVE — join now</Text>
            </Pressable>
          ) : null}
          {!isOwn ? (
            <Button label="Message" variant="secondary" disabled={!messageListing} onPress={message} style={styles.message} />
          ) : null}
        </View>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('active')} style={[styles.tab, tab === 'active' ? styles.tabOn : null]}>
            <Text style={[styles.tabLabel, tab === 'active' ? styles.tabLabelOn : null]}>Active</Text>
          </Pressable>
          <Pressable onPress={() => setTab('sold')} style={[styles.tab, tab === 'sold' ? styles.tabOn : null]}>
            <Text style={[styles.tabLabel, tab === 'sold' ? styles.tabLabelOn : null]}>Sold</Text>
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
                    <PlaceholderImage style={styles.photoFill} />
                    <View style={[styles.chip, { backgroundColor: status.backgroundColor }]}>
                      <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
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
              <Text style={styles.sheetTitle}>{ratingLine}</Text>
              <Pressable onPress={() => setReviewsOpen(false)} hitSlop={12}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList}>
              {reviews.length === 0 ? (
                <Text style={styles.empty}>No reviews yet.</Text>
              ) : (
                reviews.map((review, index) => (
                  <View key={`${review.buyer}-${index}`} style={styles.review}>
                    <View style={styles.reviewTop}>
                      <Text style={styles.reviewBuyer}>{review.buyer}</Text>
                      <Text style={styles.stars}>{starString(review.rating)}</Text>
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
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingBottom: 24,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  meta: {
    fontSize: 13,
    color: Palette.muted2,
  },
  bio: {
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  rating: {
    fontSize: 13,
    color: Palette.text,
    paddingVertical: 2,
  },
  liveBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Palette.live,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.background,
  },
  message: {
    marginTop: 8,
    height: 42,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.text,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.muted3,
  },
  tabLabelOn: {
    fontWeight: '700',
    color: Palette.text,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 40,
    fontSize: 13,
    color: Palette.muted3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 20,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  photo: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoFill: {
    ...StyleSheet.absoluteFillObject,
  },
  chip: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: Palette.text,
  },
  cardPrice: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  close: {
    fontSize: 18,
    color: Palette.muted2,
  },
  sheetList: {
    maxHeight: 360,
  },
  review: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hatch,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewBuyer: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  stars: {
    fontSize: 13,
    color: '#c9a227',
  },
  reviewComment: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted,
  },
  reviewDate: {
    marginTop: 3,
    fontSize: 11,
    color: Palette.muted3,
  },
});
