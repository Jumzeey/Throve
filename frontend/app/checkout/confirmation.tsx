import { AlertBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { CheckIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { deliveryLabel, useCheckout } from '@/context/checkout-context';
import { getListingImage } from '@/data/images';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CheckoutConfirmationScreen() {
  const router = useRouter();
  const checkout = useCheckout();
  const order = checkout.lastOrder;

  if (!order) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Confirmed" onBack={() => router.replace('/(tabs)')} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.successIcon}>
          <CheckIcon size={22} color={Palette.ivory} />
        </View>
        <Text style={styles.title}>Order placed</Text>
        <Text style={styles.lead}>
          Your prototype order is confirmed. No real payment was collected — this simulates the full checkout flow.
        </Text>
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <StatusChip kind="order" variant="paid" />
          </View>
          <View style={styles.itemRow}>
            <AppImage source={getListingImage(order.listingId)} style={styles.thumb} />
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>{order.listingTitle}</Text>
              <Text style={styles.itemSub}>
                {deliveryLabel(order.deliveryMethod)} · {formatNaira(order.total)}
              </Text>
            </View>
          </View>
          <Text style={styles.shipLine}>
            Ship to: {order.name}, {order.address}, {order.city}
          </Text>
        </View>
        <AlertBanner variant="info" title="What happens next" message="The seller will dispatch your item. Track progress from your orders." />
        <Button label="View order" onPress={() => router.replace(`/checkout/order?id=${order.id}`)} />
        <Button label="Back to home" variant="secondary" onPress={() => router.replace('/(tabs)')} />
      </ScrollView>
    </View>
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
    alignItems: 'center',
    gap: Spacing.lg,
  },
  successIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  lead: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 300,
  },
  orderCard: {
    alignSelf: 'stretch',
    padding: Spacing.lg,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderId: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
  },
  itemMeta: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemSub: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  shipLine: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    lineHeight: 18,
  },
});
