import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import {
  CheckIcon,
  ChevronBackIcon,
  CloseIcon,
  ImagePlaceholderIcon,
  MoreHorizontalIcon,
  ProhibitedIcon,
  SendIcon,
  SpinnerArcIcon,
  TicketIcon,
} from '@/components/ui/icons';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getListingImageSource } from '@/data/images';
import type { ChatMessage, Offer } from '@/data/types';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { ApiError } from '@/lib/api';
import { pickChatImage, uploadChatImage } from '@/lib/chat-media';
import { chatDayLabel, formatChatClock, formatNaira } from '@/lib/format';
import { effectiveOfferStatus, formatOfferCountdown, offerChipVariant } from '@/lib/offer-display';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

type FailedLocal = {
  localId: string;
  text: string;
  imageUri: string | null;
};

type ReportTarget = {
  messageId: string;
  text: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const { top, bottom, sheetBottom } = useScreenInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboard = useKeyboardInset();
  const keyboardBottom = keyboard.height;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, publicProfiles, ensurePublicProfile } = useAuth();
  const inbox = useInbox();
  const { markRead, offersOnListing } = inbox;
  const { getListing } = useListings();
  const { isConnected } = useNetworkStatus();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const sendingRef = useRef(false);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportDone, setReportDone] = useState(false);
  const [failed, setFailed] = useState<FailedLocal[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [now, setNow] = useState(Date.now());

  const username = session?.username ?? '';
  const conv = id ? inbox.getConversation(id) : undefined;
  const thread = conv ? inbox.messages(conv.id) : [];
  const me = username;
  const other = conv && me ? inbox.otherParticipant(conv, me) : '';
  const listing = conv ? getListing(conv.listingId) : undefined;
  const blocked = other ? inbox.isBlocked(other) : false;
  const sellerLocked = Boolean(
    listing && me && me === listing.seller && other && !inbox.canSellerMessage(conv!.listingId, other, me),
  );
  const canSend = Boolean(session && isConnected && !blocked && !sellerLocked && conv);
  const avatarUri = other ? publicProfiles[other]?.photoUri : undefined;

  const activeOffer = useMemo(() => {
    if (!conv || !me || !other) return undefined;
    const offers = offersOnListing(conv.listingId).filter(
      (offer) =>
        (offer.buyer === me || offer.seller === me) && (offer.buyer === other || offer.seller === other),
    );
    const actionable = offers.filter((offer) => {
      const status = effectiveOfferStatus(offer);
      return status === 'pending' || status === 'accepted';
    });
    return actionable.sort((a, b) => b.createdAt - a.createdAt)[0] as Offer | undefined;
  }, [conv, me, offersOnListing, other]);

  const dayGroups = useMemo(() => {
    const groups: { label: string; items: ChatMessage[] }[] = [];
    for (const message of thread) {
      const label = chatDayLabel(message.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, items: [message] });
      else last.items.push(message);
    }
    return groups;
  }, [thread]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!username || !id) return;
    void markRead(id, username).catch((err) => {
      if (err instanceof ApiError && err.status === 403) setAccessDenied(true);
    });
  }, [id, markRead, username]);

  useEffect(() => {
    if (!reportDone) return;
    const timer = setTimeout(() => setReportDone(false), 3200);
    return () => clearTimeout(timer);
  }, [reportDone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [id, keyboardBottom, thread.length, pendingImage, failed.length]);

  useEffect(() => {
    if (!other) return;
    void ensurePublicProfile(other).catch(() => undefined);
  }, [ensurePublicProfile, other]);

  const sendPayload = useCallback(
    async (text: string, localImage: string | null, failedId?: string) => {
      if (!conv || !me || sendingRef.current || !isConnected) return;

      sendingRef.current = true;
      setSending(true);
      if (failedId) setFailed((current) => current.filter((item) => item.localId !== failedId));
      else {
        setDraft('');
        setPendingImage(null);
      }

      try {
        let imageUrl: string | null = null;
        if (localImage) imageUrl = await uploadChatImage(localImage);
        const ok = await inbox.sendMessage(conv.id, me, text, imageUrl);
        if (!ok) throw new Error('Message was not sent.');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
        inputRef.current?.focus();
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setAccessDenied(true);
          return;
        }
        setFailed((current) => [
          ...current.filter((item) => item.localId !== failedId),
          { localId: failedId ?? `fail-${Date.now()}`, text, imageUri: localImage },
        ]);
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [conv, inbox, isConnected, me],
  );

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (accessDenied || (id && !conv) || (conv && !conv.participants.includes(session.username))) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(top, 14) }]}>
        <View style={styles.deniedWrap}>
          <Text style={styles.deniedTitle}>This conversation isn't available</Text>
          <Text style={styles.deniedBody}>You no longer have access to it. No message history is shown.</Text>
          <Button label="Back to Inbox" variant="secondary" onPress={() => router.replace('/(tabs)/inbox')} />
        </View>
      </View>
    );
  }

  const conversation = conv!;
  const composerPad =
    Platform.OS === 'android' && keyboard.height > 0
      ? Math.max(0, windowHeight - keyboard.screenY) + 24
      : Math.max(bottom, 12);
  const hasPayload = Boolean(draft.trim() || pendingImage);
  const sendDisabled = !canSend || !hasPayload || sending;
  const listingStatus = (listing?.status ?? 'available') as ListingChipVariant;
  const listingPurchaseClosed =
    listingStatus === 'reserved' || listingStatus === 'sold' || listingStatus === 'removed';
  const offerStatus = activeOffer ? effectiveOfferStatus(activeOffer) : null;
  const offerCountdown = activeOffer ? formatOfferCountdown(activeOffer.expiresAt, now) : null;
  const offerChip =
    activeOffer && offerStatus ? offerChipVariant(activeOffer, activeOffer.buyer === me, offerStatus) : null;

  function deliveryLabel(message: ChatMessage) {
    if (message.from !== me) return null;
    const laterFromThem = thread.some((item) => item.from !== me && item.createdAt > message.createdAt);
    return laterFromThem ? 'Read' : 'Sent';
  }

  async function send() {
    if (sendDisabled || sendingRef.current) return;
    const text = draft.trim();
    const localImage = pendingImage;
    if (!text && !localImage) return;
    await sendPayload(text, localImage);
  }

  async function onAttachImage() {
    if (!canSend || sending) return;
    const picked = await pickChatImage();
    if (!picked || 'error' in picked) return;
    setPendingImage(picked.uri);
  }

  async function submitReport() {
    if (!reportTarget) return;
    try {
      await inbox.reportChat({
        kind: 'message',
        targetUsername: other,
        conversationId: conversation.id,
        messageId: reportTarget.messageId,
      });
      setReportTarget(null);
      setReportDone(true);
    } catch {
      setReportTarget(null);
    }
  }

  async function submitUserReport() {
    setMenuOpen(false);
    try {
      await inbox.reportChat({
        kind: 'user',
        targetUsername: other,
        conversationId: conversation.id,
      });
      setReportDone(true);
    } catch {
      /* keep silent */
    }
  }

  async function confirmBlock() {
    setBlockConfirm(false);
    await inbox.toggleBlock(other);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(top, 14) }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ChevronBackIcon />
        </Pressable>
        <ProfileAvatar uri={avatarUri} username={other} style={styles.avatar} />
        <Pressable
          style={styles.headerMeta}
          onPress={() => router.push({ pathname: '/seller/[username]', params: { username: other } })}>
          <Text style={styles.name}>{other}</Text>
          <Text style={styles.viewProfile}>View profile</Text>
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
          <MoreHorizontalIcon size={18} color={Palette.espresso} />
        </Pressable>
      </View>

      <View style={styles.context}>
        {listing ? (
          <Pressable onPress={() => router.push(`/product/${listing.id}`)} style={styles.listingCard}>
            <AppImage source={getListingImageSource(listing)} style={styles.listingThumb} />
            <View style={styles.listingMeta}>
              <Text style={styles.listingTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              <View style={styles.listingPriceRow}>
                <Text
                  style={[
                    styles.listingPrice,
                    listingStatus === 'sold' || listingStatus === 'removed' ? styles.listingPriceStruck : null,
                  ]}>
                  {formatNaira(listing.price)}
                </Text>
                <StatusChip kind="listing" variant={listingStatus} showDot={false} />
              </View>
            </View>
            <Text style={styles.viewLink}>View</Text>
          </Pressable>
        ) : null}
        {listingPurchaseClosed ? (
          <Text style={styles.listingNote}>
            No purchase action is offered from a Reserved, Sold or removed listing reference.
          </Text>
        ) : null}
        {activeOffer && offerStatus && offerChip ? (
          <Pressable onPress={() => router.push(`/inbox/offer/${activeOffer.id}`)} style={styles.offerBanner}>
            <TicketIcon />
            <Text style={styles.offerCopy} numberOfLines={2}>
              {`Offer ${formatNaira(activeOffer.amount)} · `}
              <Text style={styles.offerStatus}>{offerChip.toUpperCase()}</Text>
              {offerCountdown && offerStatus === 'pending' ? ` · expires in ${offerCountdown}` : ''}
            </Text>
            <Text style={styles.viewLink}>Open</Text>
          </Pressable>
        ) : null}
      </View>

      {!isConnected ? (
        <View style={styles.offlinePad}>
          <OfflineBanner title="No connection" message="Reconnect to send messages." />
        </View>
      ) : null}
      {reportDone ? (
        <View style={styles.reportBanner}>
          <CheckIcon color={Palette.success} />
          <View style={styles.reportCopy}>
            <Text style={styles.reportTitle}>Report submitted</Text>
            <Text style={styles.reportBody}>Thank you — Throve will review it. The message stays in your history.</Text>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {thread.length === 0 && failed.length === 0 ? (
            <Text style={styles.threadEmpty}>Say hello — keep it about the listing.</Text>
          ) : (
            dayGroups.map((group) => (
              <View key={group.label} style={styles.dayGroup}>
                <Text style={styles.dayLabel}>{group.label}</Text>
                {group.items.map((message) => {
                  const mine = message.from === me;
                  const delivery = deliveryLabel(message);
                  return (
                    <Pressable
                      key={message.id}
                      onLongPress={() => {
                        if (mine || !message.text) return;
                        setReportTarget({ messageId: message.id, text: message.text });
                      }}
                      delayLongPress={380}
                      style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                        {message.imageUrl ? (
                          <Pressable
                            onPress={() => setViewerUri(message.imageUrl!)}
                            accessibilityRole="imagebutton"
                            accessibilityLabel="View photo">
                            <AppImage source={message.imageUrl} style={styles.bubbleImage} />
                          </Pressable>
                        ) : null}
                        {message.text ? (
                          <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                            {message.text}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[styles.meta, mine ? styles.metaMine : styles.metaTheirs]}>
                        {formatChatClock(message.createdAt)}
                        {delivery ? ` · ${delivery}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}

          {failed.map((item) => (
            <View key={item.localId} style={[styles.bubbleRow, styles.rowMine]}>
              <View style={[styles.bubble, styles.bubbleFailed]}>
                {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.bubbleImage} /> : null}
                {item.text ? <Text style={styles.bubbleTextFailed}>{item.text}</Text> : null}
              </View>
              <View style={styles.failedMeta}>
                <Text style={styles.failedLabel}>Not sent</Text>
                <Pressable
                  onPress={() => void sendPayload(item.text, item.imageUri, item.localId)}
                  disabled={!isConnected || sending}
                  hitSlop={8}>
                  <Text style={styles.retry}>Retry</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        {blocked ? (
          <View style={styles.blockedBox}>
            <ProhibitedIcon />
            <Text style={styles.blockedTitle}>You blocked this user</Text>
            <Text style={styles.blockedBody}>
              Neither of you can send messages in this conversation. Manage this in Settings · Blocked users.
            </Text>
          </View>
        ) : sellerLocked ? (
          <AlertBanner
            variant="info"
            title="Awaiting reply"
            message="A seller may send one seller-initiated message per interested buyer per listing unless the buyer replies."
            style={styles.banner}
          />
        ) : null}

        {pendingImage && !blocked ? (
          <View style={styles.previewRow}>
            <Pressable onPress={() => setViewerUri(pendingImage)} accessibilityRole="imagebutton" accessibilityLabel="View photo">
              <Image source={{ uri: pendingImage }} style={styles.previewThumb} />
            </Pressable>
            <Pressable onPress={() => setPendingImage(null)} disabled={sending} hitSlop={8} style={styles.previewRemove}>
              <Text style={styles.previewRemoveText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

        {!blocked ? (
          <View style={[styles.composer, { paddingBottom: composerPad }]}>
            <Pressable
              onPress={onAttachImage}
              disabled={!canSend || sending}
              style={[styles.attach, (!canSend || sending) && styles.attachOff]}
              accessibilityRole="button"
              accessibilityLabel="Attach photo">
              <ImagePlaceholderIcon size={20} color={Palette.plum} />
            </Pressable>
            <TextInput
              ref={inputRef}
              style={[styles.input, !canSend ? styles.inputOff : null]}
              placeholder="Write a message…"
              placeholderTextColor={Palette.muted2}
              value={draft}
              editable={canSend && !sending}
              onChangeText={setDraft}
              onFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
              }}
              returnKeyType="default"
              blurOnSubmit={false}
              multiline
              textAlignVertical="center"
            />
            <Pressable
              onPress={send}
              disabled={sendDisabled}
              style={[styles.send, sendDisabled ? styles.sendOff : null]}
              accessibilityRole="button"
              accessibilityLabel="Send message">
              {sending ? <SpinnerArcIcon size={16} color={Palette.ivory} /> : <SendIcon size={16} color={Palette.ivory} />}
            </Pressable>
          </View>
        ) : (
          <View style={{ height: composerPad }} />
        )}
      </KeyboardAvoidingView>

      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: sheetBottom }]} onPress={() => undefined}>
            <View style={styles.handle} />
            {listing ? (
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  router.push(`/product/${listing.id}`);
                }}
                style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>View listing</Text>
              </Pressable>
            ) : null}
            {activeOffer ? (
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  router.push(`/inbox/offer/${activeOffer.id}`);
                }}
                style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>Open offer</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                router.push({ pathname: '/seller/[username]', params: { username: other } });
              }}
              style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>View seller profile</Text>
            </Pressable>
            <Pressable onPress={submitUserReport} style={styles.sheetRow}>
              <Text style={styles.sheetDanger}>Report user</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                if (blocked) void inbox.toggleBlock(other);
                else setBlockConfirm(true);
              }}
              style={styles.sheetRow}>
              <Text style={styles.sheetDanger}>{blocked ? 'Unblock user' : 'Block user'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(reportTarget)} transparent animationType="fade" onRequestClose={() => setReportTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setReportTarget(null)}>
          <Pressable style={[styles.reportSheet, { marginBottom: sheetBottom }]} onPress={() => undefined}>
            <Text style={styles.reportEyebrow}>Reporting this message</Text>
            <View style={styles.reportPreview}>
              <Text style={styles.reportPreviewText}>{reportTarget?.text}</Text>
            </View>
            <Button label="Report message" variant="danger" onPress={submitReport} style={styles.reportAction} />
            <Button label="Cancel" variant="secondary" onPress={() => setReportTarget(null)} style={styles.reportAction} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={blockConfirm} transparent animationType="fade" onRequestClose={() => setBlockConfirm(false)}>
        <Pressable style={styles.overlay} onPress={() => setBlockConfirm(false)}>
          <Pressable style={[styles.blockSheet, { marginBottom: sheetBottom }]} onPress={() => undefined}>
            <Text style={styles.blockTitle}>Block {other}?</Text>
            <Text style={styles.blockBody}>
              You won't be able to message each other. Blocked users are listed in Settings.
            </Text>
            <View style={styles.blockActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setBlockConfirm(false)} style={styles.half} />
              <Button label="Block" variant="danger" onPress={confirmBlock} style={styles.half} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(viewerUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
        statusBarTranslucent>
        <View style={styles.viewer}>
          <Pressable
            onPress={() => setViewerUri(null)}
            style={[styles.viewerClose, { top: Math.max(top, 12) + 8 }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo">
            <CloseIcon size={18} color={Palette.ivory} />
          </Pressable>
          <Pressable style={styles.viewerBody} onPress={() => setViewerUri(null)}>
            {viewerUri ? <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" /> : null}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    backgroundColor: Palette.ivory,
  },
  back: {
    paddingVertical: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  viewProfile: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  context: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 14,
    gap: 9,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.divider,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  listingThumb: {
    width: 44,
    height: 54,
    borderRadius: 4,
    backgroundColor: Palette.skeleton,
  },
  listingMeta: {
    flex: 1,
    minWidth: 0,
  },
  listingTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  listingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  listingPrice: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  listingPriceStruck: {
    color: Palette.muted,
    textDecorationLine: 'line-through',
    fontFamily: Typography.body,
  },
  listingNote: {
    fontSize: 11,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  viewLink: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Palette.divider,
    backgroundColor: Palette.sand,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  offerCopy: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  offerStatus: {
    color: Palette.warningText,
    fontFamily: Typography.bodySemiBold,
  },
  offlinePad: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 10,
  },
  reportBanner: {
    marginHorizontal: Spacing.xl,
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Palette.successBorder,
    backgroundColor: Palette.successBg,
    borderRadius: Radius.sm,
  },
  reportCopy: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.successText,
    marginBottom: 3,
  },
  reportBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: '#5C6B58',
  },
  thread: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: 12,
    flexGrow: 1,
  },
  threadEmpty: {
    marginTop: Spacing.xxl,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  dayGroup: {
    gap: 12,
  },
  dayLabel: {
    textAlign: 'center',
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  bubbleRow: {
    maxWidth: '78%',
  },
  rowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    gap: 8,
    overflow: 'hidden',
  },
  bubbleMine: {
    backgroundColor: Palette.plum,
    borderRadius: 14,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.divider,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
  },
  bubbleFailed: {
    backgroundColor: Palette.disabledBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: 14,
    borderBottomRightRadius: 4,
  },
  bubbleImage: {
    width: 180,
    height: 180,
    borderRadius: Radius.sm,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: Typography.body,
  },
  bubbleTextMine: {
    color: Palette.ivory,
  },
  bubbleTextTheirs: {
    color: Palette.espresso,
  },
  bubbleTextFailed: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  meta: {
    marginTop: 5,
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
  metaMine: {
    textAlign: 'right',
  },
  metaTheirs: {
    textAlign: 'left',
  },
  failedMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  failedLabel: {
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: Palette.error,
  },
  retry: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  banner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  blockedBox: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.sand,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  blockedTitle: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  blockedBody: {
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingTop: 8,
  },
  previewThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  previewRemove: {
    paddingVertical: 6,
  },
  previewRemoveText: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.xl,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivoryElevated,
  },
  attach: {
    height: 46,
    width: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOff: {
    opacity: 0.4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 23,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.espresso,
    backgroundColor: Palette.ivory,
  },
  inputOff: {
    opacity: 0.55,
  },
  send: {
    height: 46,
    width: 46,
    borderRadius: 23,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: {
    opacity: 0.4,
  },
  overlay: {
    flex: 1,
    backgroundColor: Palette.liveOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    marginBottom: 6,
  },
  sheetRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  sheetLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  sheetDanger: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.error,
  },
  reportSheet: {
    marginHorizontal: 18,
    backgroundColor: Palette.ivory,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.divider,
    padding: 14,
  },
  reportEyebrow: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted2,
    marginBottom: 8,
  },
  reportPreview: {
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.divider,
    borderRadius: 10,
    borderBottomLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  reportPreviewText: {
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  reportAction: {
    marginTop: 9,
    minHeight: 44,
  },
  blockSheet: {
    marginHorizontal: 18,
    backgroundColor: Palette.ivory,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.divider,
    padding: 16,
  },
  blockTitle: {
    fontFamily: Typography.display,
    fontSize: 18,
    color: Palette.espresso,
  },
  blockBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  blockActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 13,
  },
  half: {
    flex: 1,
    minHeight: 44,
  },
  deniedWrap: {
    marginTop: 80,
    marginHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.sand,
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  deniedTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  deniedBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(27,17,19,0.94)',
  },
  viewerClose: {
    position: 'absolute',
    right: 18,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,247,240,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
});
