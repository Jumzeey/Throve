import { Palette, Typography } from '@/constants/theme';
import { getPasswordRequirements } from '@/lib/password';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  password: string;
};

export function PasswordRequirements({ password }: Props) {
  const requirements = getPasswordRequirements(password);

  return (
    <View style={styles.list} accessibilityRole="summary">
      {requirements.map((req) => (
        <Text key={req.id} style={[styles.item, req.met ? styles.met : null]}>
          {req.met ? '✓ ' : '○ '}
          {req.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6, marginTop: 4 },
  item: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  met: {
    color: Palette.successText,
    textDecorationLine: 'line-through',
    textDecorationColor: Palette.successBorder,
  },
});
