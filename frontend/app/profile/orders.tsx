import { OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { getListingImage } from '@/data/images';
import type { Order } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { orders, loading, refresh } = useCheckout();
  const { isConnected } = useNetworkStatus();

  const myOrders = orders.filter(
    (order) => order.buyer === session?.username || order.seller === session?.username,
  );

  const pullTask = useCallback(async () => {
    await refresh({ silent: true });
  }, [refresh]);

  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const showSkeleton = loading && myOrders.length === 0 && !refreshing;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Orders" onBack={() => router.back()} />
      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={styles.body}
      >
        {!isConnected ? <OfflineBanner message="Reconnect to view and manage orders." /> : null}
        {showSkeleton ? (
          <LoadingSkeleton rows={4} />
        ) : myOrders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            message="When you buy or sell something, your orders will appear here."
            actionLabel="Browse home"
            onAction={() => router.replace('/(tabs)')}
          />
        ) : (
          <View style={styles.list}>
            {myOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                username={session.username}
                onPress={() => router.push(`/checkout/order?id=${order.id}`)}
              />
            ))}
          </View>
        )}
        {!showSkeleton && myOrders.length > 0 ? (
          <Button label="Refresh" variant="ghost" onPress={onRefresh} disabled={!isConnected || refreshing} />
        ) : null}
      </LiquidRefreshScrollView>
    </View>
  );
}

function OrderRow({ order, username, onPress }: { order: Order; username: string; onPress: () => void }) {
  const role = order.buyer === username ? 'Buying' : 'Selling';
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <AppImage source={getListingImage(order.listingId)} style={styles.thumb} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {order.listingTitle}
          </Text>
          <StatusChip kind="order" variant={order.status} />
        </View>
        <Text style={styles.rowMeta}>
          {role} · Order #{order.id} · {formatNaira(order.total)}
        </Text>
        <Text style={styles.rowDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  rowMeta: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  rowDate: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
});
