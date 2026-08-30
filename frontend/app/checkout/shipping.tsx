import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { leaveCheckout, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { getListingImage } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatCountdown, formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ShippingDetailsScreen() {
  const router = useRouter();
  const live = useLive();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
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

  async function cancel() {
    const liveId = await checkout.cancelCheckout();
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
      <ScreenHeader title="Shipping" onBack={cancel} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!isConnected ? <OfflineBanner message="Reconnect to continue checkout." /> : null}
          <AlertBanner
            variant="info"
            title={remaining > 0 ? `Reserved for you — ${formatCountdown(remaining)}` : 'Reservation expired'}
            message="Prototype purchase — no real money will be charged."
          />
          <View style={styles.itemCard}>
            <AppImage source={getListingImage(listing.id)} style={styles.thumb} />
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>{listing.title}</Text>
              <Text style={styles.itemPrice}>{formatNaira(listing.price)}</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Shipping address</Text>
          <View style={styles.fields}>
            <TextField
              label="Full name"
              placeholder="Ada Okonkwo"
              value={draft.name}
              onChangeText={(name) => {
                checkout.updateDraft({ name });
                setError(null);
              }}
            />
            <TextField
              label="Street address"
              placeholder="12 Marina Road"
              value={draft.address}
              onChangeText={(address) => {
                checkout.updateDraft({ address });
                setError(null);
              }}
            />
            <TextField
              label="City"
              placeholder="Lagos"
              value={draft.city}
              onChangeText={(city) => {
                checkout.updateDraft({ city });
                setError(null);
              }}
            />
            <TextField
              label="Phone number"
              placeholder="+234 800 000 0000"
              value={draft.phone}
              keyboardType="phone-pad"
              onChangeText={(phone) => {
                checkout.updateDraft({ phone });
                setError(null);
              }}
              hint="Used for this prototype order only — not saved to your account."
            />
          </View>
          {error ? <AlertBanner variant="error" title="Missing details" message={error} /> : null}
          <Button label="Continue" onPress={continueNext} disabled={!isConnected} style={styles.cta} />
        </ScrollView>
      </KeyboardAvoidingView>
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
        onBack={async () => {
          const liveId = await checkout.cancelCheckout();
          leaveCheckout(router, liveId, listingId);
        }}
      />
      <View style={styles.expiredBody}>
        <EmptyExpired />
        <Button
          label={checkout.draft?.liveSessionId ? 'Back to live' : 'Back to item'}
          onPress={async () => {
            const liveId = await checkout.cancelCheckout();
            leaveCheckout(router, liveId, listingId);
          }}
        />
      </View>
    </View>
  );
}

function EmptyExpired() {
  return (
    <View style={styles.expiredCard}>
      <Text style={styles.expiredTitle}>Reservation expired</Text>
      <Text style={styles.expiredCopy}>The listing is available again. Return to browse or claim it once more.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  flex: { flex: 1 },
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
  fields: { gap: Spacing.lg },
  cta: { marginTop: Spacing.sm },
  expiredBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.xl,
  },
  expiredCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  expiredTitle: {
    fontFamily: Typography.display,
    fontSize: 19,
    color: Palette.espresso,
    textAlign: 'center',
  },
  expiredCopy: {
    marginTop: Spacing.sm,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
});
