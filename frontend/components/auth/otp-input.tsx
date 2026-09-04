import { OTP_LENGTH } from '@/lib/otp';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
};

export function OtpInput({ value, onChange, length = OTP_LENGTH, error }: Props) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = value.replace(/\D/g, '').slice(0, length).split('');

  function setDigit(index: number, char: string) {
    const cleaned = char.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const next = cleaned.slice(0, length);
      onChange(next);
      const focusIndex = Math.min(next.length, length - 1);
      inputs.current[focusIndex]?.focus();
      return;
    }

    const nextDigits = Array.from({ length }, (_, i) => digits[i] ?? '');
    nextDigits[index] = cleaned.slice(-1);
    const next = nextDigits.join('');
    onChange(next);
    if (cleaned && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function onKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const nextDigits = Array.from({ length }, (_, i) => digits[i] ?? '');
      nextDigits[index - 1] = '';
      onChange(nextDigits.join(''));
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, index) => {
        const filled = Boolean(digits[index]);
        return (
          <Pressable key={index} onPress={() => inputs.current[index]?.focus()} style={styles.cellPress}>
            <TextInput
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              value={digits[index] ?? ''}
              onChangeText={(text) => setDigit(index, text)}
              onKeyPress={({ nativeEvent }) => onKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={index === 0 ? length : 1}
              style={[
                styles.cell,
                filled ? styles.cellFilled : null,
                error ? styles.cellError : null,
              ]}
              selectTextOnFocus
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  cellPress: { flex: 1 },
  cell: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    backgroundColor: Palette.ivoryElevated,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.espresso,
    paddingVertical: 10,
  },
  cellFilled: {
    borderColor: Palette.plum,
    backgroundColor: Palette.sand,
  },
  cellError: {
    borderColor: Palette.error,
    backgroundColor: Palette.errorBg,
  },
});
