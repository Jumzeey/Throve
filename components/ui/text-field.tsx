import { Palette } from '@/constants/theme';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

export function TextField({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Palette.muted3}
      style={[styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Palette.text,
    backgroundColor: Palette.background,
  },
});
