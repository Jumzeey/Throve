import { SpinnerArcIcon } from '@/components/ui/icons';
import { Palette, Radius, Typography } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'live' | 'dark';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', loading, disabled, style, ...props }: Props) {
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === 'primary' || variant === 'live' || variant === 'danger'
      ? Palette.ivory
      : variant === 'dark'
        ? Palette.liveDark
        : Palette.plum;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        loading ? styles.loading : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled && !loading ? styles.disabled : null,
        style,
      ]}
      {...props}>
      {loading ? (
        <View style={styles.loadingRow}>
          <SpinnerArcIcon size={16} color={spinnerColor} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[styles.label, labelStyle[variant], loading && styles.loadingLabel]}>
            {label}
          </Text>
        </View>
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[styles.label, labelStyle[variant], isDisabled ? styles.disabledLabel : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primary: {
    backgroundColor: Palette.plum,
  },
  secondary: {
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.plum,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 44,
    borderRadius: Radius.pill,
  },
  danger: {
    backgroundColor: Palette.error,
    borderWidth: 0,
  },
  live: {
    backgroundColor: Palette.liveRed,
  },
  dark: {
    backgroundColor: Palette.ivory,
  },
  loading: {
    opacity: 0.72,
  },
  pressed: { opacity: 0.88 },
  disabled: {
    backgroundColor: Palette.disabledBg,
    borderColor: Palette.disabledBorder,
    borderWidth: 1,
  },
  disabledLabel: {
    color: Palette.disabled,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  loadingLabel: {},
  label: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    textAlign: 'center',
  },
});

const labelStyle = StyleSheet.create({
  primary: { color: Palette.ivory },
  secondary: { color: Palette.plum },
  ghost: { color: Palette.muted, fontSize: 13, fontFamily: Typography.body },
  danger: { color: Palette.ivory, fontSize: 14 },
  live: { color: Palette.ivory },
  dark: { color: Palette.liveDark, fontSize: 13.5 },
});
