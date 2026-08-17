import { Palette } from '@/constants/theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

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
        <ActivityIndicator color={variant === 'primary' ? Palette.background : Palette.text} />
      ) : (
        <Text style={[styles.label, variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel, variant === 'ghost' && styles.ghostLabel, variant === 'danger' && styles.dangerLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primary: {
    backgroundColor: Palette.text,
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.text,
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
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    color: Palette.background,
  },
  secondaryLabel: {
    color: Palette.text,
  },
  ghostLabel: {
    color: Palette.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  dangerLabel: {
    color: Palette.live,
    fontSize: 14,
  },
});
