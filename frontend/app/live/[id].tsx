import {
  LiveCommentRow,
  LiveComposer,
  LiveConnectionOverlay,
  LiveHostChip,
  LiveReportSheet,
  LiveStage,
  LiveViewerTopBar,
} from '@/components/live/live-stage';
import { PinnedProductCard, type PinnedProductVariant } from '@/components/live/pinned-product-card';
import { Palette, Typography } from '@/constants/theme';
import type { LiveConnection, LiveMediaCredentials } from '@/data/types';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useLive, useLiveClock } from '@/context/live-context';
import { apiFetch } from '@/lib/api';
import { formatCountdown, formatNaira } from '@/lib/format';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LiveViewerScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const keyboard = useKeyboardInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const live = useLive();
  const checkout = useCheckout();
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<LiveMediaCredentials | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const claimingRef = useRef(false);

  const sessionId = Array.isArray(id) ? id[0] : id;
  const liveSession = sessionId ? live.getSession(sessionId) : undefined;
  const heldSession = useRef(liveSession);
  if (liveSession) heldSession.current = liveSession;
  const viewSession = liveSession ?? heldSession.current;

  useEffect(() => {
    if (!sessionId || viewSession?.status === 'ended') return;
    return live.subscribeSession(sessionId);
  }, [live, sessionId, viewSession?.status]);

  useEffect(() => {
    if (!sessionId) return;
    if (viewSession?.status === 'ended') {
      setCredentials(null);
      return;
    }
    live
      .fetchLiveMedia(sessionId)
      .then(setCredentials)
      .catch(() => setCredentials(null));
  }, [live, sessionId, viewSession?.status]);

  useEffect(() => {
    if (live.roomNotice) setNote(live.roomNotice);
  }, [live.roomNotice]);

  const pinnedProduct = viewSession ? live.getPinnedProduct(viewSession.id) : undefined;
  const pinnedListing = pinnedProduct
    ? live.resolveListing(pinnedProduct.listingId)
    : live.resolveListing(viewSession?.pinnedListingId);
  const claim = viewSession ? live.getClaim(viewSession.id) : undefined;
  const hasActiveClaim = Boolean(
    claim && claim.status === 'active' && claim.productId === pinnedProduct?.id,
  );
  const claimedByMe = Boolean(hasActiveClaim && session?.username === claim?.username);
  const reservedCount = pinnedProduct?.reservedCount ?? 0;
  const soldCount = pinnedProduct?.soldCount ?? 0;
  const stock = pinnedProduct?.stock ?? 0;
  const available = pinnedProduct?.available ?? Math.max(0, stock - reservedCount - soldCount);

  const productVariant: PinnedProductVariant = useMemo(() => {
    if (!pinnedProduct) return 'available';
    const soldOut = soldCount >= stock || (available <= 0 && reservedCount <= 0);
    if (soldOut) return 'sold';
    if (claimedByMe) return 'your_claim';
    if (reservedCount > 0 && available <= 0) return 'reserved';
    return 'available';
  }, [available, claimedByMe, pinnedProduct, reservedCount, soldCount, stock]);

  const onConnectionChange = useCallback(
    (state: LiveConnection) => {
      if (sessionId) live.setConnection(sessionId, state);
    },
    [live.setConnection, sessionId],
  );

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!viewSession) {
    return <Redirect href="/(tabs)/live" />;
  }

  if (viewSession.status === 'ended') {
    return (
      <View style={[styles.screen, styles.endedScreen, { paddingTop: top + 24, paddingBottom: sheetBottom + 24 }]}>
        <StatusBar style="light" />
        <View style={styles.endedCard}>
          <View style={styles.endedTop}>
            <View style={styles.endedThumb} />
            <View style={styles.endedMeta}>
              <Text style={styles.endedTitle}>{viewSession.title}</Text>
              <Text style={styles.endedHost}>{viewSession.host}</Text>
            </View>
            <View style={styles.endedBadge}>
              <Text style={styles.endedBadgeText}>ENDED</Text>
            </View>
          </View>
          <View style={styles.endedWatchBtn}>
            <Text style={styles.endedWatchLabel}>Watch · unavailable</Text>
          </View>
          <Text style={styles.endedHint}>
            Ended sessions can't be entered. View the seller's profile instead.
          </Text>
        </View>
        <View style={styles.endedActions}>
          <Text
            style={styles.endedProfileLink}
            onPress={() =>
              router.push({ pathname: '/seller/[username]', params: { username: viewSession.host } })
            }
          >
            View seller profile
          </Text>
          <Text style={styles.endedBackLink} onPress={() => router.replace('/(tabs)/live')}>
            Back to Live
          </Text>
        </View>
      </View>
    );
  }

  const activeSession = viewSession;
  const connection = live.getConnection(activeSession.id);
  const comments = live.getComments(activeSession.id);
  const username = session.username;

  function leave() {
    router.replace('/(tabs)/live');
  }

  function openSeller() {
    router.push({ pathname: '/seller/[username]', params: { username: activeSession.host } });
  }

  async function submitReport(kind: 'session' | 'user' | 'listing') {
    if (kind === 'listing' && !pinnedProduct?.listingId) {
      setNote('No listing to report right now.');
      setTimeout(() => setNote(null), 2200);
      return;
    }
    try {
      await apiFetch(`/live/sessions/${activeSession.id}/report`, {
        method: 'POST',
        body: JSON.stringify({
          kind,
          listingId: kind === 'listing' ? pinnedProduct?.listingId ?? null : null,
        }),
      });
      setNote(
        kind === 'session'
          ? 'Live session reported.'
          : kind === 'user'
            ? 'User reported.'
            : 'Listing reported.',
      );
    } catch {
      setNote("We couldn't send that report. Try again.");
    }
    setTimeout(() => setNote(null), 2200);
  }

  function send() {
    void live.sendComment(activeSession.id, username, draft);
    setDraft('');
  }

  async function claimNow() {
    if (!pinnedProduct || claimingRef.current) return;
    claimingRef.current = true;
    setClaiming(true);
    setClaimError(null);
    try {
      await live.claimProduct(activeSession.id, pinnedProduct.id, 1);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }

  async function buyNow() {
    if (!pinnedProduct || claimingRef.current) return;
    claimingRef.current = true;
    setClaiming(true);
    setClaimError(null);
    try {
      const nextClaim = await live.claimProduct(activeSession.id, pinnedProduct.id, 1);
      await checkout.startCheckout({
        listingId: pinnedProduct.listingId,
        liveSessionId: activeSession.id,
        liveStreamProductId: pinnedProduct.id,
        claimId: nextClaim.id,
        buyer: username,
      });
      router.push('/checkout/shipping');
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }

  async function goCheckout() {
    if (!pinnedProduct) return;
    try {
      await checkout.startCheckout({
        listingId: pinnedProduct.listingId,
        liveSessionId: activeSession.id,
        liveStreamProductId: pinnedProduct.id,
        claimId: claim?.id,
        buyer: username,
      });
      router.push('/checkout/shipping');
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  const sizeLabel =
    pinnedProduct?.size && pinnedProduct.size !== '—'
      ? pinnedProduct.size
      : pinnedListing?.size && pinnedListing.size !== '—'
        ? pinnedListing.size
        : null;
  const conditionLabel = pinnedProduct?.condition ?? pinnedListing?.condition;
  const subtitle = [sizeLabel, conditionLabel].filter(Boolean).join(' · ');

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {note ? (
        <View style={[styles.toast, { top: top + 8 }]}>
          <Text style={styles.toastText}>{note}</Text>
        </View>
      ) : null}
      <LiveStage credentials={credentials} isHost={false} onConnectionChange={onConnectionChange}>
        <View style={[styles.topArea, { paddingTop: top + 8 }]}>
          <LiveViewerTopBar
            viewers={activeSession.viewers}
            onClose={leave}
            onMore={() => setReportOpen(true)}
          />
          <LiveHostChip
            host={activeSession.host}
            photoUrl={activeSession.hostPhotoUrl}
            subtitle={`${activeSession.title} · View profile`}
            onPress={openSeller}
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
                showActions={Boolean(
                  session?.username &&
                    (session.username === activeSession.host ||
                      live.isModerator(activeSession.id, session.username)),
                )}
                onRemove={() => {
                  void live.removeComment(activeSession.id, comment.id);
                }}
              />
            ))}
          </ScrollView>
        </View>

        <LiveConnectionOverlay
          connection={connection}
          onLeave={leave}
          onOpenProfile={openSeller}
          host={activeSession.host}
        />

        {pinnedProduct ? (
          <View style={styles.productWrap} pointerEvents="box-none">
            <LiveClaimCard
              title={pinnedProduct.title ?? pinnedListing?.title ?? 'Product'}
              subtitle={subtitle || undefined}
              price={formatNaira(pinnedProduct.livePrice)}
              listingId={pinnedProduct.listingId}
              imageUri={pinnedProduct.photoUrls?.[0]}
              variant={productVariant}
              expiresAt={claim?.expiresAt}
              claimedByMe={claimedByMe}
              claimError={claimError}
              claiming={claiming}
              onClaim={claimNow}
              onBuyNow={buyNow}
              onCheckout={goCheckout}
            />
          </View>
        ) : null}

        <View style={[styles.composerWrap, { paddingBottom: keyboard.height > 0 ? keyboard.height : sheetBottom }]}>
          <LiveComposer value={draft} onChangeText={setDraft} onSend={send} placeholder="Add a comment..." />
        </View>
      </LiveStage>

      <LiveReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onReportSession={() => void submitReport('session')}
        onReportUser={() => void submitReport('user')}
        onReportListing={() => void submitReport('listing')}
        onLeave={leave}
      />
    </View>
  );
}

function LiveClaimCard({
  expiresAt,
  claimedByMe,
  ...props
}: {
  title: string;
  subtitle?: string;
  price: string;
  listingId?: string;
  imageUri?: string;
  variant: PinnedProductVariant;
  expiresAt?: number;
  claimedByMe: boolean;
  claimError: string | null;
  claiming: boolean;
  onClaim: () => void;
  onBuyNow: () => void;
  onCheckout: () => void;
}) {
  const now = useLiveClock();
  const countdown = claimedByMe && expiresAt ? formatCountdown(expiresAt - now) : undefined;
  return <PinnedProductCard {...props} countdown={countdown} />;
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
  endedScreen: {
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  endedCard: {
    backgroundColor: Palette.liveDarkAlt,
    borderRadius: 16,
    padding: 14,
  },
  endedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  endedThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#463038',
  },
  endedMeta: {
    flex: 1,
    minWidth: 0,
  },
  endedTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  endedHost: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.6)',
  },
  endedBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.28)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  endedBadgeText: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: 'rgba(255,247,240,0.6)',
  },
  endedWatchBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.22)',
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
  },
  endedWatchLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: 'rgba(255,247,240,0.38)',
  },
  endedHint: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.55)',
  },
  endedActions: {
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  endedProfileLink: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  endedBackLink: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.6)',
  },
});
