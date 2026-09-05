import { EmptyState } from '@/components/ui/empty-state';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { OfflineBanner } from '@/components/ui/alert-banner';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatRelativeTime } from '@/lib/format';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AlertsScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { items, loading, refresh, markRead } = useNotifications();
  const { isConnected } = useNetworkStatus();

  const pullTask = useCallback(async () => {
    await refresh();
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      void refresh();
    }, [refresh, session]),
  );

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <Text style={styles.title}>Inbox</Text>
      <View style={styles.tabs}>
        <Pressable onPress={() => router.replace('/(tabs)/inbox')} style={styles.tab}>
          <Text style={styles.tabLabel}>Messages</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/inbox/offers')} style={styles.tab}>
          <Text style={styles.tabLabel}>Offers</Text>
        </Pressable>
        <View style={[styles.tab, styles.tabOn]}>
          <Text style={[styles.tabLabel, styles.tabLabelOn]}>Alerts</Text>
        </View>
      </View>
      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]}
      >
        {!isConnected ? (
          <View style={styles.offline}>
            <OfflineBanner message="Reconnect to see alerts." />
          </View>
        ) : null}
        {loading && !refreshing && items.length === 0 ? (
          <LoadingSkeleton rows={5} style={styles.skeleton} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No alerts yet"
            message="Live moderator invites, and other account notices, will show up here."
            style={styles.empty}
          />
        ) : (
          items.map((item) => {
            const unread = !item.readAt;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  void markRead(item.id);
                  if (item.deepLink) router.push(`/${item.deepLink}` as never);
                }}
                style={styles.row}
              >
                <View style={styles.meta}>
                  <View style={styles.top}>
                    <Text style={styles.name}>{item.title}</Text>
                    <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
                  </View>
                  <Text style={[styles.preview, unread ? styles.previewUnread : null]} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                {unread ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })
        )}
      </LiquidRefreshScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
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
  tabOn: { borderBottomColor: Palette.plum },
  tabLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  tabLabelOn: { color: Palette.plum },
  body: { paddingBottom: Spacing.xxl },
  offline: { marginHorizontal: Spacing.xl, marginBottom: Spacing.md },
  skeleton: { paddingHorizontal: Spacing.xl },
  empty: { marginHorizontal: Spacing.xl, marginTop: Spacing.xxxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  meta: { flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  time: { fontSize: 11, fontFamily: Typography.body, color: Palette.muted3 },
  preview: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  previewUnread: { color: Palette.espresso, fontFamily: Typography.bodySemiBold },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.plum,
  },
});
