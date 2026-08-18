import { Button } from '@/components/ui/button';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { deliveryLabel, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CheckoutOrderScreen() {
  const router = useRouter();
  const { lastOrder } = useCheckout();
  const live = useLive();

  if (!lastOrder) {
    return <Redirect href="/(tabs)/live" />;
  }

  const liveSession = lastOrder.fromLiveId ? live.getSession(lastOrder.fromLiveId) : undefined;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={`Order #${lastOrder.id}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Prototype order — simulated, no real payment collected.</Text>
        </View>
        <View style={styles.item}>
          <PlaceholderImage style={styles.thumb} />
          <View style={styles.itemMeta}>
            <Text style={styles.itemTitle}>{lastOrder.listingTitle}</Text>
            <Text style={styles.itemSub}>Sold by @{lastOrder.seller} · {formatNaira(lastOrder.total)}</Text>
          </View>
        </View>
        <Text style={styles.line}>Ship to: {lastOrder.name}, {lastOrder.address}, {lastOrder.city}</Text>
        <Text style={styles.line}>{deliveryLabel(lastOrder.deliveryMethod)} · {formatNaira(lastOrder.deliveryFee)}</Text>
        <Text style={styles.status}>Paid</Text>
        {liveSession?.status === 'live' ? (
          <Button label="Return to live" variant="danger" onPress={() => router.replace(`/live/${lastOrder.fromLiveId}`)} style={styles.returnLive} />
        ) : null}
        <Button label="Continue shopping" variant="secondary" onPress={() => router.replace('/(tabs)')} style={styles.home} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  notice: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Palette.chipBg,
    borderRadius: 8,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 11,
    color: Palette.muted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: 10,
    marginBottom: 16,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  itemMeta: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
  },
  itemSub: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  line: {
    fontSize: 13,
    color: Palette.muted,
    marginBottom: 8,
  },
  status: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
  returnLive: {
    marginTop: 20,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.live,
  },
  home: {
    marginTop: 10,
  },
});
