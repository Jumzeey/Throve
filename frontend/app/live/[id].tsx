import {
  LiveComposer,
  LiveConnectionOverlay,
  LiveReportSheet,
  LiveStage,
} from '@/components/live/live-stage';
import { FeaturedLiveCard } from '@/components/live/featured-live-card';
import { LiveCatalogSheet, liveProductVariant } from '@/components/live/live-catalog-sheet';
import { LiveListingDrawer } from '@/components/live/live-listing-drawer';
import { LiveWatchersSheet } from '@/components/live/watchers-sheet';
import type { PinnedProductVariant } from '@/components/live/pinned-product-card';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { ModeratorBadge } from '@/components/ui/status-chip';
import {
  BagIcon,
  ChevronBackIcon,
  HeartIcon,
  MoreHorizontalIcon,
  ShareIcon,
  UserIcon,
} from '@/components/ui/icons';
import { Palette, Typography } from '@/constants/theme';
import type { LiveConnection, LiveMediaCredentials, LiveStreamProduct } from '@/data/types';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { openNativeShare } from '@/lib/share-listing';
import { KeyboardSafeDock } from '@/components/ui/keyboard-safe';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SIDE_INSET = 14;

export default function LiveViewerScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const keyboard = useKeyboardInset();
  const keyboardOpen = keyboard.height > 0;
  const dockClearance = 58 + Math.max(sheetBottom, 22);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const live = useLive();
  const checkout = useCheckout();

  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<LiveMediaCredentials | null>(null);
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mediaErrorMessage, setMediaErrorMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [watchersOpen, setWatchersOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<LiveStreamProduct | null>(null);
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const claimingRef = useRef(false);

  const sessionId = Array.isArray(id) ? id[0] : id;
  const liveSession = sessionId ? live.getSession(sessionId) : undefined;
  const heldSession = useRef(liveSession);
  if (liveSession) heldSession.current = liveSession;
  const viewSession = liveSession ?? heldSession.current;

  const subscribeSession = live.subscribeSession;
  const fetchLiveMedia = live.fetchLiveMedia;
  const shortScreen = Dimensions.get('window').height < 720;
  const maxComments = shortScreen ? 2 : 3;

  useEffect(() => {
    if (!sessionId || viewSession?.status === 'ended') return;
    return subscribeSession(sessionId);
  }, [subscribeSession, sessionId, viewSession?.status]);

  useEffect(() => {
    if (!sessionId) return;
    if (viewSession?.status === 'ended') {
      setCredentials(null);
      setMediaStatus('error');
      setMediaErrorMessage('This live has ended.');
      return;
    }
    let cancelled = false;
    setMediaStatus('loading');
    setMediaErrorMessage(null);
    fetchLiveMedia(sessionId)
      .then((creds) => {
        if (cancelled) return;
        setCredentials(creds);
        setMediaStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setCredentials(null);
        setMediaStatus('error');
        setMediaErrorMessage(err instanceof Error ? err.message : 'Could not join stream.');
      });
    return () => {
      cancelled = true;
    };
  }, [fetchLiveMedia, sessionId, viewSession?.status]);

  useEffect(() => {
    if (live.roomNotice) setNote(live.roomNotice);
  }, [live.roomNotice]);

  useEffect(() => {
    if (keyboardOpen) {
      setCatalogOpen(false);
      setListingOpen(false);
      setReportOpen(false);
      setWatchersOpen(false);
    }
  }, [keyboardOpen]);

  useEffect(() => {
    const host = viewSession?.host;
    if (!host || host === session?.username) return;
    let cancelled = false;
    void (async () => {
      try {
        const profile = await apiFetch<{ isFollowing?: boolean }>(
          `/profiles/${encodeURIComponent(host)}/public`,
        );
        if (!cancelled) setIsFollowing(Boolean(profile.isFollowing));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.username, viewSession?.host]);

  const pinnedProduct = viewSession ? live.getPinnedProduct(viewSession.id) : undefined;
  const products = viewSession ? live.getProducts(viewSession.id) : [];
  const claim = viewSession ? live.getClaim(viewSession.id) : undefined;
  const hasActiveClaim = Boolean(
    claim && claim.status === 'active' && claim.productId === pinnedProduct?.id,
  );
  const claimedByMe = Boolean(hasActiveClaim && session?.username === claim?.username);

  const productVariant: PinnedProductVariant | 'none' = useMemo(() => {
    if (!pinnedProduct) return 'none';
    return liveProductVariant(pinnedProduct, claimedByMe);
  }, [claimedByMe, pinnedProduct]);

  const drawerVariant: PinnedProductVariant = useMemo(() => {
    if (!drawerProduct) return 'available';
    const mine = Boolean(
      claim &&
        claim.status === 'active' &&
        claim.productId === drawerProduct.id &&
        session?.username === claim.username,
    );
    return liveProductVariant(drawerProduct, mine);
  }, [claim, drawerProduct, session?.username]);

  const drawerListing = drawerProduct ? live.resolveListing(drawerProduct.listingId) : null;
  const comments = viewSession ? live.getComments(viewSession.id) : [];
  const visibleComments = comments.slice(-maxComments);

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
            Ended sessions can&apos;t be entered. View the seller&apos;s profile instead.
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
  const username = session.username;
  const isOwnLive = username === activeSession.host;

  function leave() {
    router.replace('/(tabs)/live');
  }

  function openSeller() {
    router.push({ pathname: '/seller/[username]', params: { username: activeSession.host } });
  }

  function openListing(product: LiveStreamProduct) {
    setDrawerProduct(product);
    setCatalogOpen(false);
    setListingOpen(true);
  }

  function openFeatured() {
    if (pinnedProduct) openListing(pinnedProduct);
    else setCatalogOpen(true);
  }

  async function toggleFollow() {
    if (isOwnLive || followBusy) return;
    setFollowBusy(true);
    try {
      const result = await apiFetch<{ isFollowing: boolean }>(
        `/profiles/${encodeURIComponent(activeSession.host)}/follow`,
        { method: isFollowing ? 'DELETE' : 'POST' },
      );
      setIsFollowing(result.isFollowing);
      setNote(result.isFollowing ? `You're following ${activeSession.host}` : `Unfollowed ${activeSession.host}`);
      setTimeout(() => setNote(null), 1800);
    } catch {
      setNote("Couldn't update follow. Try again.");
      setTimeout(() => setNote(null), 1800);
    } finally {
      setFollowBusy(false);
    }
  }

  async function shareLive() {
    const featured = pinnedProduct ?? products[0];
    if (featured?.listingId) {
      await openNativeShare({
        id: featured.listingId,
        title: featured.title ?? activeSession.title,
        price: featured.livePrice,
      });
      return;
    }
    await Share.share({
      message: `Watch ${activeSession.host} live on Throve: ${activeSession.title}`,
      title: activeSession.title,
    });
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

  async function claimProduct(product: LiveStreamProduct) {
    if (claimingRef.current) return;
    claimingRef.current = true;
    setClaiming(true);
    setClaimError(null);
    try {
      await live.claimProduct(activeSession.id, product.id, 1);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }

  async function buyNowProduct(product: LiveStreamProduct) {
    if (claimingRef.current) return;
    claimingRef.current = true;
    setClaiming(true);
    setClaimError(null);
    try {
      const nextClaim = await live.claimProduct(activeSession.id, product.id, 1);
      await checkout.startCheckout({
        listingId: product.listingId,
        liveSessionId: activeSession.id,
        liveStreamProductId: product.id,
        claimId: nextClaim.id,
        buyer: username,
      });
      setListingOpen(false);
      router.push('/checkout/shipping');
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }

  async function goCheckout(product: LiveStreamProduct) {
    try {
      await checkout.startCheckout({
        listingId: product.listingId,
        liveSessionId: activeSession.id,
        liveStreamProductId: product.id,
        claimId: claim?.id,
        buyer: username,
      });
      setListingOpen(false);
      router.push('/checkout/shipping');
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {note ? (
        <View style={[styles.toast, { top: top + 8 }]}>
          <Text style={styles.toastText}>{note}</Text>
        </View>
      ) : null}
      <LiveStage
        credentials={credentials}
        isHost={false}
        mediaStatus={mediaStatus}
        mediaErrorMessage={mediaErrorMessage}
        onConnectionChange={onConnectionChange}
      >
        <View style={[styles.topArea, { paddingTop: top + 8 }]}>
          <Pressable onPress={leave} style={styles.iconBtn} accessibilityLabel="Back">
            <ChevronBackIcon size={17} color={Palette.ivory} strokeWidth={1.9} />
          </Pressable>

          <Pressable style={styles.hostPill} accessibilityLabel="Host profile">
            <Pressable onPress={openSeller} style={styles.hostPress} accessibilityLabel="Open seller">
              <ProfileAvatar
                uri={activeSession.hostPhotoUrl}
                username={activeSession.host}
                style={styles.hostAvatar}
              />
              <View style={styles.hostMeta}>
                <Text style={styles.hostName} numberOfLines={1}>
                  {activeSession.host}
                </Text>
                <View style={styles.hostStatusRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveLabel}>LIVE</Text>
                </View>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setWatchersOpen(true)}
              hitSlop={6}
              accessibilityLabel="Viewers"
              style={styles.viewersPress}
            >
              <Text style={styles.viewersLabel}>
                · {activeSession.viewers ?? 0} viewer{(activeSession.viewers ?? 0) === 1 ? '' : 's'}
              </Text>
            </Pressable>
          </Pressable>

          {!isOwnLive ? (
            <Pressable
              onPress={() => void toggleFollow()}
              style={[styles.followBtn, isFollowing && styles.followBtnOn]}
              disabled={followBusy}
              accessibilityLabel={isFollowing ? 'Following' : 'Follow'}
            >
              <Text style={[styles.followLabel, isFollowing && styles.followLabelOn]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.topSpacer} />

          <Pressable onPress={() => setReportOpen(true)} style={styles.iconBtn} accessibilityLabel="More">
            <MoreHorizontalIcon />
          </Pressable>
        </View>

        <View style={styles.flex} />

        {!keyboardOpen ? (
          <View style={[styles.rail, { bottom: dockClearance + 118 }]} pointerEvents="box-none">
            <Pressable
              onPress={() => setLiked((v) => !v)}
              style={styles.railBtn}
              accessibilityLabel={liked ? 'Unlike' : 'Like'}
            >
              <HeartIcon size={20} color="#FFD3DE" filled={liked} />
            </Pressable>
            <Pressable
              onPress={() => setCatalogOpen(true)}
              style={styles.railBtn}
              accessibilityLabel="Items in this live"
            >
              <BagIcon size={19} color={Palette.ivory} />
              {products.length > 0 ? (
                <View style={styles.railBadge}>
                  <Text style={styles.railBadgeText}>{products.length > 99 ? '99+' : products.length}</Text>
                </View>
              ) : null}
            </Pressable>
            <Text style={styles.railCaption}>Items</Text>
            <Pressable onPress={() => void shareLive()} style={styles.railBtn} accessibilityLabel="Share">
              <ShareIcon size={18} color={Palette.ivory} />
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.bottomStack,
            { marginBottom: dockClearance, paddingHorizontal: SIDE_INSET },
            keyboardOpen ? styles.bottomStackKeyboard : null,
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.chatColumn} pointerEvents="box-none">
            {visibleComments.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>Be the first to say something</Text>
              </View>
            ) : (
              visibleComments.map((comment, index) => {
                const age = visibleComments.length - 1 - index;
                const opacity = age === 0 ? 1 : age === 1 ? 0.78 : 0.42;
                return (
                  <View key={comment.id} style={[styles.commentRow, { opacity }]}>
                    <View style={styles.commentAvatar}>
                      <UserIcon size={12} color={Palette.muted3} />
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentText}>
                        <Text style={styles.commentUser}>{comment.user} </Text>
                        {comment.text}
                      </Text>
                      {live.isModerator(activeSession.id, comment.user) ? (
                        <View style={styles.modWrap}>
                          <ModeratorBadge />
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {!keyboardOpen ? (
            <FeaturedLiveCard
              title={pinnedProduct?.title}
              price={pinnedProduct ? formatNaira(pinnedProduct.livePrice) : undefined}
              listingId={pinnedProduct?.listingId}
              imageUri={pinnedProduct?.photoUrls?.[0]}
              variant={productVariant}
              itemCount={products.length}
              onPress={openFeatured}
              onBrowseCatalog={() => setCatalogOpen(true)}
            />
          ) : null}
        </View>

        <LiveConnectionOverlay
          connection={connection}
          onLeave={leave}
          onOpenProfile={openSeller}
          host={activeSession.host}
        />

        <KeyboardSafeDock absolute gap={16} style={styles.composerWrap}>
          <LiveComposer
            value={draft}
            onChangeText={setDraft}
            onSend={send}
            placeholder={visibleComments.length === 0 ? 'Be the first to say something' : 'Say something…'}
          />
        </KeyboardSafeDock>
      </LiveStage>

      <LiveReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onReportSession={() => void submitReport('session')}
        onReportUser={() => void submitReport('user')}
        onReportListing={() => void submitReport('listing')}
        onLeave={leave}
      />

      <LiveWatchersSheet
        visible={watchersOpen}
        sessionId={activeSession.id}
        onClose={() => setWatchersOpen(false)}
      />

      <LiveCatalogSheet
        visible={catalogOpen}
        products={products}
        pinnedProductId={pinnedProduct?.id}
        claimedProductId={claim?.status === 'active' ? claim.productId : null}
        onClose={() => setCatalogOpen(false)}
        onSelect={openListing}
      />

      <LiveListingDrawer
        visible={listingOpen}
        product={drawerProduct}
        listing={drawerListing}
        variant={drawerVariant}
        claimExpiresAt={
          claim?.status === 'active' && claim.productId === drawerProduct?.id ? claim.expiresAt : undefined
        }
        claiming={claiming}
        claimError={claimError}
        featuredInLive={drawerProduct?.id === pinnedProduct?.id}
        remainingCatalogCount={Math.max(0, products.length - (drawerProduct ? 1 : 0))}
        signedIn={Boolean(session)}
        onClose={() => {
          setListingOpen(false);
          setClaimError(null);
        }}
        onAddToCart={() => {
          if (drawerProduct) void claimProduct(drawerProduct);
        }}
        onBuyNow={() => {
          if (drawerProduct) void buyNowProduct(drawerProduct);
        }}
        onCheckout={() => {
          if (drawerProduct) void goCheckout(drawerProduct);
        }}
        onBrowseCatalog={() => {
          setListingOpen(false);
          setCatalogOpen(true);
        }}
        onSignIn={() => router.push('/(auth)/welcome')}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: SIDE_INSET,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(20,12,14,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,12,14,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.16)',
    borderRadius: 24,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    maxWidth: 200,
    minWidth: 0,
  },
  hostPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  viewersPress: {
    paddingVertical: 4,
  },
  hostAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  hostMeta: {
    minWidth: 0,
    flexShrink: 1,
  },
  hostName: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  hostStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E8503C',
  },
  liveLabel: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 1,
    color: '#FFD9D2',
  },
  viewersLabel: {
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: '#F0E2DA',
  },
  followBtn: {
    minHeight: 30,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnOn: {
    backgroundColor: 'rgba(20,12,14,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.22)',
  },
  followLabel: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  followLabelOn: {
    color: 'rgba(255,247,240,0.82)',
  },
  topSpacer: { flex: 1 },
  rail: {
    position: 'absolute',
    right: SIDE_INSET,
    alignItems: 'center',
    gap: 10,
    zIndex: 4,
  },
  railBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,12,14,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: Palette.plum,
    borderWidth: 1.5,
    borderColor: Palette.liveDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBadgeText: {
    fontSize: 10,
    fontFamily: Typography.bodyBold,
    color: Palette.ivory,
  },
  railCaption: {
    marginTop: -6,
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  bottomStack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  bottomStackKeyboard: {
    marginBottom: 8,
  },
  chatColumn: {
    flex: 1,
    minWidth: 0,
    maxWidth: 214,
    gap: 6,
  },
  emptyChat: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20,12,14,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyChatText: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: '#F0E6DE',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  commentAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D9CCC2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBubble: {
    flexShrink: 1,
    backgroundColor: 'rgba(20,12,14,0.82)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modWrap: {
    marginTop: 4,
  },
  commentUser: {
    fontFamily: Typography.bodyBold,
    color: '#F6C77E',
  },
  commentText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  composerWrap: {
    paddingHorizontal: SIDE_INSET,
    paddingTop: 12,
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
