import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { ReserveNotice } from '@/components/ui/reserve-notice';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { leaveCheckout, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ShippingDetailsScreen() {
  const router = useRouter();
  const live = useLive();
  const checkout = useCheckout();
  const [error, setError] = useState<string | null>(null);
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const currentDraft = draft;
  const listing = live.resolveListing(currentDraft.listingId);
  const remaining = checkout.remaining;

  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  const name = currentDraft.name;
  const address = currentDraft.address;
  const city = currentDraft.city;
  const phone = currentDraft.phone;

  function cancel() {
    const liveId = checkout.cancelCheckout();
    leaveCheckout(router, liveId, currentDraft.listingId);
  }

  function continueNext() {
    if (!name.trim() || !address.trim() || !city.trim() || !phone.trim()) {
      setError('Fill in your full shipping address.');
      return;
    }
    router.push('/checkout/delivery');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Shipping details" onBack={cancel} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ReserveNotice remaining={remaining} extra="Prototype purchase — no real money will be charged" />
        <View style={styles.item}>
          <PlaceholderImage style={styles.thumb} />
          <View>
            <Text style={styles.itemTitle}>{listing.title}</Text>
            <Text style={styles.itemMeta}>{formatNaira(listing.price)}</Text>
          </View>
        </View>
        <Text style={styles.section}>Test/demo shipping address</Text>
        <TextField placeholder="Full name" value={draft.name} onChangeText={(name) => { checkout.updateDraft({ name }); setError(null); }} />
        <TextField placeholder="Street address" value={draft.address} onChangeText={(address) => { checkout.updateDraft({ address }); setError(null); }} />
        <TextField placeholder="City" value={draft.city} onChangeText={(city) => { checkout.updateDraft({ city }); setError(null); }} />
        <TextField
          placeholder="Phone number"
          value={draft.phone}
          keyboardType="phone-pad"
          onChangeText={(phone) => { checkout.updateDraft({ phone }); setError(null); }}
        />
        <Text style={styles.hint}>This address is used for this prototype order only and is not saved to your account.</Text>
        <ErrorBanner message={error} />
        <Button label="Continue" onPress={continueNext} style={styles.cta} />
      </ScrollView>
    </View>
  );
}

export function ExpiredCheckout() {
  const router = useRouter();
  const checkout = useCheckout();
  const listingId = checkout.draft?.listingId;
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Checkout"
        onBack={() => {
          const liveId = checkout.cancelCheckout();
          leaveCheckout(router, liveId, listingId);
        }}
      />
      <View style={styles.expiredBody}>
        <Text style={styles.expired}>Reservation expired. The listing is available again.</Text>
        <Button
          label={checkout.draft?.liveSessionId ? 'Back to Live' : 'Back'}
          onPress={() => {
            const liveId = checkout.cancelCheckout();
            leaveCheckout(router, liveId, listingId);
          }}
        />
      </View>
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
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: 10,
    marginBottom: 6,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  section: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 11,
    color: Palette.muted3,
  },
  cta: {
    marginTop: 8,
  },
  expiredBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  expired: {
    fontSize: 14,
    lineHeight: 22,
    color: Palette.muted,
  },
});
