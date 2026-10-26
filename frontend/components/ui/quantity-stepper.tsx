import { Palette, Radius, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  /** null = nothing chosen yet (the sell form starts empty so sellers must pick). */
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max: number;
  error?: boolean;
  /** Light stepper on ivory surfaces; dark for the live viewer. */
  tone?: 'light' | 'dark';
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  error,
  tone = 'light',
  editable = true,
  style,
  accessibilityLabel = 'Quantity',
}: Props) {
  const dark = tone === 'dark';
  const current = value ?? 0;
  const canDec = value != null && current > min;
  const canInc = current < max;

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, (value ?? (delta > 0 ? min - 1 : min)) + delta));
    if (next === value) return;
    void Haptics.selectionAsync().catch(() => undefined);
    onChange(next);
  };

  return (
    <View
      style={[styles.row, dark && styles.rowDark, error && styles.rowError, style]}
      accessibilityLabel={accessibilityLabel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        disabled={!canDec}
        hitSlop={6}
        onPress={() => step(-1)}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, !canDec && styles.btnDisabled]}>
        <Text style={[styles.btnText, dark && styles.textDark]}>−</Text>
      </Pressable>
      <TextInput
        value={value == null ? '' : String(value)}
        placeholder="0"
        placeholderTextColor={dark ? 'rgba(255,247,240,0.4)' : Palette.disabled}
        keyboardType="number-pad"
        editable={editable}
        maxLength={String(max).length}
        style={[styles.input, dark && styles.textDark]}
        accessibilityLabel={accessibilityLabel}
        onChangeText={(text) => {
          const digits = text.replace(/[^\d]/g, '');
          if (!digits) return onChange(null);
          onChange(Math.min(max, Math.max(0, Number(digits))));
        }}
        onBlur={() => {
          if (value != null && value < min) onChange(min);
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        disabled={!canInc}
        hitSlop={6}
        onPress={() => step(1)}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, !canInc && styles.btnDisabled]}>
        <Text style={[styles.btnText, dark && styles.textDark]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
  },
  rowDark: {
    borderColor: 'rgba(255,247,240,0.25)',
    backgroundColor: 'rgba(255,247,240,0.08)',
  },
  rowError: { borderColor: Palette.error, borderWidth: 1.5 },
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
  btnText: { fontSize: 20, fontFamily: Typography.bodyMedium, color: Palette.plum },
  input: {
    minWidth: 52,
    height: 44,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    paddingHorizontal: 4,
  },
  textDark: { color: Palette.ivory },
});
