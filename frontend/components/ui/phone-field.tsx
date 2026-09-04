import { COUNTRY_DIAL_CODES, getCountryByIso, type CountryDialCode } from '@/data/country-codes';
import { digitsOnly } from '@/lib/phone';
import { Palette, Radius, Typography } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  label?: string;
  countryIso: string;
  nationalNumber: string;
  onCountryChange: (iso: string) => void;
  onNumberChange: (national: string) => void;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
};

export function PhoneField({
  label = 'Phone number',
  countryIso,
  nationalNumber,
  onCountryChange,
  onNumberChange,
  error,
  containerStyle,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const country = getCountryByIso(countryIso);
  const hasError = Boolean(error);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[
            styles.codeBtn,
            focused && !hasError ? styles.focused : null,
            hasError ? styles.errorInput : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Country code"
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dial}>+{country.dial}</Text>
          <Ionicons name="chevron-down" size={14} color={Palette.muted} />
        </Pressable>
        <TextInput
          value={nationalNumber}
          onChangeText={(text) => onNumberChange(digitsOnly(text))}
          keyboardType="phone-pad"
          placeholder="801 234 5678"
          placeholderTextColor={Palette.disabled}
          style={[
            styles.numberInput,
            focused && !hasError ? styles.focused : null,
            hasError ? styles.errorInput : null,
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Country code</Text>
            <FlatList
              data={COUNTRY_DIAL_CODES}
              keyExtractor={(item) => item.iso}
              renderItem={({ item }) => (
                <CountryRow
                  item={item}
                  selected={item.iso === countryIso}
                  onPress={() => {
                    onCountryChange(item.iso);
                    setPickerOpen(false);
                  }}
                />
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function CountryRow({
  item,
  selected,
  onPress,
}: {
  item: CountryDialCode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.countryRow, selected ? styles.countryRowSelected : null]}>
      <Text style={styles.flag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryDial}>+{item.dial}</Text>
    </Pressable>
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
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  codeBtn: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numberInput: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 15,
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.espresso,
    backgroundColor: Palette.ivoryElevated,
  },
  focused: {
    borderWidth: 1.5,
    borderColor: Palette.plum,
  },
  errorInput: {
    borderWidth: 1.5,
    borderColor: Palette.error,
  },
  flag: { fontSize: 16 },
  dial: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  errorText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: Palette.error,
    fontFamily: Typography.body,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43,33,31,0.35)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 18,
    paddingBottom: 28,
  },
  sheetTitle: {
    paddingHorizontal: 20,
    marginBottom: 8,
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  countryRowSelected: {
    backgroundColor: Palette.sand,
  },
  countryName: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  countryDial: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted,
  },
});
