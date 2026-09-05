import { Palette, Typography } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  step: 1 | 2 | 3 | 4;
  total?: number;
};

export function CheckoutProgress({ step, total = 4 }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, index) => {
        const active = index < step;
        return <View key={index} style={[styles.seg, active ? styles.segOn : null]} />;
      })}
      <Text style={styles.count}>
        {step} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  seg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.divider,
  },
  segOn: {
    backgroundColor: Palette.plum,
  },
  count: {
    marginLeft: 6,
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: Palette.muted2,
    fontVariant: ['tabular-nums'],
  },
});
