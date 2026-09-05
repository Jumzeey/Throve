import { MapPinIcon, SearchIcon, CloseIcon } from '@/components/ui/icons';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
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
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  hint?: string | null;
  error?: string | null;
  regionCode?: string;
  /** profile = city/region label; address = full delivery place */
  mode?: 'profile' | 'address';
  containerStyle?: StyleProp<ViewStyle>;
  onSelect: (place: ResolvedPlace) => void;
  onFocus?: () => void;
};

export function LocationField({
  label = 'Location',
  value,
  placeholder = 'Search Google Maps',
  hint,
  error,
  regionCode = 'NG',
  mode = 'profile',
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

function LocationPickerModal({
  visible,
  mode,
  regionCode,
  initialQuery,
  onClose,
  onSelect,
}: {
  visible: boolean;
  mode: 'profile' | 'address';
  regionCode: string;
  initialQuery?: string;
  onClose: () => void;
  onSelect: (place: ResolvedPlace) => void;
}) {
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    if (!visible) return;
    setQuery(initialQuery ?? '');
    setSuggestions([]);
    setPreview(null);
    setMapUri(null);
    setError(null);
    void placesEnabled().then(setEnabled);
    void createPlacesSession()
      .then(setSessionToken)
      .catch(() => setSessionToken(undefined));
  }, [visible, initialQuery]);

  const runSearch = useCallback(
    async (text: string, token?: string) => {
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
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [regionCode],
  );

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query, sessionToken);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, sessionToken, visible]);

  async function pickSuggestion(item: PlaceSuggestion) {
    setResolvingId(item.placeId);
    setError(null);
    try {
      const place = await fetchPlaceDetails(item.placeId, sessionToken);
      setPreview(place);
      if (place.lat != null && place.lng != null) {
        const uri = await fetchStaticMapDataUri(place.lat, place.lng);
        setMapUri(uri);
      } else {
        setMapUri(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load place');
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
        setError('Location permission is required to use your current position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const place = await reverseGeocodeCoords(position.coords.latitude, position.coords.longitude);
      setPreview(place);
      setQuery(mode === 'profile' ? place.label : place.formattedAddress);
      if (place.lat != null && place.lng != null) {
        setMapUri(await fetchStaticMapDataUri(place.lat, place.lng));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get current location');
    } finally {
      setLocating(false);
    }
  }

  function confirmPreview() {
    if (!preview) return;
    onSelect(preview);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose location</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <CloseIcon size={14} color={Palette.espresso} />
          </Pressable>
        </View>

        {!enabled ? (
          <View style={styles.disabledBox}>
            <Text style={styles.disabledTitle}>Google Maps isn’t configured yet</Text>
            <Text style={styles.disabledBody}>
              Add GOOGLE_MAPS_API_KEY on the backend (Places API New, Geocoding, Maps Static) to enable live place
              search.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.searchRow}>
              <SearchIcon size={16} color={Palette.muted} />
              <TextInput
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setPreview(null);
                  setMapUri(null);
                }}
                placeholder={mode === 'address' ? 'Search address on Google Maps' : 'City, area, or landmark'}
                placeholderTextColor={Palette.disabled}
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
              />
              {loading ? <ActivityIndicator color={Palette.plum} /> : null}
            </View>

            <Pressable
              onPress={() => void useCurrentLocation()}
              disabled={locating}
              style={({ pressed }) => [styles.currentBtn, pressed && styles.pressed]}>
              {locating ? (
                <ActivityIndicator color={Palette.plum} />
              ) : (
                <MapPinIcon size={15} color={Palette.plum} />
              )}
              <Text style={styles.currentLabel}>{locating ? 'Finding you…' : 'Use current location'}</Text>
            </Pressable>

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            {preview ? (
              <View style={styles.previewCard}>
                {mapUri ? <Image source={{ uri: mapUri }} style={styles.map} resizeMode="cover" /> : null}
                <Text style={styles.previewTitle}>
                  {mode === 'profile' ? preview.label : preview.formattedAddress}
                </Text>
                {mode === 'profile' && preview.formattedAddress !== preview.label ? (
                  <Text style={styles.previewSub}>{preview.formattedAddress}</Text>
                ) : null}
                <View style={styles.previewActions}>
                  <Pressable
                    onPress={() => void Linking.openURL(googleMapsAppUrl(preview))}
                    style={styles.secondaryAction}>
                    <Text style={styles.secondaryActionLabel}>Open in Google Maps</Text>
                  </Pressable>
                  <Pressable onPress={confirmPreview} style={styles.primaryAction}>
                    <Text style={styles.primaryActionLabel}>Use this location</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.placeId}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  query.trim().length >= 2 && !loading ? (
                    <Text style={styles.empty}>No matching places. Try a nearby landmark or street.</Text>
                  ) : (
                    <Text style={styles.empty}>Search Google Maps for a real place to select.</Text>
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
            )}
          </>
        )}
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
  previewCard: {
    marginTop: 14,
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
  disabledBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
    backgroundColor: Palette.warningBg,
    gap: 6,
  },
  disabledTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
  },
  disabledBody: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  pressed: { opacity: 0.88 },
});
