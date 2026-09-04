import { CheckIcon } from '@/components/ui/icons';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string | null;
  success?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({ label, error, hint, success, style, containerStyle, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={Palette.disabled}
          {...props}
          style={[
            styles.input,
            focused && !hasError ? styles.focused : null,
            hasError ? styles.errorInput : null,
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {success ? <CheckIcon /> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && hint ? <Text style={hintStyle(success)}>{hint}</Text> : null}
    </View>
  );
}

function hintStyle(success?: boolean) {
  return [styles.hint, success ? styles.successHint : null];
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  input: {
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
    shadowColor: Palette.plum,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 3,
  },
  errorInput: {
    borderWidth: 1.5,
    borderColor: Palette.error,
  },
  errorText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: Palette.error,
    fontFamily: Typography.body,
  },
  hint: {
    fontSize: 11.5,
    color: Palette.muted,
    fontFamily: Typography.body,
  },
  successHint: {
    color: Palette.successText,
  },
});
