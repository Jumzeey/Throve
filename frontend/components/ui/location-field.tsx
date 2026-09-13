import { MapPinIcon, SearchIcon, CloseIcon } from '@/components/ui/icons';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useKeyboardDockPadding } from '@/hooks/use-keyboard-bottom-inset';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import {
  createPlacesSession,
  fetchPlaceDetails,
  fetchStaticMapDataUri,
  googleMapsAppUrl,
  placesEnabled,
  reverseGeocodeCoords,
  searchPlaces,
  type ResolvedPlace,
  type PlaceSuggestion,
} from '@/lib/places';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  hint?: string | null;
  error?: string | null;
  regionCode?: string;
  /** profile = city/region label; address = full delivery place */
  mode?: 'profile' | 'address';
  /**
   * When true, the user must pick a suggestion (or current location).
   * Free-typed “Use this location” is disabled — used for checkout delivery.
   */
  requireListSelection?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onSelect: (place: ResolvedPlace) => void;
  onFocus?: () => void;
};

export function isResolvedPlacesPick(place: ResolvedPlace) {
  return Boolean(place.placeId) && !place.placeId.startsWith('manual:');
}

/** Display string for form fields (profile city label preferred). */
export function placeDisplayLabel(place: ResolvedPlace, mode: 'profile' | 'address' = 'profile') {
  if (mode === 'address') {
    return (
      place.formattedAddress?.trim() ||
      place.addressLine?.trim() ||
      place.label?.trim() ||
      [place.city, place.state].filter(Boolean).join(', ')
    );
  }
  return (
    place.label?.trim() ||
    [place.city, place.state].filter(Boolean).join(', ') ||
    place.formattedAddress?.trim() ||
    place.addressLine?.trim() ||
    ''
  );
}

export function LocationField({
  label = 'Location',
  value,
  placeholder = 'Search for a place',
  hint,
  error,
  regionCode = 'NG',
  mode = 'profile',
  requireListSelection = false,
  containerStyle,
  onSelect,
  onFocus,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => {
          onFocus?.();
          setOpen(true);
        }}
        style={[styles.field, error ? styles.fieldError : null]}>
        <MapPinIcon size={16} color={Palette.plum} />
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={2}>
          {value || placeholder}
        </Text>
        <SearchIcon size={16} color={Palette.muted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <LocationPickerModal
        visible={open}
        mode={mode}
        regionCode={regionCode}
        requireListSelection={requireListSelection}
        initialQuery={value}
        onClose={() => setOpen(false)}
        onSelect={(place) => {
          onSelect(place);
          setOpen(false);
        }}
      />
    </View>
  );
}

function placeFromManual(text: string, mode: 'profile' | 'address'): ResolvedPlace {
  const trimmed = text.trim();
  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (mode === 'profile') {
    return {
      placeId: `manual:${trimmed}`,
      label: trimmed,
      formattedAddress: trimmed,
      addressLine: trimmed,
      city: parts[0] ?? '',
      state: parts[1] ?? '',
      country: parts[2] ?? '',
      postalCode: null,
      lat: null,
      lng: null,
    };
  }
  return {
    placeId: `manual:${trimmed}`,
    label: trimmed,
    formattedAddress: trimmed,
    addressLine: parts[0] ?? trimmed,
    city: parts[1] ?? '',
    state: parts[2] ?? '',
    country: 'Nigeria',
    postalCode: null,
    lat: null,
    lng: null,
  };
}

function friendlyPlacesError(err: unknown, requireListSelection: boolean) {
  const raw = err instanceof Error ? err.message : '';
  if (/not configured|GOOGLE_MAPS|503|API key/i.test(raw)) {
    return requireListSelection
      ? 'Place search is unavailable right now. Try again shortly — you must pick an address from the list.'
      : 'Place search is unavailable right now. You can type your location instead.';
  }
  if (/network|fetch|failed/i.test(raw)) {
    return requireListSelection
      ? 'We couldn’t reach place search. Check your connection and try again.'
      : 'We couldn’t reach place search. Check your connection, or type your location.';
  }
  return requireListSelection
    ? 'We couldn’t load places. Try again and select an address from the list.'
    : 'We couldn’t load places. Try again, or type your location.';
}

function LocationPickerModal({
  visible,
  mode,
  regionCode,
  requireListSelection,
  initialQuery,
  onClose,
  onSelect,
}: {
  visible: boolean;
  mode: 'profile' | 'address';
  regionCode: string;
  requireListSelection: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSelect: (place: ResolvedPlace) => void;
}) {
  const { top, bottom } = useScreenInsets();
  const padBottom = useKeyboardDockPadding(12, bottom + 12);
  const [enabled, setEnabled] = useState(true);
  const [query, setQuery] = useState(initialQuery ?? '');
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ResolvedPlace | null>(null);
  const [mapUri, setMapUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowManual = !requireListSelection;

  // Only reset when the modal opens. Do not depend on initialQuery — a parent
  // value update while open (after onSelect) would wipe the pending preview.
  useEffect(() => {
    if (!visible) return;
    setQuery(initialQuery ?? '');
    setSuggestions([]);
    setPreview(null);
    setMapUri(null);
    setError(null);
    setResolvingId(null);
    void placesEnabled()
      .then((ok) => setEnabled(ok))
      .catch(() => setEnabled(false));
    void createPlacesSession()
      .then(setSessionToken)
      .catch(() => setSessionToken(undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed from initialQuery only on open
  }, [visible]);

  const runSearch = useCallback(
    async (text: string, token?: string) => {
      if (!enabled) return;
      if (text.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const results = await searchPlaces(text, token, regionCode);
        setSuggestions(results);
      } catch (err) {
        setSuggestions([]);
        const message = friendlyPlacesError(err, requireListSelection);
        if (allowManual && /unavailable right now|type your location/i.test(message)) {
          setEnabled(false);
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [allowManual, enabled, regionCode, requireListSelection],
  );

  useEffect(() => {
    if (!visible || !enabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query, sessionToken);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, query, runSearch, sessionToken, visible]);

  function applyPlace(place: ResolvedPlace) {
    Keyboard.dismiss();
    onSelect(place);
  }

  async function pickSuggestion(item: PlaceSuggestion) {
    setResolvingId(item.placeId);
    setError(null);
    try {
      const place = await fetchPlaceDetails(item.placeId, sessionToken);
      // Profile location: apply immediately so the form field updates without a
      // second "Use this location" tap (easy to miss under the keyboard).
      if (mode === 'profile') {
        applyPlace(place);
        return;
      }
      Keyboard.dismiss();
      setPreview(place);
      if (place.lat != null && place.lng != null) {
        const uri = await fetchStaticMapDataUri(place.lat, place.lng);
        setMapUri(uri);
      } else {
        setMapUri(null);
      }
    } catch (err) {
      setError(friendlyPlacesError(err, requireListSelection));
    } finally {
      setResolvingId(null);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          requireListSelection
            ? 'Allow location access, or search and select an address from the list.'
            : 'Allow location access to use your current position, or type your location below.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const place = await reverseGeocodeCoords(position.coords.latitude, position.coords.longitude);
      if (mode === 'profile') {
        applyPlace(place);
        return;
      }
      Keyboard.dismiss();
      setPreview(place);
      setQuery(place.formattedAddress || place.label);
      if (place.lat != null && place.lng != null) {
        setMapUri(await fetchStaticMapDataUri(place.lat, place.lng));
      }
    } catch (err) {
      setError(friendlyPlacesError(err, requireListSelection));
      if (allowManual) setEnabled(false);
    } finally {
      setLocating(false);
    }
  }

  function confirmPreview() {
    if (!preview) return;
    if (requireListSelection && !isResolvedPlacesPick(preview)) {
      setError('Select an address from the search results to continue.');
      return;
    }
    applyPlace(preview);
  }

  function confirmManual() {
    if (!allowManual) {
      setError('Select an address from the list — typed addresses are not accepted.');
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Enter a location to continue.');
      return;
    }
    applyPlace(placeFromManual(trimmed, mode));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { paddingTop: top + 8, paddingBottom: padBottom }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose location</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <CloseIcon size={14} color={Palette.espresso} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <SearchIcon size={16} color={Palette.muted} />
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setPreview(null);
              setMapUri(null);
              setError(null);
            }}
            placeholder={
              mode === 'address'
                ? enabled
                  ? 'Street, area, or landmark'
                  : allowManual
                    ? 'Type your delivery address'
                    : 'Search requires Maps — try again'
                : enabled
                  ? 'City, area, or landmark'
                  : 'Type your city or area'
            }
            placeholderTextColor={Palette.disabled}
            style={styles.searchInput}
            autoFocus
            returnKeyType={enabled || !allowManual ? 'search' : 'done'}
            onSubmitEditing={() => {
              if (!enabled && allowManual) confirmManual();
            }}
          />
          {loading ? <ActivityIndicator color={Palette.plum} /> : null}
        </View>

        {enabled ? (
          <Pressable
            onPress={() => void useCurrentLocation()}
            disabled={locating}
            style={({ pressed }) => [styles.currentBtn, pressed && styles.pressed]}>
            {locating ? <ActivityIndicator color={Palette.plum} /> : <MapPinIcon size={15} color={Palette.plum} />}
            <Text style={styles.currentLabel}>{locating ? 'Finding you…' : 'Use current location'}</Text>
          </Pressable>
        ) : allowManual ? (
          <Text style={styles.manualHint}>Type your location, then confirm below.</Text>
        ) : (
          <Text style={styles.manualHint}>
            Delivery address must be selected from the map results. Place search is offline — close and try again.
          </Text>
        )}

        {error ? <Text style={styles.modalError}>{error}</Text> : null}

        {!enabled && allowManual ? (
          <Pressable
            onPress={confirmManual}
            style={({ pressed }) => [styles.primaryAction, styles.manualConfirm, pressed && styles.pressed]}>
            <Text style={styles.primaryActionLabel}>Use this location</Text>
          </Pressable>
        ) : preview ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.previewScroll}
            showsVerticalScrollIndicator={false}>
            <View style={styles.previewCard}>
              {mapUri ? <Image source={{ uri: mapUri }} style={styles.map} resizeMode="cover" /> : null}
              <Text style={styles.previewTitle}>
                {mode === 'profile' ? placeDisplayLabel(preview, 'profile') : placeDisplayLabel(preview, 'address')}
              </Text>
              {mode === 'profile' &&
              preview.formattedAddress &&
              preview.formattedAddress !== placeDisplayLabel(preview, 'profile') ? (
                <Text style={styles.previewSub}>{preview.formattedAddress}</Text>
              ) : null}
              <View style={styles.previewActions}>
                <Pressable
                  onPress={() => void Linking.openURL(googleMapsAppUrl(preview))}
                  style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionLabel}>Open in Maps</Text>
                </Pressable>
                <Pressable onPress={confirmPreview} style={styles.primaryAction}>
                  <Text style={styles.primaryActionLabel}>Use this location</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        ) : enabled ? (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.placeId}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              query.trim().length >= 2 && !loading ? (
                <Text style={styles.empty}>No matching places. Try a nearby landmark or street.</Text>
              ) : (
                <Text style={styles.empty}>Search and select a place from the list to continue.</Text>
              )
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => void pickSuggestion(item)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                <MapPinIcon size={16} color={Palette.plum} />
                <View style={styles.suggestionCopy}>
                  <Text style={styles.suggestionPrimary}>{item.primaryText}</Text>
                  {item.secondaryText ? (
                    <Text style={styles.suggestionSecondary}>{item.secondaryText}</Text>
                  ) : null}
                </View>
                {resolvingId === item.placeId ? <ActivityIndicator color={Palette.plum} /> : null}
              </Pressable>
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  field: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldError: {
    borderColor: Palette.errorBorder,
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  placeholder: {
    color: Palette.disabled,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.error,
  },
  hint: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  modal: {
    flex: 1,
    backgroundColor: Palette.ivory,
    paddingHorizontal: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  searchRow: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.espresso,
    paddingVertical: 12,
  },
  currentBtn: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Palette.plum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.ivoryElevated,
  },
  currentLabel: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  manualHint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  manualConfirm: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  modalError: {
    marginTop: 10,
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.error,
  },
  list: {
    paddingTop: 14,
    paddingBottom: 40,
    gap: 4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  suggestionCopy: { flex: 1, gap: 2 },
  suggestionPrimary: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  suggestionSecondary: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  empty: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  previewScroll: {
    paddingTop: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  previewCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 160,
    backgroundColor: Palette.sand,
  },
  previewTitle: {
    paddingHorizontal: 14,
    paddingTop: 14,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  previewSub: {
    paddingHorizontal: 14,
    paddingTop: 4,
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.body,
  },
  primaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.button,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  pressed: { opacity: 0.88 },
});
