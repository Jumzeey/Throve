import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { EmptyState } from '@/components/ui/empty-state';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getListingImageSource } from '@/data/images';
import type { Conversation } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatInboxTime } from '@/lib/format';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function InboxScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { session, publicProfiles, ensurePublicProfile } = useAuth();
  const { refresh, conversationsFor, loading, otherParticipant, offersFor } = useInbox();
  const { getListing } = useListings();
  const { isConnected } = useNetworkStatus();
  const [loadError, setLoadError] = useState(false);

  const me = session?.username ?? '';
  const conversations = conversationsFor(me);
  const { received } = offersFor(me);
  const pendingCount = received.filter((offer) => offer.status === 'pending').length;

  useEffect(() => {
    for (const conv of conversations) {
      const other = otherParticipant(conv, me);
      if (other) void ensurePublicProfile(other).catch(() => undefined);
    }
  }, [conversations, ensurePublicProfile, me, otherParticipant]);

  const pullTask = useCallback(async () => {
    setLoadError(false);
    try {
      await refresh();
    } catch {
      setLoadError(true);
    }
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      void refresh({ silent: true }).catch(() => setLoadError(true));
    }, [session, refresh]),
  );

  if (params.tab === 'offers') {
    return <Redirect href="/inbox/offers" />;
  }

  const isLoading = loading && !refreshing && conversations.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <Text style={styles.title}>Inbox</Text>

      <View style={styles.tabs}>
        <View style={[styles.tab, styles.tabOn]}>
          <Text style={[styles.tabLabel, styles.tabLabelOn]}>Conversations</Text>
        </View>
        <Pressable onPress={() => router.push('/inbox/offers')} style={styles.tab}>
          <View style={styles.tabLabelRow}>
            <Text style={styles.tabLabel}>Offers</Text>
            {pendingCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]}>
        {!isConnected ? (
          <View style={styles.banner}>
            <OfflineBanner title="No connection" message="Reconnect to load new messages and offers." />
          </View>
        ) : null}
        {loadError ? (
          <View style={styles.banner}>
            <AlertBanner
              variant="error"
              title="We couldn't load your inbox"
              message="Please try again in a moment."
            />
          </View>
        ) : null}

        {isLoading ? (
          <ConversationSkeleton />
        ) : conversations.length === 0 && !loadError ? (
          <EmptyState
            title="No messages yet"
            message="Message a seller from a listing and the conversation appears here."
            style={styles.empty}
          />
        ) : (
          conversations.map((conv) => {
            const other = otherParticipant(conv, me);
            const listing = getListing(conv.listingId);
            const unread = conv.unreadBy.includes(me);
            return (
              <ConversationRow
                key={conv.id}
                conversation={conv}
                other={other}
                avatarUri={publicProfiles[other]?.photoUri}
                listing={listing}
                unread={unread}
                onPress={() => router.push(`/inbox/chat/${conv.id}`)}
              />
            );
          })
        )}
      </LiquidRefreshScrollView>
    </View>
  );
}

function ConversationRow({
  conversation,
  other,
  avatarUri,
  listing,
  unread,
  onPress,
}: {
  conversation: Conversation;
  other: string;
  avatarUri?: string | null;
  listing: ReturnType<ReturnType<typeof useListings>['getListing']>;
  unread: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <ProfileAvatar uri={avatarUri} username={other} style={styles.avatar} />
      <View style={styles.meta}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {other}
          </Text>
          <Text style={styles.time}>{formatInboxTime(conversation.updatedAt)}</Text>
        </View>
        <Text style={[styles.preview, unread ? styles.previewUnread : null]} numberOfLines={1}>
          {conversation.lastMessage || 'No messages yet.'}
        </Text>
      </View>
      {listing ? <AppImage source={getListingImageSource(listing)} style={styles.listingThumb} /> : null}
      {unread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

function ConversationSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '42%' }]} />
            <View style={[styles.skeletonLine, { width: '78%', marginTop: 10 }]} />
          </View>
          <View style={styles.skeletonThumb} />
        </View>
      ))}
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
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  tabLabelOn: {
    color: Palette.plum,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.plum,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  body: {
    paddingBottom: Spacing.xxl,
  },
  banner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  empty: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
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
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  time: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
  preview: {
    marginTop: 3,
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  previewUnread: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  listingThumb: {
    width: 40,
    height: 40,
    borderRadius: Radius.xs,
    backgroundColor: Palette.sand,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.plum,
  },
  skeletonList: {
    paddingHorizontal: Spacing.xl,
    gap: 16,
    paddingTop: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.skeleton,
  },
  skeletonThumb: {
    width: 40,
    height: 40,
    borderRadius: Radius.xs,
    backgroundColor: Palette.skeleton,
  },
  skeletonCopy: {
    flex: 1,
  },
  skeletonLine: {
    height: 11,
    borderRadius: 5,
    backgroundColor: Palette.skeleton,
  },
});
