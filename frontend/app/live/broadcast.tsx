import { ModeratorsSheet } from '@/components/live/moderators-sheet';
import {
  EndLiveDialog,
  LiveCommentActionsSheet,
  LiveCommentRow,
  LiveComposer,
  LiveConnectionOverlay,
  LiveHostCameraSwitch,
  LiveHostTopBar,
  LiveStage,
} from '@/components/live/live-stage';
import { FeaturedLiveCard } from '@/components/live/featured-live-card';
import type { PinnedProductVariant } from '@/components/live/pinned-product-card';
import { AppImage } from '@/components/ui/app-image';
import { SpinnerArcIcon } from '@/components/ui/icons';
import { Palette, Radius, Typography } from '@/constants/theme';
import type { LiveComment, LiveConnection, LiveMediaCredentials, LiveStreamProduct } from '@/data/types';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { MAX_LIVE_MODERATORS, useLive, useLiveClock } from '@/context/live-context';
import { getListingImageSource } from '@/data/images';
import { apiFetch, ApiError } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { stopLiveKitAudioSession } from '@/lib/livekit-native';
import { KeyboardSafeDock } from '@/components/ui/keyboard-safe';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function formatLiveDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Space reserved above the absolutely docked composer (input row + top padding). */
const COMPOSER_INPUT = 58;

export default function LiveBroadcastScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const keyboard = useKeyboardInset();
  const keyboardOpen = keyboard.height > 0;
  const dockClearance = COMPOSER_INPUT + sheetBottom;
  const now = useLiveClock();
  const { session } = useAuth();
  const { getListing } = useListings();
  const inbox = useInbox();
  const live = useLive();
  const [credentials, setCredentials] = useState<LiveMediaCredentials | null>(null);
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mediaErrorMessage, setMediaErrorMessage] = useState<string | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [modsOpen, setModsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [actionComment, setActionComment] = useState<LiveComment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [goingLive, setGoingLive] = useState(true);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalLeaveRef = useRef(false);
  const peakRef = useRef(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const broadcastId = live.activeBroadcastId;
  const liveSession = broadcastId
    ? live.getSession(broadcastId)
    : live.liveNow.find((item) => item.host === session?.username);

  const pinnedProduct = liveSession ? live.getPinnedProduct(liveSession.id) : undefined;

  const productVariant: PinnedProductVariant = useMemo(() => {
    if (!pinnedProduct) return 'available';
    const soldOut =
      pinnedProduct.soldCount >= pinnedProduct.stock ||
      (pinnedProduct.available <= 0 && pinnedProduct.reservedCount <= 0);
    if (soldOut) return 'sold';
    if (pinnedProduct.reservedCount > 0 && pinnedProduct.available <= 0) return 'reserved';
    return 'available';
  }, [pinnedProduct]);

  const subscribeSession = live.subscribeSession;
  const fetchLiveMedia = live.fetchLiveMedia;

  useEffect(() => {
    if (!liveSession?.id) return;
    return subscribeSession(liveSession.id);
  }, [subscribeSession, liveSession?.id]);

  useEffect(() => {
    void (async () => {
      try {
        if (!cameraPermission?.granted) await requestCameraPermission();
        if (!micPermission?.granted) await requestMicPermission();
      } catch {
        /* permission prompts are best-effort; LiveKit will surface failure */
      }
    })();
  }, [cameraPermission?.granted, micPermission?.granted, requestCameraPermission, requestMicPermission]);

  useEffect(() => {
    if (!liveSession?.id) return;
    let cancelled = false;
    setMediaStatus('loading');
    setMediaErrorMessage(null);
    fetchLiveMedia(liveSession.id)
      .then((creds) => {
        if (cancelled) return;
        setCredentials(creds);
        setMediaStatus('ready');
        if (creds.provider === 'simulated') {
          setNotice('Live media is in preview mode — camera and mic are not connected.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setCredentials(null);
        setMediaStatus('error');
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not start camera.';
        setMediaErrorMessage(message);
        setNotice(message);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchLiveMedia, liveSession?.id]);

  useEffect(() => {
    const timer = setTimeout(() => setGoingLive(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (live.roomNotice) setNotice(live.roomNotice);
  }, [live.roomNotice]);

  useEffect(() => {
    if (!liveSession) return;
    peakRef.current = Math.max(peakRef.current, liveSession.viewers ?? 0, liveSession.peakViewers ?? 0);
  }, [liveSession]);

  const finishWithSummary = useCallback(
    async (reason: 'host' | 'connection') => {
      if (!liveSession || ending) return;
      setEnding(true);
      intentionalLeaveRef.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      void stopLiveKitAudioSession();

      const startedMs = liveSession.startedAt
        ? new Date(liveSession.startedAt).getTime()
        : Date.now();
      const optimistic = {
        title: liveSession.title,
        durationMinutes: Math.max(1, Math.round((Date.now() - startedMs) / 60000)),
        peakViewers: peakRef.current,
        productsShown: liveSession.productsShown ?? 0,
        productsSold: 0,
      };

      try {
        const summary = await live.endLive(liveSession.id, {
          peakViewers: peakRef.current,
          reason,
        });
        router.replace({
          pathname: '/live/summary',
          params: {
            title: summary.title,
            durationMinutes: String(summary.durationMinutes),
            peakViewers: String(summary.peakViewers),
            productsShown: String(summary.productsShown),
            productsSold: String(summary.productsSold),
            reason,
          },
        });
      } catch {
        router.replace({
          pathname: '/live/summary',
          params: {
            title: optimistic.title,
            durationMinutes: String(optimistic.durationMinutes),
            peakViewers: String(optimistic.peakViewers),
            productsShown: String(optimistic.productsShown),
            productsSold: String(optimistic.productsSold),
            reason,
          },
        });
      } finally {
        setEnding(false);
        setEndOpen(false);
      }
    },
    [ending, live, liveSession, router],
  );

  const leaveStudio = useCallback(() => {
    intentionalLeaveRef.current = true;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    // Keep the session live; host can re-enter from My live sessions.
    router.replace('/live/my-sessions');
  }, [router]);

  const onConnectionChange = useCallback(
    (state: LiveConnection) => {
      if (intentionalLeaveRef.current || !liveSession) return;
      live.setConnection(liveSession.id, state);
      if (state === 'reconnecting' || state === 'lost') {
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          void finishWithSummary('connection');
        }, 20000);
      } else if (state === 'live') {
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      }
    },
    [finishWithSummary, live, liveSession],
  );

  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveStudio();
      return true;
    });
    return () => sub.remove();
  }, [leaveStudio]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!session.canHostLive) {
    return <Redirect href="/live/host-access" />;
  }
  if (!liveSession || liveSession.status !== 'live') {
    return <Redirect href="/(tabs)/live" />;
  }

  const connection = live.getConnection(liveSession.id);
  const comments = live.getComments(liveSession.id);
  const products = live.getProducts(liveSession.id);
  const moderators = live.getModerators(liveSession.id);
  const sessionId = liveSession.id;
  const suggestedMods = inbox
    .conversationsFor(session.username)
    .map((conv) => inbox.otherParticipant(conv, session.username))
    .filter(Boolean);

  const startedAt = liveSession.startedAt ? new Date(liveSession.startedAt).getTime() : now;
  const duration = formatLiveDuration(now - startedAt);
  const categoryLine = [liveSession.department, liveSession.category].filter(Boolean).join(' · ');

  function sendHostComment() {
    if (!commentDraft.trim() || !session) return;
    void live.sendComment(sessionId, session.username, commentDraft);
    setCommentDraft('');
  }

  async function reportComment(comment: LiveComment) {
    try {
      await apiFetch(`/live/sessions/${sessionId}/report`, {
        method: 'POST',
        body: JSON.stringify({ kind: 'user' }),
      });
      setNotice(`Reported @${comment.user}`);
    } catch {
      setNotice("We couldn't send that report.");
    }
    setTimeout(() => setNotice(null), 2200);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LiveStage
        credentials={credentials}
        isHost
        mediaStatus={mediaStatus}
        mediaErrorMessage={mediaErrorMessage}
        onConnectionChange={onConnectionChange}
      >
        <View style={[styles.topArea, { paddingTop: top + 8 }]}>
          <LiveHostTopBar
            viewers={liveSession.viewers ?? 0}
            duration={duration}
            sessionId={liveSession.id}
            onLeave={leaveStudio}
            onEnd={() => setEndOpen(true)}
            onModeration={() => setModsOpen(true)}
          />
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionTitle}>{liveSession.title}</Text>
            <Text style={styles.sessionSub}>
              {categoryLine || 'Live'} · hosting as {session.username}
            </Text>
          </View>

          {goingLive ? (
            <View style={styles.statusBanner}>
              <SpinnerArcIcon size={14} color={Palette.blush} />
              <Text style={styles.statusBannerText}>Going live...</Text>
            </View>
          ) : null}
          {!goingLive && (liveSession.viewers ?? 0) <= 1 ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerText}>
                No viewers yet — your live will appear in Live discovery.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.flex} pointerEvents="box-none">
          <View style={styles.leftRail} pointerEvents="box-none">
            <LiveHostCameraSwitch />
          </View>
        </View>

        <View
          style={[
            styles.commentsArea,
            keyboardOpen ? styles.commentsAreaKeyboard : null,
            keyboardOpen ? { marginBottom: dockClearance } : null,
          ]}
        >
          {comments.length === 0 ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerText}>
                No comments yet. Introduce your first product to get started.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.commentList} contentContainerStyle={styles.commentListBody}>
              {comments.map((comment) => (
                <LiveCommentRow
                  key={comment.id}
                  comment={comment}
                  isModerator={live.isModerator(sessionId, comment.user)}
                  showActions
                  onLongPress={() => setActionComment(comment)}
                  onRemove={() => {
                    void live.removeComment(sessionId, comment.id);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <LiveConnectionOverlay connection={connection} />

        {!keyboardOpen ? (
          <View style={[styles.productWrap, { marginBottom: dockClearance }]} pointerEvents="box-none">
            <FeaturedLiveCard
              title={pinnedProduct?.title}
              price={pinnedProduct ? formatNaira(pinnedProduct.livePrice) : undefined}
              listingId={pinnedProduct?.listingId}
              imageUri={pinnedProduct?.photoUrls?.[0]}
              variant={pinnedProduct ? productVariant : 'none'}
              itemCount={products.length}
              actionLabel="Change"
              onPress={() => setPickerOpen(true)}
              onBrowseCatalog={() => setPickerOpen(true)}
            />
          </View>
        ) : null}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <KeyboardSafeDock absolute style={styles.composerWrap}>
          <LiveComposer
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSend={sendHostComment}
            placeholder="Reply to your viewers..."
          />
        </KeyboardSafeDock>
      </LiveStage>

      <EndLiveDialog
        visible={endOpen}
        loading={ending}
        onCancel={() => setEndOpen(false)}
        onConfirm={() => void finishWithSummary('host')}
      />

      <LiveCommentActionsSheet
        visible={Boolean(actionComment)}
        comment={actionComment}
        onClose={() => setActionComment(null)}
        onRemove={() => {
          if (actionComment) {
            void live.removeComment(sessionId, actionComment.id);
            setActionComment(null);
          }
        }}
        onPin={() => setNotice('Comment pinned for moderators')}
        onMute={() => {
          if (actionComment) setNotice(`Muted @${actionComment.user}`);
          setTimeout(() => setNotice(null), 2200);
        }}
        onRemoveViewer={() => {
          if (actionComment) setNotice(`Removed @${actionComment.user} from live`);
          setTimeout(() => setNotice(null), 2200);
        }}
        onReport={() => {
          if (actionComment) void reportComment(actionComment);
        }}
      />

      <ProductPickerSheet
        visible={pickerOpen}
        products={products}
        getListing={getListing}
        onClose={() => setPickerOpen(false)}
        onPin={(productId) => {
          void live.pinProduct(sessionId, productId);
          setPickerOpen(false);
        }}
      />

      <ModeratorsSheet
        visible={modsOpen}
        title={`Moderators during the live · ${moderators.length} of ${MAX_LIVE_MODERATORS}`}
        copy="Moderators can remove and pin comments, mute or remove disruptive viewers, and report behaviour. They cannot pin or select products, change prices, manage claims or orders, see checkout or finance, edit seller settings, broadcast, or end the live."
        roleLabel="Active moderator"
        hostUsername={session.username}
        moderators={moderators}
        suggestions={suggestedMods}
        onClose={() => setModsOpen(false)}
        onAdd={(usernames) => live.addSessionModerators(sessionId, usernames)}
        onRemove={(username) => live.removeSessionModerator(sessionId, username)}
      />
    </View>
  );
}

function ProductPickerSheet({
  visible,
  products,
  getListing,
  onClose,
  onPin,
}: {
  visible: boolean;
  products: LiveStreamProduct[];
  getListing: (id: string) => { title?: string; photoUrls?: string[] } | undefined;
  onClose: () => void;
  onPin: (productId: string) => void;
}) {
  const { sheetBottom } = useScreenInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={[styles.sheetCard, { paddingBottom: sheetBottom }]} onStartShouldSetResponder={() => true}>
          <Text style={styles.sheetTitle}>Products in this live</Text>
          {products.map((product) => {
            const listing = getListing(product.listingId);
            const sold =
              product.soldCount >= product.stock ||
              (product.available <= 0 && product.reservedCount <= 0);
            const image = product.photoUrls?.[0] ?? listing?.photoUrls?.[0];
            return (
              <Pressable
                key={product.id}
                disabled={sold}
                onPress={() => onPin(product.id)}
                style={[styles.pickerRow, product.isPinned && styles.pickerRowOn, sold && styles.pickerRowSold]}
              >
                <AppImage
                  source={image ?? getListingImageSource({ id: product.listingId, photoUrls: listing?.photoUrls })}
                  style={styles.pickerThumb}
                />
                <View style={styles.pickerMeta}>
                  <Text style={[styles.pickerName, sold && styles.pickerNameSold]}>
                    {product.title ?? listing?.title ?? 'Item'}
                  </Text>
                  <Text style={styles.pickerSub}>
                    {sold
                      ? 'Sold in this live'
                      : `${formatNaira(product.livePrice)} · ${product.isPinned ? 'pinned now' : 'available'}`}
                  </Text>
                </View>
                {!sold && !product.isPinned ? <Text style={styles.pickerPin}>Pin</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.liveDark },
  flex: { flex: 1 },
  leftRail: {
    alignSelf: 'flex-start',
    paddingLeft: 16,
    paddingTop: 12,
  },
  topArea: {
    gap: 10,
    paddingHorizontal: 16,
  },
  sessionMeta: {
    paddingHorizontal: 0,
  },
  sessionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: Typography.display,
    color: Palette.ivory,
  },
  sessionSub: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.6)',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(27,17,19,0.72)',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  commentsArea: {
    maxHeight: 180,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  commentsAreaKeyboard: {
    maxHeight: 140,
  },
  commentList: { flexGrow: 0 },
  commentListBody: { gap: 10, paddingBottom: 8 },
  productWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  notice: {
    paddingHorizontal: 16,
    paddingTop: 6,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.blush,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: 'rgba(27,17,19,0.55)',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27,17,19,0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: Typography.display,
    color: Palette.espresso,
    marginBottom: 11,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 9,
  },
  pickerRowOn: {
    borderWidth: 2,
    borderColor: Palette.espresso,
  },
  pickerRowSold: {
    opacity: 0.55,
  },
  pickerThumb: {
    width: 36,
    height: 44,
    borderRadius: 4,
    backgroundColor: Palette.skeleton,
    overflow: 'hidden',
  },
  pickerMeta: {
    flex: 1,
  },
  pickerName: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  pickerNameSold: {
    color: Palette.muted,
  },
  pickerSub: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
    fontVariant: ['tabular-nums'],
  },
  pickerPin: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
});
