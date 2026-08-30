import {
  LiveCommentRow,
  LiveComposer,
  LiveConnectionOverlay,
  LiveHostChip,
  LiveStage,
  LiveViewerTopBar,
} from '@/components/live/live-stage';
import { PinnedProductCard, type PinnedProductVariant } from '@/components/live/pinned-product-card';
import { Palette } from '@/constants/theme';
import type { LiveKitCredentials } from '@/data/types';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { formatCountdown, formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [credentials, setCredentials] = useState<LiveKitCredentials | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const sessionId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!sessionId) return;
    return live.subscribeSession(sessionId);
  }, [live, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    live
      .fetchLiveKitToken(sessionId)
      .then(setCredentials)
      .catch(() => setCredentials(null));
  }, [live, sessionId]);

  useEffect(() => {
    if (live.roomNotice) setNote(live.roomNotice);
  }, [live.roomNotice]);

  const liveSession = sessionId ? live.getSession(sessionId) : undefined;

  const pinnedProduct = liveSession ? live.getPinnedProduct(liveSession.id) : undefined;
  const pinnedListing = pinnedProduct
    ? live.resolveListing(pinnedProduct.listingId)
    : live.resolveListing(liveSession?.pinnedListingId);
  const claim = liveSession ? live.getClaim(liveSession.id) : undefined;
  const hasActiveClaim = Boolean(
    claim && claim.status === 'active' && claim.productId === pinnedProduct?.id,
  );
  const claimedByMe = Boolean(hasActiveClaim && session?.username === claim?.username);
  const reservedByOther = Boolean(hasActiveClaim && !claimedByMe);
  const available = pinnedProduct?.available ?? 0;

  const productVariant: PinnedProductVariant = useMemo(() => {
    if (available <= 0) return 'sold';
    if (claimedByMe) return 'your_claim';
    if (reservedByOther) return 'reserved';
    return 'available';
  }, [available, claimedByMe, reservedByOther]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!liveSession) {
    return <Redirect href="/(tabs)/live" />;
  }

  const activeSession = liveSession;
  const connection = live.getConnection(activeSession.id);
  const comments = live.getComments(activeSession.id);
  const remaining = claim ? claim.expiresAt - live.now : 0;
  const username = session.username;

  function leave() {
    router.replace('/(tabs)/live');
  }

  function report() {
    setNote('Live session reported.');
    setTimeout(() => setNote(null), 2200);
  }

  function send() {
    void live.sendComment(activeSession.id, username, draft);
    setDraft('');
  }

  async function claimNow() {
    if (!pinnedProduct) return;
    setClaimError(null);
    try {
      await live.claimProduct(activeSession.id, pinnedProduct.id, 1);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    }
  }

  async function goCheckout() {
    if (!pinnedProduct) return;
    const started = await checkout.startCheckout({
      listingId: pinnedProduct.listingId,
      liveSessionId: activeSession.id,
      liveStreamProductId: pinnedProduct.id,
      claimId: claim?.id,
      buyer: username,
    });
    if (started) router.push('/checkout/shipping');
  }

  const subtitle = [
    pinnedListing?.size && pinnedListing.size !== '—' ? `Size ${pinnedListing.size}` : null,
    pinnedListing?.condition,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {note ? (
        <View style={[styles.toast, { top: insets.top + 8 }]}>
          <Text style={styles.toastText}>{note}</Text>
        </View>
      ) : null}
      <LiveStage
        credentials={credentials}
        isHost={false}
        onConnectionChange={(state) => live.setConnection(activeSession.id, state)}
      >
        <View style={[styles.topArea, { paddingTop: insets.top + 8 }]}>
          <LiveViewerTopBar
            viewers={activeSession.viewers}
            onClose={leave}
            onMore={report}
          />
          <LiveHostChip
            host={activeSession.host}
            subtitle={`${activeSession.title} · View profile`}
            onPress={() =>
              router.push({ pathname: '/seller/[username]', params: { username: activeSession.host } })
            }
          />
        </View>

        <View style={styles.flex} />

        <View style={styles.commentsArea}>
          <ScrollView style={styles.commentList} contentContainerStyle={styles.commentListBody}>
            {comments.map((comment) => (
              <LiveCommentRow
                key={comment.id}
                comment={comment}
                isModerator={live.isModerator(activeSession.id, comment.user)}
              />
            ))}
          </ScrollView>
        </View>

        <LiveConnectionOverlay
          connection={connection}
          onLeave={leave}
          onOpenProfile={() =>
            router.push({ pathname: '/seller/[username]', params: { username: activeSession.host } })
          }
          host={activeSession.host}
        />
      </LiveStage>

      {pinnedProduct ? (
        <View style={styles.productWrap}>
          <PinnedProductCard
            title={pinnedProduct.title ?? pinnedListing?.title ?? 'Product'}
            subtitle={subtitle || undefined}
            price={formatNaira(pinnedProduct.livePrice)}
            listingId={pinnedProduct.listingId}
            imageUri={pinnedProduct.photoUrls?.[0]}
            variant={productVariant}
            countdown={claimedByMe ? formatCountdown(remaining) : undefined}
            claimError={claimError}
            onClaim={claimNow}
            onBuyNow={claimNow}
            onCheckout={goCheckout}
          />
        </View>
      ) : null}

      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <LiveComposer value={draft} onChangeText={setDraft} onSend={send} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.liveDark },
  flex: { flex: 1 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(27,17,19,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toastText: { color: Palette.ivory, fontSize: 12 },
  topArea: {
    gap: 14,
    paddingHorizontal: 16,
  },
  commentsArea: {
    maxHeight: 180,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  commentList: { flexGrow: 0 },
  commentListBody: { gap: 10, paddingBottom: 8 },
  productWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
});
