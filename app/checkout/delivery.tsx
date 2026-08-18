import { Button } from '@/components/ui/button';
import { ReserveNotice } from '@/components/ui/reserve-notice';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { DELIVERY_OPTIONS } from '@/data/checkout';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
            <Pressable
              key={option.value}
              onPress={() => checkout.updateDraft({ deliveryMethod: option.value })}
              style={[styles.option, active ? styles.optionOn : styles.optionOff]}>
              <Text style={[styles.optionLabel, active ? styles.onText : null]}>{option.label}</Text>
              <Text style={[styles.optionEta, active ? styles.onText : null]}>{option.eta}</Text>
              <Text style={[styles.optionFee, active ? styles.onText : null]}>{formatNaira(option.fee)}</Text>
            </Pressable>
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
  option: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionOn: {
    backgroundColor: Palette.text,
    borderColor: Palette.text,
  },
  optionOff: {
    backgroundColor: Palette.background,
    borderColor: Palette.border,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
  optionEta: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  optionFee: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
  },
  onText: {
    color: Palette.background,
  },
  cta: {
    marginTop: 14,
  },
});
