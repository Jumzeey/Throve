import { Palette, Radius, Typography } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  label?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
};

export function PasswordField({ label, error, style, containerStyle, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={Palette.disabled}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
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
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          style={styles.toggle}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={Palette.muted} />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 15,
    paddingRight: 48,
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.espresso,
    backgroundColor: Palette.ivoryElevated,
  },
  toggle: {
    position: 'absolute',
    right: 14,
    height: 52,
    justifyContent: 'center',
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
});
