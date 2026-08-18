import { Button } from '@/components/ui/button';
import { Palette } from '@/constants/theme';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lastOrder } = useCheckout();
  const live = useLive();

  if (!lastOrder) {
    return <Redirect href="/(tabs)/live" />;
  }

  const liveSession = lastOrder.fromLiveId ? live.getSession(lastOrder.fromLiveId) : undefined;
  const canReturn = liveSession?.status === 'live';

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.badge}>
        <Text style={styles.check}>✓</Text>
      </View>
      <Text style={styles.title}>Purchase successful</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>No real money was charged.</Text>
      </View>
      <Text style={styles.copy}>
        Order #{lastOrder.id} for {lastOrder.listingTitle} — {formatNaira(lastOrder.total)}.
      </Text>
      <View style={styles.actions}>
        <Button label="View order" onPress={() => router.push('/checkout/order')} />
        {canReturn ? (
          <Button
            label="Return to live"
            variant="danger"
            onPress={() => router.replace(`/live/${lastOrder.fromLiveId}`)}
            style={styles.returnLive}
          />
        ) : null}
        <Button label="Continue shopping" variant="secondary" onPress={() => router.replace('/(tabs)')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: Palette.background,
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
  },
  notice: {
    backgroundColor: '#fdf3e3',
    borderWidth: 1,
    borderColor: '#ecd39a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  noticeText: {
    fontSize: 12,
    color: '#8a6112',
  },
  copy: {
    fontSize: 14,
    lineHeight: 21,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 270,
  },
  actions: {
    width: '100%',
    maxWidth: 260,
    gap: 10,
    marginTop: 10,
  },
  returnLive: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.live,
  },
});
