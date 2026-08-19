import { Palette, Radius, Typography } from '@/constants/theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'live';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', loading, disabled, style, ...props }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'live' ? Palette.background : Palette.text} />
      ) : (
        <Text style={[styles.label, labelStyle[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primary: {
    backgroundColor: Palette.accent,
  },
  secondary: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    height: 44,
  },
  danger: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.live,
  },
  live: {
    backgroundColor: Palette.live,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
  label: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
  },
});

const labelStyle = StyleSheet.create({
  primary: { color: Palette.background },
  secondary: { color: Palette.accent700 },
  ghost: { color: Palette.muted, fontSize: 13, fontFamily: Typography.body },
  danger: { color: Palette.live, fontSize: 14 },
  live: { color: Palette.background },
});
