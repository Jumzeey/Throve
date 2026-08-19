import { AppImage } from '@/components/ui/app-image';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Typography, Radius } from '@/constants/theme';
import { getListingImage } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { ORDER_STATUS_LABELS, orderStatusColor, useCheckout } from '@/context/checkout-context';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { orders } = useCheckout();
  const [tab, setTab] = useState<'purchases' | 'sales'>('purchases');

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const list =
    tab === 'purchases'
      ? orders.filter((order) => order.buyer === session.username)
      : orders.filter((order) => order.seller === session.username);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Orders" onBack={() => router.back()} />
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('purchases')} style={[styles.tab, tab === 'purchases' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'purchases' ? styles.tabLabelOn : null]}>Purchases</Text>
        </Pressable>
        <Pressable onPress={() => setTab('sales')} style={[styles.tab, tab === 'sales' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'sales' ? styles.tabLabelOn : null]}>Sales</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {list.length === 0 ? (
          <Text style={styles.empty}>Nothing here yet.</Text>
        ) : (
          list.map((order) => (
            <Pressable
              key={order.id}
              onPress={() => router.push({ pathname: '/checkout/order', params: { id: order.id } })}
              style={styles.row}>
              <AppImage source={getListingImage(order.listingId)} style={styles.thumb} />
              <View style={styles.meta}>
                <Text style={styles.title}>{order.listingTitle}</Text>
                <Text style={styles.counterpart}>
                  {tab === 'purchases' ? `Sold by @${order.seller}` : `Bought by @${order.buyer}`}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.amount}>{formatNaira(order.total)}</Text>
                <Text style={[styles.status, { color: orderStatusColor(order.status) }]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Text>
              </View>
            </Pressable>
          ))
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.accent,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted3,
  },
  tabLabelOn: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.accent700,
  },
  body: {
    paddingHorizontal: 20,
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
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
  },
  meta: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
  counterpart: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 13,
    fontFamily: Typography.headingBold,
    color: Palette.accent700,
  },
  status: {
    marginTop: 2,
    fontSize: 11,
  },
});
