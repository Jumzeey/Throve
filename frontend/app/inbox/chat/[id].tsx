import { AlertBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ChevronBackIcon,
  CloseIcon,
  ImagePlaceholderIcon,
  MoreVerticalIcon,
  SendIcon,
  SpinnerArcIcon,
} from '@/components/ui/icons';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { getSellerAvatar } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { pickChatImage, uploadChatImage } from '@/lib/chat-media';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

export default function ChatScreen() {
  const router = useRouter();
  const { top, bottom, sheetBottom } = useScreenInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboard = useKeyboardInset();
  const keyboardBottom = keyboard.height;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const inbox = useInbox();
  const { markRead } = inbox;
  const { getListing } = useListings();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const sendingRef = useRef(false);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const username = session?.username;

  const conv = id ? inbox.getConversation(id) : undefined;
  const threadPreview = conv ? inbox.messages(conv.id) : [];

  useEffect(() => {
    if (username && id) markRead(id, username);
  }, [id, markRead, username]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [id, keyboardBottom, threadPreview.length, pendingImage]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!conv || !conv.participants.includes(session.username)) {
    return <Redirect href="/(tabs)/inbox" />;
  }

  const conversation = conv;
  const me = session.username;
  const other = inbox.otherParticipant(conversation, me);
  const listing = getListing(conversation.listingId);
  const blocked = inbox.isBlocked(other);
  const sellerLocked = Boolean(
    listing && me === listing.seller && !inbox.canSellerMessage(conversation.listingId, other, me),
  );
  const canSend = !blocked && !sellerLocked;
  const thread = threadPreview;
  const composerPad =
    Platform.OS === 'android' && keyboard.height > 0
      ? Math.max(0, windowHeight - keyboard.screenY) + 24
      : Math.max(bottom, 12);
  const hasPayload = Boolean(draft.trim() || pendingImage);
  const sendDisabled = !canSend || !hasPayload || sending;

  async function send() {
    if (sendDisabled || sendingRef.current) return;

    const text = draft.trim();
    const localImage = pendingImage;
    if (!text && !localImage) return;

    sendingRef.current = true;
    setSending(true);
    setDraft('');
    setPendingImage(null);

    try {
      let imageUrl: string | null = null;
      if (localImage) {
        imageUrl = await uploadChatImage(localImage);
      }
      const ok = await inbox.sendMessage(conversation.id, me, text, imageUrl);
      if (!ok) throw new Error('Message was not sent.');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
      inputRef.current?.focus();
    } catch (err) {
      setDraft(text);
      setPendingImage(localImage);
      const msg = err instanceof Error ? err.message : 'Could not send. Try again.';
      setToast(msg);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function onAttachImage() {
    if (!canSend || sending) return;
    const picked = await pickChatImage();
    if (!picked) return;
    if ('error' in picked) {
      setToast(picked.error);
      return;
    }
    setPendingImage(picked.uri);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(top, 14) }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ChevronBackIcon />
        </Pressable>
        <AppImage source={getSellerAvatar(other)} style={styles.avatar} />
        <View style={styles.headerMeta}>
          <Pressable onPress={() => router.push({ pathname: '/seller/[username]', params: { username: other } })}>
            <Text style={styles.name}>@{other}</Text>
          </Pressable>
          <Pressable onPress={() => listing && router.push(`/product/${listing.id}`)}>
            <Text style={styles.listing} numberOfLines={1}>
              Re: {listing?.title ?? 'Listing'}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
          <MoreVerticalIcon color={Palette.muted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {thread.length === 0 ? (
            <EmptyState title="Start the conversation" message="Send a message to get things going." style={styles.threadEmpty} />
          ) : (
            thread.map((message) => {
              const mine = message.from === me;
              return (
                <View key={message.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {message.imageUrl ? (
                      <Pressable
                        onPress={() => setViewerUri(message.imageUrl!)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel="View photo"
                      >
                        <AppImage source={message.imageUrl} style={styles.bubbleImage} />
                      </Pressable>
                    ) : null}
                    {message.text ? (
                      <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                        {message.text}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {blocked ? (
          <AlertBanner
            variant="error"
            title="User blocked"
            message={`You've blocked @${other}. Unblock to send messages.`}
            style={styles.banner}
          />
        ) : sellerLocked ? (
          <AlertBanner
            variant="info"
            title="Awaiting reply"
            message="Wait for them to reply before sending another message."
            style={styles.banner}
          />
        ) : null}

        {pendingImage ? (
          <View style={styles.previewRow}>
            <Pressable onPress={() => setViewerUri(pendingImage)} accessibilityRole="imagebutton" accessibilityLabel="View photo">
              <Image source={{ uri: pendingImage }} style={styles.previewThumb} />
            </Pressable>
            <Pressable
              onPress={() => setPendingImage(null)}
              disabled={sending}
              hitSlop={8}
              style={styles.previewRemove}
            >
              <Text style={styles.previewRemoveText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.composer, { paddingBottom: composerPad }]}>
          <Pressable
            onPress={onAttachImage}
            disabled={!canSend || sending}
            style={[styles.attach, (!canSend || sending) && styles.attachOff]}
            accessibilityRole="button"
            accessibilityLabel="Attach photo"
          >
            <ImagePlaceholderIcon size={20} color={Palette.plum} />
          </Pressable>
          <TextInput
            ref={inputRef}
            style={[styles.input, !canSend ? styles.inputOff : null]}
            placeholder="Message..."
            placeholderTextColor={Palette.disabled}
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
            accessibilityLabel="Send message"
          >
            {sending ? <SpinnerArcIcon size={16} color={Palette.ivory} /> : <SendIcon size={16} color={Palette.ivory} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {menuOpen ? (
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: sheetBottom }]}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setToast('Message reported.');
              }}
              style={styles.sheetRow}
            >
              <Text style={styles.sheetLabel}>Report last message</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setToast('User reported. Our team will review.');
              }}
              style={styles.sheetRow}
            >
              <Text style={styles.sheetLabel}>Report @{other}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                inbox.toggleBlock(other);
                setMenuOpen(false);
              }}
              style={styles.sheetRow}
            >
              <Text style={styles.sheetDanger}>{blocked ? 'Unblock user' : 'Block user'}</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={styles.sheetRow}>
              <Text style={styles.sheetMuted}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : null}

      {toast ? (
        <View style={[styles.toast, { top: top + 62 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <Modal
        visible={Boolean(viewerUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
        statusBarTranslucent
      >
        <View style={styles.viewer}>
          <Pressable
            onPress={() => setViewerUri(null)}
            style={[styles.viewerClose, { top: Math.max(top, 12) + 8 }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <CloseIcon size={18} color={Palette.ivory} />
          </Pressable>
          <Pressable style={styles.viewerBody} onPress={() => setViewerUri(null)}>
            {viewerUri ? (
              <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
            ) : null}
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
    gap: 10,
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
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  listing: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  thread: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: 10,
    flexGrow: 1,
  },
  threadEmpty: {
    marginTop: Spacing.xxxl,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    overflow: 'hidden',
  },
  bubbleMine: {
    borderWidth: 1,
    borderColor: Palette.plum,
    borderRadius: Radius.md,
    borderBottomRightRadius: 4,
    backgroundColor: Palette.ivoryElevated,
  },
  bubbleTheirs: {
    backgroundColor: Palette.sand,
    borderRadius: Radius.md,
    borderBottomLeftRadius: 4,
  },
  bubbleImage: {
    width: 180,
    height: 180,
    borderRadius: Radius.sm,
    marginHorizontal: -2,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.body,
  },
  bubbleTextMine: {
    color: Palette.espresso,
  },
  bubbleTextTheirs: {
    color: Palette.body,
  },
  banner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
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
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivory,
  },
  attach: {
    height: 42,
    width: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOff: {
    opacity: 0.4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 10,
    paddingBottom: Platform.OS === 'ios' ? 11 : 10,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.espresso,
    backgroundColor: Palette.ivoryElevated,
  },
  inputOff: {
    opacity: 0.55,
  },
  send: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: {
    opacity: 0.4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Palette.liveOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 10,
  },
  sheetRow: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  sheetLabel: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  sheetDanger: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.error,
  },
  sheetMuted: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Palette.plum,
    borderRadius: Radius.md,
  },
  toastText: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
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
