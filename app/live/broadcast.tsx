import { SimulatedStage, listingStatusStyle } from '@/components/ui/simulated-stage';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useLive } from '@/context/live-context';
import { getListing } from '@/data/seed';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LiveBroadcastScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const live = useLive();

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!session.canHostLive) {
    return <Redirect href="/live/host-access" />;
  }

  const broadcastId = live.activeBroadcastId;
  const liveSession = broadcastId ? live.getSession(broadcastId) : live.liveNow.find((item) => item.host === session.username);
  if (!liveSession || liveSession.status !== 'live') {
    return <Redirect href="/(tabs)/live" />;
  }

  const connection = live.getConnection(liveSession.id);
  const comments = live.getComments(liveSession.id);
  const featuredIds = liveSession.featuredListingIds?.length
    ? liveSession.featuredListingIds
    : liveSession.pinnedListingId
      ? [liveSession.pinnedListingId]
      : [];
  const pinned = live.resolveListing(liveSession.pinnedListingId);
  const sessionId = liveSession.id;

  function end() {
    live.endLive(sessionId);
    router.replace('/(tabs)/live');
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SimulatedStage>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>● LIVE</Text>
          </View>
          <Text style={styles.viewers}>{liveSession.viewers ?? 1} watching</Text>
          <Pressable onPress={end} style={styles.endBtn}>
            <Text style={styles.endLabel}>End live</Text>
          </Pressable>
        </View>
        {connection === 'lost' ? (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Connection lost — reconnecting…</Text>
          </View>
        ) : (
          <View style={styles.flex} />
        )}
        <Pressable onPress={() => live.toggleConnection(liveSession.id)} style={styles.simBtn}>
          <Text style={styles.simLabel}>{connection === 'lost' ? 'Simulate: reconnected' : 'Simulate connection lost'}</Text>
        </Pressable>
      </SimulatedStage>

      <View style={styles.pinBlock}>
        <Text style={styles.section}>Pin a product</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinRow}>
          {featuredIds.map((id) => {
            const listing = getListing(id);
            if (!listing) return null;
            const status = live.listingStatus(id) ?? listing.status;
            const on = liveSession.pinnedListingId === id;
            return (
              <Pressable key={id} onPress={() => live.pinListing(liveSession.id, id)} style={[styles.pinChip, on ? styles.pinChipOn : styles.pinChipOff]}>
                <Text style={[styles.pinChipLabel, on ? styles.pinChipLabelOn : styles.pinChipLabelOff]}>
                  {listing.title} · {listingStatusStyle(status).label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {pinned ? (
        <View style={styles.pinnedRow}>
          <Text style={styles.pinnedTitle}>Pinned: {pinned.title}</Text>
          <View style={[styles.statusChip, { backgroundColor: listingStatusStyle(pinned.status).backgroundColor }]}>
            <Text style={[styles.statusLabel, { color: listingStatusStyle(pinned.status).color }]}>
              {listingStatusStyle(pinned.status).label}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.comments, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <ScrollView contentContainerStyle={styles.commentList}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Text style={styles.comment}>
                <Text style={styles.commentUser}>{comment.user}</Text> {comment.text}
              </Text>
              <Pressable onPress={() => live.removeComment(liveSession.id, comment.id)} hitSlop={8}>
                <Text style={styles.remove}>remove</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  liveBadge: {
    backgroundColor: Palette.live,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadgeText: {
    color: Palette.background,
    fontSize: 11,
    fontWeight: '700',
  },
  viewers: {
    color: Palette.background,
    fontSize: 12,
  },
  endBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
  },
  endLabel: {
    color: Palette.live,
    fontSize: 12,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    color: Palette.background,
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  simBtn: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
  },
  simLabel: {
    color: Palette.background,
    fontSize: 11,
  },
  pinBlock: {
    backgroundColor: Palette.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  section: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pinRow: {
    gap: 8,
    paddingBottom: 4,
  },
  pinChip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    justifyContent: 'center',
  },
  pinChipOn: {
    backgroundColor: Palette.text,
  },
  pinChipOff: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  pinChipLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  pinChipLabelOn: {
    color: Palette.background,
  },
  pinChipLabelOff: {
    color: Palette.text,
  },
  pinnedRow: {
    backgroundColor: Palette.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pinnedTitle: {
    flex: 1,
    fontSize: 12,
    color: Palette.text,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  comments: {
    backgroundColor: Palette.background,
    maxHeight: 150,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
  },
  commentList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  comment: {
    flex: 1,
    fontSize: 12,
    color: Palette.text,
  },
  commentUser: {
    fontWeight: '700',
  },
  remove: {
    fontSize: 11,
    color: Palette.muted3,
  },
});
