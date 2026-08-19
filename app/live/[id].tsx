import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { SimulatedStage, listingStatusStyle } from '@/components/ui/simulated-stage';
import { TextField } from '@/components/ui/text-field';
import { Palette, Typography, Radius } from '@/constants/theme';
import { getListingImage } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { formatCountdown, formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LiveViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const live = useLive();
  const checkout = useCheckout();
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const liveSession = id ? live.getSession(id) : undefined;
  if (!liveSession) {
    return <Redirect href="/(tabs)/live" />;
  }

  const connection = live.getConnection(liveSession.id);
  const comments = live.getComments(liveSession.id);
  const pinned = live.resolveListing(liveSession.pinnedListingId);
  const claim = live.getClaim(liveSession.id);
  const claimedByMe = Boolean(claim && session.username === claim.username && claim.listingId === pinned?.id);
  const remaining = claim ? claim.expiresAt - live.now : 0;
  const sessionId = liveSession.id;
  const username = session.username;

  function leave() {
    router.replace('/(tabs)/live');
  }

  function report() {
    setNote('Live session reported.');
    setTimeout(() => setNote(null), 2200);
  }

  function send() {
    live.sendComment(sessionId, username, draft);
    setDraft('');
  }

  function goCheckout() {
    if (!pinned) return;
    const started = checkout.startCheckout({ listingId: pinned.id, liveSessionId: sessionId, buyer: username });
    if (started) router.push('/checkout/shipping');
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {note ? (
        <View style={[styles.toast, { top: insets.top + 8 }]}>
          <Text style={styles.toastText}>{note}</Text>
        </View>
      ) : null}
      <SimulatedStage>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={leave} style={styles.ghostBtn}>
            <Text style={styles.ghostLabel}>Leave</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/seller/[username]', params: { username: liveSession.host } })}
            style={styles.host}>
            <View style={styles.avatar} />
            <Text style={styles.hostName}>@{liveSession.host}</Text>
          </Pressable>
          <Pressable onPress={report} style={styles.ghostBtn}>
            <Text style={styles.ghostLabel}>Report</Text>
          </Pressable>
        </View>
        {connection === 'lost' ? (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Connection lost — reconnecting…</Text>
          </View>
        ) : liveSession.status === 'ended' || connection === 'ended' ? (
          <View style={styles.overlay}>
            <Text style={styles.endedTitle}>Session ended</Text>
            <Pressable onPress={leave} style={styles.endedBtn}>
              <Text style={styles.endedBtnLabel}>Back to Live Discovery</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.flex} />
        )}
        {liveSession.status !== 'ended' && connection !== 'ended' ? (
          <Pressable onPress={() => live.toggleConnection(liveSession.id)} style={styles.simBtn}>
            <Text style={styles.simLabel}>{connection === 'lost' ? 'Simulate: reconnected' : 'Simulate connection lost'}</Text>
          </Pressable>
        ) : null}
      </SimulatedStage>

      {pinned ? (
        <View style={styles.productBlock}>
          <View style={styles.productRow}>
            <AppImage source={getListingImage(pinned.id)} style={styles.productThumb} />
            <View style={styles.productMeta}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {pinned.title}
              </Text>
              <Text style={styles.productSub}>
                {pinned.condition}
                {pinned.size && pinned.size !== '—' ? ` · Size ${pinned.size}` : ''}
              </Text>
              <Text style={styles.productPrice}>{formatNaira(pinned.price)}</Text>
            </View>
            <StatusChip status={pinned.status} />
          </View>
          {pinned.status === 'available' ? (
            <View style={styles.productActions}>
              <Button
                label="Claim (~5 min)"
                variant="secondary"
                onPress={() => live.claimListing(liveSession.id, pinned.id, session.username)}
                style={styles.productAction}
              />
              <Button label="Buy now" onPress={goCheckout} style={styles.productAction} />
            </View>
          ) : claimedByMe ? (
            <View style={styles.productActions}>
              <View style={styles.claimBanner}>
                <Text style={styles.claimText}>Claimed — {formatCountdown(remaining)}</Text>
              </View>
              <Button label="Checkout" onPress={goCheckout} style={styles.productAction} />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.noPin}>
          <Text style={styles.noPinText}>No product currently pinned.</Text>
        </View>
      )}

      <View style={[styles.comments, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <ScrollView style={styles.commentList} contentContainerStyle={styles.commentListBody}>
          {comments.map((comment) => (
            <Text key={comment.id} style={styles.comment}>
              <Text style={styles.commentUser}>{comment.user}</Text> {comment.text}
            </Text>
          ))}
        </ScrollView>
        <View style={styles.composer}>
          <TextField
            placeholder="Add a comment..."
            value={draft}
            onChangeText={setDraft}
            style={styles.commentField}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable onPress={send} style={styles.send}>
            <Text style={styles.sendLabel}>Send</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StatusChip({ status }: { status: 'available' | 'reserved' | 'sold' | 'draft' | 'hidden' }) {
  const info = listingStatusStyle(status);
  return (
    <View style={[styles.statusChip, { backgroundColor: info.backgroundColor }]}>
      <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.neutral900,
  },
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Palette.text,
    borderRadius: 10,
  },
  toastText: {
    color: Palette.background,
    fontSize: 13,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  ghostBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  ghostLabel: {
    color: Palette.background,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
  },
  host: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#555',
  },
  hostName: {
    color: Palette.background,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
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
  endedTitle: {
    color: Palette.background,
    fontSize: 14,
  },
  endedBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Palette.background,
    justifyContent: 'center',
  },
  endedBtnLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
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
  productBlock: {
    backgroundColor: Palette.background,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  productMeta: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
  productSub: {
    fontSize: 11,
    color: Palette.muted2,
  },
  productPrice: {
    fontSize: 13,
    fontFamily: Typography.headingBold,
    color: Palette.accent700,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusLabel: {
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  productAction: {
    flex: 1,
    height: 44,
  },
  claimBanner: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#fdf3e3',
    borderWidth: 1,
    borderColor: '#ecd39a',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  claimText: {
    fontSize: 12,
    color: '#8a6112',
  },
  noPin: {
    backgroundColor: Palette.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  noPinText: {
    fontSize: 12,
    color: Palette.muted3,
    textAlign: 'center',
  },
  comments: {
    backgroundColor: Palette.background,
    maxHeight: 170,
  },
  commentList: {
    maxHeight: 110,
  },
  commentListBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  comment: {
    fontSize: 12,
    color: Palette.text,
    marginBottom: 6,
  },
  commentUser: {
    fontFamily: Typography.bodySemiBold,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  commentField: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  send: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: Palette.accent,
    justifyContent: 'center',
  },
  sendLabel: {
    color: Palette.background,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
  },
});
