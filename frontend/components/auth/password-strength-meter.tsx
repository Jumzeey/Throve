import { Palette, Radius, Typography } from '@/constants/theme';
import { passwordStrengthLabel, passwordStrengthScore } from '@/lib/password';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  password: string;
};

const SEGMENT_COLORS = [Palette.error, Palette.warning, Palette.blush, Palette.success] as const;

export function PasswordStrengthMeter({ password }: Props) {
  const score = passwordStrengthScore(password);
  const label = password ? passwordStrengthLabel(score) : '';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.caption}>Password strength</Text>
        {label ? <Text style={[styles.label, { color: SEGMENT_COLORS[score] }]}>{label}</Text> : null}
      </View>
      <View style={styles.track}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.segment,
              password && index <= score
                ? { backgroundColor: SEGMENT_COLORS[score] }
                : { backgroundColor: Palette.divider },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caption: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  label: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
  },
  track: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: Radius.pill,
  },
});
