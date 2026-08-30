import { Palette, Radius, Typography } from '@/constants/theme';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AlertCircleIcon, CheckIcon, ClockIcon, WifiOffIcon } from './icons';

type Variant = 'error' | 'warning' | 'success' | 'info';

type Props = {
  variant: Variant;
  title: string;
  message?: string;
  style?: ViewStyle;
};

const CONFIG: Record<Variant, { bg: string; border: string; titleColor: string; bodyColor: string; Icon: typeof AlertCircleIcon; iconColor: string }> = {
  error: {
    bg: Palette.errorBg,
    border: Palette.errorBorder,
    titleColor: Palette.error,
    bodyColor: Palette.errorBody,
    Icon: AlertCircleIcon,
    iconColor: Palette.error,
  },
  warning: {
    bg: Palette.warningBg,
    border: Palette.warningBorder,
    titleColor: Palette.warningText,
    bodyColor: Palette.muted,
    Icon: WifiOffIcon,
    iconColor: Palette.warning,
  },
  success: {
    bg: Palette.successBg,
    border: Palette.successBorder,
    titleColor: Palette.successText,
    bodyColor: '#5C6B58',
    Icon: CheckIcon,
    iconColor: Palette.success,
  },
  info: {
    bg: Palette.ivoryElevated,
    border: Palette.border,
    titleColor: Palette.espresso,
    bodyColor: Palette.body,
    Icon: ClockIcon,
    iconColor: Palette.plum,
  },
};

export function AlertBanner({ variant, title, message, style }: Props) {
  const cfg = CONFIG[variant];
  const { Icon } = cfg;
  return (
    <View style={[styles.box, { backgroundColor: cfg.bg, borderColor: cfg.border }, style]}>
      <Icon color={cfg.iconColor} />
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: cfg.titleColor }]}>{title}</Text>
        {message ? <Text style={[styles.message, { color: cfg.bodyColor }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

/** @deprecated use AlertBanner variant="error" */
export function ErrorBanner({ message, title = "We couldn't complete that" }: { message?: string | null; title?: string }) {
  if (!message) return null;
  return <AlertBanner variant="error" title={title} message={message} />;
}

export function OfflineBanner({ message = 'Reconnect to continue.', title = 'No connection' }: { message?: string; title?: string }) {
  return <AlertBanner variant="warning" title={title} message={message} />;
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    marginBottom: 3,
  },
  message: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
  },
});
