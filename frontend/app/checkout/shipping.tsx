import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { LocationField } from '@/components/ui/location-field';
import { PhoneField } from '@/components/ui/phone-field';
import { PickerField } from '@/components/ui/picker-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { leaveCheckout, useCheckout } from '@/context/checkout-context';
import { useLive } from '@/context/live-context';
import { useListings } from '@/context/listings-context';
import { matchNigeriaState, NIGERIA_STATES } from '@/data/nigeria-states';
import { DEFAULT_COUNTRY_ISO } from '@/data/country-codes';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatPhoneE164, isValidPhone, parseStoredPhone } from '@/lib/phone';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

function isNigeriaState(value: string) {
  return NIGERIA_STATES.some((state) => state.toLowerCase() === value.trim().toLowerCase());
}

/** Best-effort city/state from profile location like "Ikeja, Lagos" or "Lagos, Nigeria". */
export function parseProfileLocation(location: string): { city: string; state: string } {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return { city: '', state: '' };

  if (parts.length === 1) {
    const only = matchNigeriaState(parts[0]);
    if (isNigeriaState(only)) return { city: '', state: only };
    return { city: parts[0], state: '' };
  }

  const last = matchNigeriaState(parts[parts.length - 1]);
  const secondLast = matchNigeriaState(parts[parts.length - 2]);

  // "City, Lagos" or "Street, Ikeja, Lagos"
  if (isNigeriaState(last)) {
    return { city: parts.slice(0, -1).join(', '), state: last };
  }
  // "Ikeja, Lagos, Nigeria"
  if (isNigeriaState(secondLast)) {
    return {
      city: parts.slice(0, -2).join(', ') || parts[0],
      state: secondLast,
    };
  }

  return { city: parts[0], state: '' };
}

function validateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter your full name.';
  if (trimmed.length < 2) return 'Name looks too short.';
  if (!/[a-zA-Z]/.test(trimmed)) return 'Enter a name using letters.';
  return null;
}

function validateAddress(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return 'Search or enter your delivery address.';
  if (trimmed.length < 5) return 'Add a fuller street or place name.';
  return null;
}

function validateCity(city: string) {
  const trimmed = city.trim();
  if (!trimmed) return 'City / area is required. Pick an address so we can fill it.';
  return null;
}

function validateState(state: string) {
  const trimmed = state.trim();
  if (!trimmed) return 'State is required. Pick a delivery address in Nigeria.';
  if (!isNigeriaState(trimmed)) return 'Choose a Nigerian state for delivery.';
  return null;
}

function validateShipping(input: {
  name: string;
  phone: string;
  countryIso: string;
  nationalNumber: string;
  address: string;
  city: string;
  state: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  if (!isValidPhone(input.countryIso, input.nationalNumber)) {
    errors.phone = 'Enter a valid phone number so the rider can reach you.';
  }
  const addressError = validateAddress(input.address);
  if (addressError) errors.address = addressError;
  const cityError = validateCity(input.city);
  if (cityError) errors.city = cityError;
  const stateError = validateState(input.state);
  if (stateError) errors.state = stateError;
  return errors;
}

export default function ShippingDetailsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const live = useLive();
  const { getListing } = useListings();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const autofilledFor = useRef<string | null>(null);

  const initialPhone = parseStoredPhone(session?.phone);
  const [countryIso, setCountryIso] = useState(initialPhone.countryIso || DEFAULT_COUNTRY_ISO);
  const [nationalNumber, setNationalNumber] = useState(initialPhone.nationalNumber);

  const draft = checkout.draft;

  // Prefill once per checkout draft from the signed-in profile.
  useEffect(() => {
    if (!draft || !session) return;
    if (autofilledFor.current === draft.listingId) return;
    autofilledFor.current = draft.listingId;

    const fromLocation = parseProfileLocation(session.location ?? '');
    const phone = parseStoredPhone(session.phone);
    if (phone.nationalNumber) {
      setCountryIso(phone.countryIso || DEFAULT_COUNTRY_ISO);
      setNationalNumber(phone.nationalNumber);
    }

    const patch: Partial<{
      name: string;
      phone: string;
      city: string;
      state: string;
      address: string;
    }> = {};

    if (!draft.name.trim() && session.name.trim()) patch.name = session.name.trim();
    if (!draft.phone.trim() && phone.nationalNumber) {
      patch.phone = formatPhoneE164(phone.countryIso || DEFAULT_COUNTRY_ISO, phone.nationalNumber);
    }
    if (!draft.city.trim() && fromLocation.city) patch.city = fromLocation.city;
    if (fromLocation.state && isNigeriaState(fromLocation.state)) {
      if (!draft.state.trim() || draft.state === 'Lagos' || draft.state === fromLocation.state) {
        patch.state = fromLocation.state;
      }
    }
    if (!draft.address.trim() && session.location.trim()) {
      patch.address = session.location.trim();
    }

    if (Object.keys(patch).length) checkout.updateDraft(patch);
  }, [checkout, draft, session]);

  // Keep draft.phone in sync with the phone field UI.
  useEffect(() => {
    if (!draft) return;
    const next = nationalNumber.trim()
      ? formatPhoneE164(countryIso, nationalNumber)
      : '';
    if (draft.phone !== next) checkout.updateDraft({ phone: next });
  }, [checkout, countryIso, draft, nationalNumber]);

  const liveErrors = useMemo(
    () =>
      validateShipping({
        name: draft?.name ?? '',
        phone: draft?.phone ?? '',
        countryIso,
        nationalNumber,
        address: draft?.address ?? '',
        city: draft?.city ?? '',
        state: draft?.state ?? '',
      }),
    [countryIso, draft?.address, draft?.city, draft?.name, draft?.phone, draft?.state, nationalNumber],
  );

  if (!draft) {
    return <Redirect href="/(tabs)" />;
  }

  const activeDraft = draft;
  const listing = live.resolveListing(activeDraft.listingId) ?? getListing(activeDraft.listingId);
  const remaining = checkout.remaining;
  const checkoutDead =
    !listing ||
    remaining <= 0 ||
    listing.status === 'sold' ||
    listing.status === 'removed';

  if (checkoutDead) {
    return <ExpiredCheckout />;
  }

  const canContinue = Object.keys(liveErrors).length === 0;
  const shownErrors = attempted ? { ...liveErrors, ...fieldErrors } : fieldErrors;

  async function cancel() {
    const liveId = await checkout.cancelCheckout();
    leaveCheckout(router, liveId, activeDraft.listingId);
  }

  async function continueNext() {
    setAttempted(true);
    const nextErrors = validateShipping({
      name: activeDraft.name,
      phone: activeDraft.phone,
      countryIso,
      nationalNumber,
      address: activeDraft.address,
      city: activeDraft.city,
      state: activeDraft.state,
    });
    setFieldErrors(nextErrors);
    setSaveError(false);
    if (Object.keys(nextErrors).length > 0) return;
    if (!isConnected) return;

    setContinuing(true);
    try {
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
          contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl }]}
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
          {attempted && !canContinue ? (
            <AlertBanner
              variant="error"
              title="Check your delivery details"
              message="Fix the highlighted fields to continue."
            />
          ) : null}

          <Text style={styles.hero}>Where should it go?</Text>
          <Text style={styles.sub}>
            We prefilled what we could from your profile — confirm the address before continuing.
          </Text>

          <View style={styles.fields}>
            <TextField
              label="Full name"
              placeholder="Chioma Eze"
              value={activeDraft.name}
              autoComplete="name"
              textContentType="name"
              error={shownErrors.name}
              onChangeText={(name) => {
                checkout.updateDraft({ name });
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              onBlur={() => {
                const nameError = validateName(activeDraft.name);
                if (nameError) setFieldErrors((current) => ({ ...current, name: nameError }));
              }}
            />

            <PhoneField
              label="Phone number"
              countryIso={countryIso}
              nationalNumber={nationalNumber}
              error={shownErrors.phone}
              onCountryChange={(iso) => {
                setCountryIso(iso);
                setFieldErrors((current) => ({ ...current, phone: undefined }));
              }}
              onNumberChange={(value) => {
                setNationalNumber(value);
                setFieldErrors((current) => ({ ...current, phone: undefined }));
              }}
              onBlur={() => {
                if (!isValidPhone(countryIso, nationalNumber)) {
                  setFieldErrors((current) => ({
                    ...current,
                    phone: 'Enter a valid phone number so the rider can reach you.',
                  }));
                }
              }}
            />
            <Text style={styles.hint}>Used to help coordinate delivery.</Text>

            <LocationField
              label="Delivery address"
              mode="address"
              placeholder="Search for a place"
              value={
                activeDraft.address
                  ? [activeDraft.address, activeDraft.city, activeDraft.state].filter(Boolean).join(', ')
                  : ''
              }
              error={shownErrors.address}
              hint="Search a Nigerian delivery address. City and state fill in when available."
              onSelect={(place) => {
                checkout.updateDraft({
                  address: place.addressLine || place.formattedAddress,
                  city: place.city || place.label.split(',')[0]?.trim() || '',
                  state: matchNigeriaState(place.state),
                });
                setFieldErrors((current) => ({
                  ...current,
                  address: undefined,
                  city: undefined,
                  state: undefined,
                }));
              }}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <TextField
                  label="City / area"
                  placeholder="e.g. Ikeja"
                  value={activeDraft.city}
                  error={shownErrors.city}
                  onChangeText={(city) => {
                    checkout.updateDraft({ city });
                    setFieldErrors((current) => ({ ...current, city: undefined }));
                  }}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>State</Text>
                <PickerField
                  value={isNigeriaState(activeDraft.state) ? matchNigeriaState(activeDraft.state) : ''}
                  options={[...NIGERIA_STATES]}
                  placeholder="Select state"
                  error={shownErrors.state}
                  onSelect={(state) => {
                    checkout.updateDraft({ state });
                    setFieldErrors((current) => ({ ...current, state: undefined }));
                  }}
                />
              </View>
            </View>

            <TextField
              label="Delivery note (optional)"
              placeholder="Landmark or gate instructions."
              value={activeDraft.deliveryNote}
              multiline
              style={styles.noteInput}
              onChangeText={(deliveryNote) => checkout.updateDraft({ deliveryNote })}
            />
          </View>

          <Button
            label={continuing ? 'Continuing...' : 'Continue'}
            loading={continuing}
            disabled={!isConnected || continuing}
            onPress={() => void continueNext()}
            style={styles.cta}
          />
          {!canContinue ? (
            <Text style={styles.helper}>
              Name, phone, and a full Nigerian delivery address are required.
            </Text>
          ) : (
            <Text style={styles.helper}>Next: choose your delivery method.</Text>
          )}
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
  hint: {
    marginTop: -10,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
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
    marginBottom: Spacing.md,
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
