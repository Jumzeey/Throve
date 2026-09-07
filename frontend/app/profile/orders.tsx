import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { LiquidRefreshFlatList, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/status-chip';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { orderStatusChipLabel, useCheckout } from '@/context/checkout-context';
import { getListingImage } from '@/data/images';
import type { Order } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatNaira } from '@/lib/format';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Tab = 'purchases' | 'sales';

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { orders, loading, loadError, refresh } = useCheckout();
  const { isConnected } = useNetworkStatus();
  const [tab, setTab] = useState<Tab>('purchases');

  const purchases = useMemo(
    () => orders.filter((order) => order.buyer === session?.username),
    [orders, session?.username],
  );
  const sales = useMemo(
    () => orders.filter((order) => order.seller === session?.username),
    [orders, session?.username],
  );
  const visible = tab === 'purchases' ? purchases : sales;

  const pullTask = useCallback(async () => {
    await refresh({ silent: true });
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  const showSkeleton = loading && orders.length === 0 && !refreshing;
  const showError = loadError && !showSkeleton && orders.length === 0;

  const listHeader = useMemo(
    () => (
      <>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to see current order status." />
        ) : null}

        {showError ? (
          <AlertBanner
            variant="error"
            title="We couldn't load your orders"
            message="Please try again in a moment."
          />
        ) : null}
      </>
    ),
    [isConnected, showError],
  );

  const listEmpty = useMemo(() => {
    if (showSkeleton) return <OrdersSkeleton />;
    if (visible.length === 0 && !showError) {
      return tab === 'purchases' ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitleSerif}>No purchases yet</Text>
          <Text style={styles.emptyBody}>Orders you place will appear here.</Text>
          <Button
            label="Start browsing"
            variant="secondary"
            style={styles.emptyBtn}
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No sales yet</Text>
          <Text style={styles.emptyBody}>Once someone buys from you, the order appears here.</Text>
        </View>
      );
    }
    return null;
  }, [router, showError, showSkeleton, tab, visible.length]);

  const renderItem = useCallback(
    ({ item: order }: { item: Order }) => (
      <OrderRow
        order={order}
        role={tab}
        onPress={() => router.push(`/checkout/order?id=${order.id}`)}
      />
    ),
    [router, tab],
  );

  const keyExtractor = useCallback((item: Order) => item.id, []);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Orders" onBack={() => router.back()} />

      <View style={styles.tabs}>
        <Pressable style={styles.tab} onPress={() => setTab('purchases')}>
          <Text style={[styles.tabLabel, tab === 'purchases' ? styles.tabActive : null]}>
            Purchases · {purchases.length}
          </Text>
          {tab === 'purchases' ? <View style={styles.tabUnderline} /> : null}
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setTab('sales')}>
          <Text style={[styles.tabLabel, tab === 'sales' ? styles.tabActive : null]}>
            Sales · {sales.length}
          </Text>
          {tab === 'sales' ? <View style={styles.tabUnderline} /> : null}
        </Pressable>
      </View>

      <LiquidRefreshFlatList
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        data={showSkeleton || visible.length === 0 ? [] : visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[styles.body, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function OrderRow({
  order,
  role,
  onPress,
}: {
  order: Order;
  role: Tab;
  onPress: () => void;
}) {
  const cancelled = order.status === 'cancelled';
  const counterpart = role === 'purchases' ? order.seller : order.buyer;
  const meta =
    role === 'purchases' ? `${order.id} · ${counterpart}` : `${order.id} · to ${counterpart}`;
  const chipLabel = orderStatusChipLabel(order.status, role === 'purchases' ? 'purchase' : 'sale');
  const chipVariant =
    order.status === 'paid' && role === 'sales'
      ? ('paid' as const) // colors overridden via label; awaiting-dispatch uses warning below
      : order.status;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <AppImage
        source={getListingImage(order.listingId)}
        style={[styles.thumb, cancelled ? styles.thumbMuted : null]}
      />
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, cancelled ? styles.mutedText : null]} numberOfLines={2}>
          {order.listingTitle}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
        <View style={styles.rowBottom}>
          {order.status === 'paid' && role === 'sales' ? (
            <View style={styles.awaitingChip}>
              <Text style={styles.awaitingChipText}>{chipLabel}</Text>
            </View>
          ) : (
            <StatusChip kind="order" variant={chipVariant} label={chipLabel} />
          )}
          <Text style={[styles.price, cancelled ? styles.mutedText : null]}>{formatNaira(order.total)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Palette.muted2} />
    </Pressable>
  );
}

function OrdersSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1].map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '72%' }]} />
            <View style={[styles.skeletonLine, { width: '46%' }]} />
            <View style={[styles.skeletonLine, { width: '30%' }]} />
          </View>
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
  tabs: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  tab: {
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  tabActive: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: Palette.plum,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
    flexGrow: 1,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  thumb: {
    width: 60,
    height: 74,
    borderRadius: 5,
    backgroundColor: Palette.skeleton,
  },
  thumbMuted: {
    opacity: 0.6,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
    fontVariant: ['tabular-nums'],
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  mutedText: {
    color: Palette.muted,
  },
  awaitingChip: {
    borderWidth: 1,
    borderColor: '#E9CFA6',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  awaitingChipText: {
    fontSize: 10,
    letterSpacing: 0.7,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: 10,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emptyTitleSerif: {
    fontFamily: Typography.display,
    fontSize: 19,
    color: Palette.espresso,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: Typography.bodySemiBold,
    fontSize: 13.5,
    color: Palette.espresso,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 13,
    alignSelf: 'stretch',
  },
  skeletonList: {
    gap: 14,
    paddingTop: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 13,
  },
  skeletonThumb: {
    width: 56,
    height: 70,
    borderRadius: 5,
    backgroundColor: Palette.skeleton,
  },
  skeletonCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 9,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: Palette.skeleton,
  },
});
