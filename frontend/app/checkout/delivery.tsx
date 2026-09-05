import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { DELIVERY_OPTIONS, getDeliveryOption } from '@/data/checkout';
import type { DeliveryMethod } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpiredCheckout } from './shipping';

export default function DeliveryMethodScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const live = useLive();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const draft = checkout.draft;

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    setLoadError(false);
    const timer = setTimeout(() => {
      if (cancelled) return;
      // Rates are catalog-backed (Standard / Express) — same fees as backend shippingFee().
      if (!isConnected) {
        setLoadError(true);
        setLoadingOptions(false);
        return;
      }
      setLoadingOptions(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isConnected]);

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId);
  const remaining = checkout.remaining;
  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  const selected = draft.deliveryMethod;
  const deliveryFee = selected ? getDeliveryOption(selected).fee : null;
  const locationLine = [draft.city, draft.state].filter(Boolean).join(', ');

  function selectMethod(method: DeliveryMethod) {
    checkout.updateDraft({ deliveryMethod: method });
  }

  function continueNext() {
    if (!selected || !isConnected) return;
    router.push('/checkout/summary');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Checkout" onBack={() => router.back()} />
      <CheckoutProgress step={2} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 140 + bottom }]}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to continue checkout." />
        ) : null}
        {loadError && isConnected ? (
          <AlertBanner
            variant="error"
            title="We couldn't load delivery options"
            message="Please try again in a moment."
          />
        ) : null}

        <Text style={styles.hero}>Delivery method</Text>
        {locationLine ? <Text style={styles.sub}>Delivering to {locationLine}.</Text> : null}

        {loadingOptions ? (
          <View style={styles.skeletonList}>
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
          </View>
        ) : (
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
        )}

        <Text style={styles.note}>One delivery method applies to the order.</Text>
        <Text style={styles.footerNote}>
          Standard and Express are the only current rates — no location tiers, courier choice or seller-set pricing.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottom, 12) + 8 }]}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>Delivery</Text>
          <Text style={styles.footerValue}>{deliveryFee != null ? formatNaira(deliveryFee) : '—'}</Text>
        </View>
        <Button
          label="Continue"
          onPress={continueNext}
          disabled={!isConnected || !selected || loadingOptions}
          style={styles.cta}
        />
        {!selected ? <Text style={styles.helper}>Choose a delivery method to continue</Text> : null}
      </View>
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
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  hero: {
    fontFamily: Typography.display,
    fontSize: 26,
    lineHeight: 30,
    color: Palette.espresso,
  },
  sub: {
    marginTop: -4,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  options: {
    gap: 10,
    marginTop: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
  },
  optionActive: {
    borderColor: Palette.plum,
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
    backgroundColor: 'rgba(90,31,69,0.08)',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.plum,
  },
  optionBody: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  optionFee: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  optionEta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  note: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  footerNote: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  skeletonList: {
    gap: 10,
    marginTop: Spacing.sm,
  },
  skeleton: {
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Palette.skeleton,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivoryElevated,
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    gap: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  footerValue: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    fontVariant: ['tabular-nums'],
  },
  cta: {
    minHeight: 52,
  },
  helper: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
});
