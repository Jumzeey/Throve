import { ModeratorsSheet } from '@/components/live/moderators-sheet';
import {
  EndLiveDialog,
  LiveCommentActionsSheet,
  LiveCommentRow,
  LiveComposer,
  LiveConnectionOverlay,
  LiveHostTopBar,
  LiveStage,
} from '@/components/live/live-stage';
import { PinnedProductCard, type PinnedProductVariant } from '@/components/live/pinned-product-card';
import { Palette, Radius, Typography } from '@/constants/theme';
import type { LiveComment, LiveKitCredentials, LiveStreamProduct } from '@/data/types';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { MAX_LIVE_MODERATORS, useLive } from '@/context/live-context';
import { formatNaira } from '@/lib/format';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LiveBroadcastScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const { getListing } = useListings();
  const inbox = useInbox();
  const live = useLive();
  const [credentials, setCredentials] = useState<LiveKitCredentials | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [modsOpen, setModsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [actionComment, setActionComment] = useState<LiveComment | null>(null);

  const broadcastId = live.activeBroadcastId;
  const liveSession = broadcastId
    ? live.getSession(broadcastId)
    : live.liveNow.find((item) => item.host === session?.username);

  const pinnedProduct = liveSession ? live.getPinnedProduct(liveSession.id) : undefined;

  const productVariant: PinnedProductVariant = useMemo(() => {
    if (!pinnedProduct) return 'available';
    if (pinnedProduct.available <= 0) return 'sold';
    if (pinnedProduct.reservedCount > 0) return 'reserved';
    return 'available';
  }, [pinnedProduct]);

  useEffect(() => {
    if (!liveSession?.id) return;
    return live.subscribeSession(liveSession.id);
  }, [live, liveSession?.id]);

  useEffect(() => {
    if (!liveSession?.id) return;
    live
      .fetchLiveKitToken(liveSession.id)
      .then(setCredentials)
      .catch(() => setCredentials(null));
  }, [live, liveSession?.id]);

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
  const pinnedListing = pinnedProduct ? getListing(pinnedProduct.listingId) : undefined;

  const moderators = live.getModerators(liveSession.id);
  const sessionId = liveSession.id;
  const suggestedMods = inbox
    .conversationsFor(session.username)
    .map((conv) => inbox.otherParticipant(conv, session.username))
    .filter(Boolean);

  async function confirmEnd() {
    setEnding(true);
    try {
      await live.endLive(sessionId);
      router.replace('/(tabs)/live');
    } finally {
      setEnding(false);
      setEndOpen(false);
    }
  }

  function sendHostComment() {
    if (!commentDraft.trim() || !session) return;
    void live.sendComment(sessionId, session.username, commentDraft);
    setCommentDraft('');
  }

  function pinNextProduct() {
    if (!products.length) return;
    const currentIndex = products.findIndex((p) => p.isPinned);
    const next = products[(currentIndex + 1) % products.length];
    if (next) void live.pinProduct(sessionId, next.id);
  }

  const subtitle = pinnedListing
    ? [pinnedListing.size !== '—' ? pinnedListing.size : null, pinnedListing.condition].filter(Boolean).join(' · ')
    : undefined;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LiveStage
        credentials={credentials}
        isHost
        onConnectionChange={(state) => live.setConnection(liveSession.id, state)}
      >
        <View style={[styles.topArea, { paddingTop: top + 8 }]}>
          <LiveHostTopBar
            viewers={liveSession.viewers}
            onEnd={() => setEndOpen(true)}
            onModeration={() => setModsOpen(true)}
          />
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionTitle}>{liveSession.title}</Text>
            <Text style={styles.sessionSub}>
              {liveSession.department ?? 'Live'} · hosting as {session.username}
            </Text>
          </View>
        </View>

        <View style={styles.flex} />

        <View style={styles.commentsArea}>
          {comments.length === 0 ? (
            <Text style={styles.emptyComments}>No comments yet. Introduce your first product to get started.</Text>
          ) : (
            <ScrollView style={styles.commentList} contentContainerStyle={styles.commentListBody}>
              {comments.map((comment) => (
                <LiveCommentRow
                  key={comment.id}
                  comment={comment}
                  isModerator={live.isModerator(sessionId, comment.user)}
                  showActions
                  onLongPress={() => setActionComment(comment)}
                  onRemove={() => live.removeComment(sessionId, comment.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <LiveConnectionOverlay connection={connection} />

        {pinnedProduct ? (
          <View style={styles.productWrap} pointerEvents="box-none">
            <PinnedProductCard
              role="host"
              title={pinnedProduct.title ?? pinnedListing?.title ?? 'Product'}
              subtitle={subtitle}
              price={formatNaira(pinnedProduct.livePrice)}
              listingId={pinnedProduct.listingId}
              imageUri={pinnedProduct.photoUrls?.[0]}
              variant={productVariant}
              onChangeProduct={() => setPickerOpen(true)}
              onNextProduct={pinNextProduct}
            />
          </View>
        ) : null}

        {live.roomNotice ? <Text style={styles.notice}>{live.roomNotice}</Text> : null}

        <View style={[styles.composerWrap, { paddingBottom: sheetBottom }]}>
          <LiveComposer
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSend={sendHostComment}
            placeholder="Reply to your viewers…"
          />
        </View>
      </LiveStage>

      <EndLiveDialog
        visible={endOpen}
        loading={ending}
        onCancel={() => setEndOpen(false)}
        onConfirm={confirmEnd}
      />

      <LiveCommentActionsSheet
        visible={Boolean(actionComment)}
        comment={actionComment}
        onClose={() => setActionComment(null)}
        onRemove={() => {
          if (actionComment) live.removeComment(sessionId, actionComment.id);
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
        copy="Search, tap a person to add them, then Add. They help with comments only."
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
  getListing: (id: string) => { title?: string } | undefined;
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
            const sold = product.available <= 0;
            return (
              <Pressable
                key={product.id}
                disabled={sold}
                onPress={() => onPin(product.id)}
                style={[styles.pickerRow, product.isPinned && styles.pickerRowOn, sold && styles.pickerRowSold]}
              >
                <View style={styles.pickerThumb} />
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
  topArea: {
    gap: 12,
    paddingHorizontal: 16,
  },
  sessionMeta: {
    paddingHorizontal: 0,
  },
  sessionTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  sessionSub: {
    marginTop: 3,
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.6)',
  },
  commentsArea: {
    maxHeight: 180,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  commentList: { flexGrow: 0 },
  commentListBody: { gap: 10, paddingBottom: 8 },
  emptyComments: {
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.7)',
    paddingHorizontal: 4,
  },
  productWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
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
    borderWidth: 1.5,
    borderColor: Palette.plum,
  },
  pickerRowSold: {
    opacity: 0.7,
  },
  pickerThumb: {
    width: 36,
    height: 44,
    borderRadius: 4,
    backgroundColor: Palette.skeleton,
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
