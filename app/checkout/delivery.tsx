import { Button } from '@/components/ui/button';
import { RadioCard } from '@/components/ui/radio-card';
import { ReserveNotice } from '@/components/ui/reserve-notice';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { DELIVERY_OPTIONS } from '@/data/checkout';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

export default function DeliveryMethodScreen() {
  const router = useRouter();
  const live = useLive();
  const checkout = useCheckout();
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId);
  const remaining = checkout.remaining;
  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Delivery method" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <ReserveNotice remaining={remaining} />
        {DELIVERY_OPTIONS.map((option) => {
          const active = draft.deliveryMethod === option.value;
          return (
            <RadioCard
              key={option.value}
              selected={active}
              title={option.label}
              subtitle={option.eta}
              right={formatNaira(option.fee)}
              onPress={() => checkout.updateDraft({ deliveryMethod: option.value })}
            />
          );
        })}
        <Button label="Continue" onPress={() => router.push('/checkout/summary')} style={styles.cta} />
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
    gap: 10,
  },
  cta: {
    marginTop: 14,
  },
});
