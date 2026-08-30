import { AppImage } from '@/components/ui/app-image';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { OfflineBanner } from '@/components/ui/alert-banner';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { getSellerAvatar } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatRelativeTime } from '@/lib/format';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScreenInsets } from '@/hooks/use-screen-insets';

export default function InboxScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const { session } = useAuth();
  const inbox = useInbox();
  const { isConnected } = useNetworkStatus();
  const me = session?.username ?? '';
  const conversations = inbox.conversationsFor(me);

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <Text style={styles.title}>Inbox</Text>
      <View style={styles.tabs}>
        <View style={[styles.tab, styles.tabOn]}>
          <Text style={[styles.tabLabel, styles.tabLabelOn]}>Messages</Text>
        </View>
        <Pressable onPress={() => router.push('/inbox/offers')} style={styles.tab}>
          <Text style={styles.tabLabel}>Offers</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <View style={styles.offline}>
            <OfflineBanner message="Reconnect to send and receive messages." />
          </View>
        ) : null}

        {inbox.loading ? (
          <LoadingSkeleton rows={5} style={styles.skeleton} />
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No messages yet"
            message="When you message a seller or buyer, conversations will appear here."
            style={styles.empty}
          />
        ) : (
          conversations.map((conv) => {
            const other = inbox.otherParticipant(conv, me);
            const unread = conv.unreadBy.includes(me);
            return (
              <Pressable key={conv.id} onPress={() => router.push(`/inbox/chat/${conv.id}`)} style={styles.row}>
                <AppImage source={getSellerAvatar(other)} style={styles.avatar} />
                <View style={styles.meta}>
                  <View style={styles.top}>
                    <Text style={styles.name}>@{other}</Text>
                    <Text style={styles.time}>{formatRelativeTime(conv.updatedAt)}</Text>
                  </View>
                  <Text style={[styles.preview, unread ? styles.previewUnread : null]} numberOfLines={1}>
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
    backgroundColor: Palette.ivory,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.plum,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  tabLabelOn: {
    color: Palette.plum,
  },
  body: {
    paddingBottom: Spacing.xxl,
  },
  offline: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  skeleton: {
    paddingHorizontal: Spacing.xl,
  },
  empty: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  time: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
  preview: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  previewUnread: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.plum,
  },
});
