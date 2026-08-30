import { ChevronBackIcon } from '@/components/ui/icons';
import { Palette, Typography } from '@/constants/theme';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  dark?: boolean;
  large?: boolean;
};

export function ScreenHeader({ title, onBack, right, dark, large }: Props) {
  const insets = useSafeAreaInsets();
  const fg = dark ? Palette.ivory : Palette.espresso;
  return (
    <View style={[styles.row, { paddingTop: Math.max(insets.top, 14) }, dark && styles.darkRow]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <ChevronBackIcon color={fg} />
        </Pressable>
      ) : null}
      <Text style={[large ? styles.largeTitle : styles.title, { color: fg }]}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Palette.ivory,
  },
  darkRow: {
    backgroundColor: Palette.liveDark,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,247,240,0.14)',
  },
  back: { paddingVertical: 4 },
  title: {
    flex: 1,
    fontSize: 21,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  largeTitle: {
    flex: 1,
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  right: { marginLeft: 'auto' },
});
