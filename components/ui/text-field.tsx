import { Palette, Radius, Typography } from '@/constants/theme';
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

export function TextField({ style, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={Palette.muted3}
      style={[styles.input, focused && styles.focused, style]}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.text,
    backgroundColor: Palette.background,
  },
  focused: {
    borderColor: Palette.accent,
  },
});
