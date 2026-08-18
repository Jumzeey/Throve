import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { formatRelativeTime } from '@/lib/format';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const inbox = useInbox();
  const me = session?.username ?? '';
  const conversations = inbox.conversationsFor(me);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Inbox</Text>
      <View style={styles.tabs}>
        <View style={[styles.tab, styles.tabOn]}>
          <Text style={[styles.tabLabel, styles.tabLabelOn]}>Messages</Text>
        </View>
        <Pressable onPress={() => router.push('/inbox/offers')} style={styles.tab}>
          <Text style={styles.tabLabel}>Offers</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {conversations.length === 0 ? (
          <Text style={styles.empty}>No messages yet.</Text>
        ) : (
          conversations.map((conv) => {
            const other = inbox.otherParticipant(conv, me);
            const unread = conv.unreadBy.includes(me);
            return (
              <Pressable key={conv.id} onPress={() => router.push(`/inbox/chat/${conv.id}`)} style={styles.row}>
                <PlaceholderImage style={styles.avatar} />
                <View style={styles.meta}>
                  <View style={styles.top}>
                    <Text style={styles.name}>@{other}</Text>
                    <Text style={styles.time}>{formatRelativeTime(conv.updatedAt)}</Text>
                  </View>
                  <Text style={styles.preview} numberOfLines={1}>
                    {conv.lastMessage || 'No messages yet.'}
                  </Text>
                </View>
                {unread ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.text,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.muted3,
  },
  tabLabelOn: {
    fontWeight: '700',
    color: Palette.text,
  },
  body: {
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 50,
    fontSize: 13,
    color: Palette.muted3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hatch,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  time: {
    fontSize: 11,
    color: Palette.muted3,
  },
  preview: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.text,
  },
});
