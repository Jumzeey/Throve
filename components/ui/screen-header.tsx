import { Palette, Typography } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
};

export function ScreenHeader({ title, onBack, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: Math.max(insets.top, 16) }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={18} color={Palette.text} />
        </Pressable>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Palette.background,
  },
  back: { paddingVertical: 4 },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: Typography.heading,
    color: Palette.text,
  },
  right: { marginLeft: 'auto' },
});
