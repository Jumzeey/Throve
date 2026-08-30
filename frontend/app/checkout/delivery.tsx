import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { leaveCheckout, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { DELIVERY_OPTIONS } from '@/data/checkout';
import { getListingImage } from '@/data/images';
import type { DeliveryMethod } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatCountdown, formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

export default function DeliveryMethodScreen() {
  const router = useRouter();
  const live = useLive();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId);
  const remaining = checkout.remaining;
  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  const listingId = draft.listingId;
  const selected = draft.deliveryMethod;

  async function cancel() {
    const liveId = await checkout.cancelCheckout();
    leaveCheckout(router, liveId, listingId);
  }

  function selectMethod(method: DeliveryMethod) {
    checkout.updateDraft({ deliveryMethod: method });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Delivery" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        {!isConnected ? <OfflineBanner message="Reconnect to continue checkout." /> : null}
        <AlertBanner
          variant="info"
          title={remaining > 0 ? `Reserved for you — ${formatCountdown(remaining)}` : 'Reservation expired'}
        />
        <View style={styles.itemCard}>
          <AppImage source={getListingImage(listing.id)} style={styles.thumb} />
          <View style={styles.itemMeta}>
            <Text style={styles.itemTitle}>{listing.title}</Text>
            <Text style={styles.itemPrice}>{formatNaira(listing.price)}</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Choose delivery</Text>
        <View style={styles.options}>
          {DELIVERY_OPTIONS.map((option) => {
            const active = selected === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => selectMethod(option.value)}
                style={[styles.option, active ? styles.optionActive : null]}>
                <View style={[styles.radio, active ? styles.radioActive : null]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.optionBody}>
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionFee}>{formatNaira(option.fee)}</Text>
                  </View>
                  <Text style={styles.optionEta}>{option.eta}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Button
          label="Continue to summary"
          onPress={() => router.push('/checkout/summary')}
          disabled={!isConnected}
          style={styles.cta}
        />
        <Button label="Cancel checkout" variant="ghost" onPress={cancel} />
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
    gap: Spacing.lg,
  },
  itemCard: {
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
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
  },
  itemMeta: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemPrice: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: Typography.display,
    color: Palette.plum,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  options: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
  },
  optionActive: {
    borderColor: Palette.plum,
    backgroundColor: Palette.ivoryElevated,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioActive: {
    borderColor: Palette.plum,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.plum,
  },
  optionBody: { flex: 1 },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  optionFee: {
    fontSize: 14,
    fontFamily: Typography.display,
    color: Palette.plum,
  },
  optionEta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  cta: { marginTop: Spacing.sm },
});
