import { Button } from '@/components/ui/button';
import { Palette, Radius, Typography } from '@/constants/theme';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

type Props = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

export function EmptyState({ title, message, actionLabel, onAction, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 19,
    color: Palette.espresso,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  button: {
    marginTop: 13,
    alignSelf: 'stretch',
  },
});
