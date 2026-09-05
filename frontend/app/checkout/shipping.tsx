import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { ChevronDownIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { leaveCheckout, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { NIGERIA_STATES } from '@/data/nigeria-states';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type FieldErrors = {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
};

function validatePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return 'Enter a complete phone number so you can be contacted about delivery.';
  }
  return null;
}

export default function ShippingDetailsScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const live = useLive();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const draft = checkout.draft;

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const listing = live.resolveListing(draft.listingId);
  const remaining = checkout.remaining;

  if (!listing || listing.status === 'available' || remaining <= 0) {
    return <ExpiredCheckout />;
  }

  const canContinue = Boolean(
    draft.name.trim() &&
      draft.address.trim() &&
      draft.city.trim() &&
      draft.state.trim() &&
      draft.phone.trim() &&
      !validatePhone(draft.phone),
  );

  async function cancel() {
    const liveId = await checkout.cancelCheckout();
    leaveCheckout(router, liveId, draft.listingId);
  }

  async function continueNext() {
    const nextErrors: FieldErrors = {};
    if (!draft.name.trim()) nextErrors.name = 'Enter your full name.';
    if (!draft.address.trim()) nextErrors.address = 'Enter the delivery address.';
    if (!draft.city.trim()) nextErrors.city = 'Enter your city or area.';
    if (!draft.state.trim()) nextErrors.state = 'Select a state.';
    const phoneError = validatePhone(draft.phone);
    if (phoneError) nextErrors.phone = phoneError;
    setFieldErrors(nextErrors);
    setSaveError(false);

    if (Object.keys(nextErrors).length > 0) return;
    if (!isConnected) return;

    setContinuing(true);
    try {
      // Shipping is held on the local reservation draft until payment completes.
      await new Promise((resolve) => setTimeout(resolve, 280));
      router.push('/checkout/delivery');
    } catch {
      setSaveError(true);
    } finally {
      setContinuing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Checkout" onBack={cancel} />
      <CheckoutProgress step={1} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl + bottom }]}
          keyboardShouldPersistTaps="handled">
          {!isConnected ? (
            <OfflineBanner title="No connection" message="Reconnect to continue checkout." />
          ) : null}
          {saveError ? (
            <AlertBanner
              variant="error"
              title="We couldn't save these details"
              message="Please try again in a moment."
            />
          ) : null}

          <Text style={styles.hero}>Where should it go?</Text>
          <Text style={styles.sub}>Enter the delivery details for this order.</Text>

          <View style={styles.fields}>
            <TextField
              label="Full name"
              placeholder="Chioma Eze"
              value={draft.name}
              autoComplete="name"
              error={fieldErrors.name}
              onChangeText={(name) => {
                checkout.updateDraft({ name });
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
            />
            <TextField
              label="Phone number"
              placeholder="+234 802 445 1141"
              value={draft.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={fieldErrors.phone}
              hint="Used to help coordinate delivery."
              onChangeText={(phone) => {
                checkout.updateDraft({ phone });
                setFieldErrors((current) => ({ ...current, phone: undefined }));
              }}
            />
            <TextField
              label="Address"
              placeholder="14B Bourdillon Road"
              value={draft.address}
              autoComplete="street-address"
              error={fieldErrors.address}
              onChangeText={(address) => {
                checkout.updateDraft({ address });
                setFieldErrors((current) => ({ ...current, address: undefined }));
              }}
            />

            <View style={styles.row}>
              <TextField
                label="City / area"
                placeholder="Ikoyi"
                value={draft.city}
                containerStyle={styles.half}
                error={fieldErrors.city}
                onChangeText={(city) => {
                  checkout.updateDraft({ city });
                  setFieldErrors((current) => ({ ...current, city: undefined }));
                }}
              />
              <View style={styles.half}>
                <Text style={styles.label}>State</Text>
                <Pressable
                  onPress={() => setStateOpen(true)}
                  style={[styles.stateField, fieldErrors.state ? styles.stateError : null]}>
                  <Text style={styles.stateValue}>{draft.state || 'Select state'}</Text>
                  <ChevronDownIcon color={Palette.muted} />
                </Pressable>
                {fieldErrors.state ? <Text style={styles.errorText}>{fieldErrors.state}</Text> : null}
              </View>
            </View>

            <TextField
              label="Delivery note (optional)"
              placeholder="Landmark or gate instructions."
              value={draft.deliveryNote}
              multiline
              style={styles.noteInput}
              onChangeText={(deliveryNote) => checkout.updateDraft({ deliveryNote })}
            />
          </View>

          <Button
            label={continuing ? 'Continuing...' : 'Continue'}
            loading={continuing}
            disabled={!isConnected || !canContinue || continuing}
            onPress={continueNext}
            style={styles.cta}
          />
          {!canContinue ? (
            <Text style={styles.helper}>Continue stays disabled until every required field is complete.</Text>
          ) : (
            <Text style={styles.helper}>Next: choose your delivery method.</Text>
          )}

          <Text style={styles.footerNote}>
            Checkout collects delivery information only — never ID documents, bank details or payout information.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={stateOpen} transparent animationType="slide" onRequestClose={() => setStateOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setStateOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: bottom + 12 }]} onPress={() => undefined}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select state</Text>
            <ScrollView style={styles.stateList}>
              {NIGERIA_STATES.map((state) => (
                <Pressable
                  key={state}
                  onPress={() => {
                    checkout.updateDraft({ state });
                    setFieldErrors((current) => ({ ...current, state: undefined }));
                    setStateOpen(false);
                  }}
                  style={styles.stateRow}>
                  <Text style={[styles.stateRowLabel, draft.state === state ? styles.stateRowOn : null]}>{state}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
        <View style={styles.expiredCard}>
          <Text style={styles.expiredTitle}>Reservation expired</Text>
          <Text style={styles.expiredCopy}>
            The listing is available again. Return to browse or claim it once more.
          </Text>
        </View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  flex: { flex: 1 },
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
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  fields: {
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    marginBottom: 7,
  },
  stateField: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 15,
    backgroundColor: Palette.ivoryElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateError: {
    borderColor: Palette.error,
    borderWidth: 1.5,
  },
  stateValue: {
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.error,
  },
  noteInput: {
    minHeight: 88,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },
  cta: {
    marginTop: Spacing.md,
  },
  helper: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  footerNote: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  overlay: {
    flex: 1,
    backgroundColor: Palette.liveOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    marginBottom: 8,
  },
  sheetTitle: {
    paddingHorizontal: Spacing.xl,
    marginBottom: 8,
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  stateList: {
    paddingHorizontal: Spacing.xl,
  },
  stateRow: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  stateRowLabel: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  stateRowOn: {
    color: Palette.plum,
    fontFamily: Typography.bodySemiBold,
  },
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
