import { AppImage } from '@/components/ui/app-image';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Typography } from '@/constants/theme';
import { getSellerAvatar } from '@/data/images';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const inbox = useInbox();
  const { markRead } = inbox;
  const { getListing } = useListings();
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const username = session?.username;

  const conv = id ? inbox.getConversation(id) : undefined;

  useEffect(() => {
    if (username && id) markRead(id, username);
  }, [id, markRead, username]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

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
  const sellerLocked = Boolean(listing && me === listing.seller && !inbox.canSellerMessage(conversation.listingId, other, me));
  const canSend = !blocked && !sellerLocked;
  const thread = inbox.messages(conversation.id);

  function send() {
    if (!canSend) return;
    if (inbox.sendMessage(conversation.id, me, draft)) setDraft('');
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={18} color={Palette.text} />
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
          <Ionicons name="ellipsis-vertical" size={18} color={Palette.muted2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
          {thread.map((message) => {
            const mine = message.from === me;
            return (
              <View key={message.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>{message.text}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        {blocked ? (
          <Text style={styles.blocked}>{`You've blocked @${other}. Unblock to send messages.`}</Text>
        ) : sellerLocked ? (
          <Text style={styles.blocked}>Wait for them to reply before sending another message.</Text>
        ) : null}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextField
            placeholder="Message..."
            value={draft}
            editable={canSend}
            onChangeText={setDraft}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable onPress={send} disabled={!canSend} style={[styles.send, !canSend ? styles.sendOff : null]}>
            <Ionicons name="send" size={16} color={Palette.background} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {menuOpen ? (
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setToast('Message reported.');
              }}
              style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>Report last message</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setToast('User reported. Our team will review.');
              }}
              style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>Report @{other}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                inbox.toggleBlock(other);
                setMenuOpen(false);
              }}
              style={styles.sheetRow}>
              <Text style={styles.sheetDanger}>{blocked ? 'Unblock user' : 'Block user'}</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={styles.sheetRow}>
              <Text style={styles.sheetMuted}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : null}

      {toast ? (
        <View style={[styles.toast, { top: insets.top + 62 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
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
    color: Palette.text,
  },
  listing: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  thread: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
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
  },
  bubbleMine: {
    borderWidth: 1,
    borderColor: Palette.accent,
    borderRadius: Radius.md,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.body,
  },
  bubbleTextMine: {
    color: Palette.accent800,
  },
  bubbleTextTheirs: {
    color: Palette.text,
  },
  blocked: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 12,
    color: Palette.live,
    textAlign: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  send: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: {
    opacity: 0.4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23,23,23,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 10,
  },
  sheetRow: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheetLabel: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.text,
  },
  sheetDanger: {
    fontSize: 14,
    color: Palette.live,
  },
  sheetMuted: {
    fontSize: 14,
    color: Palette.muted2,
  },
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Palette.accent,
    borderRadius: Radius.md,
  },
  toastText: {
    fontSize: 13,
    color: Palette.background,
    textAlign: 'center',
  },
});
