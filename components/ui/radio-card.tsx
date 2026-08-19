import { Palette, Radius, Typography } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  selected: boolean;
  title: string;
  subtitle?: string;
  right?: string;
  onPress: () => void;
};

export function RadioCard({ selected, title, subtitle, right, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
  },
  selected: {
    borderColor: Palette.accent,
    borderWidth: 2,
    padding: 15,
  },
  content: { flex: 1, gap: 2 },
  title: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  right: {
    fontSize: 15,
    fontFamily: Typography.heading,
    color: Palette.accent700,
  },
});
