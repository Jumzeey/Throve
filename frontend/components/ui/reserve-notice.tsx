import { ClockIcon } from '@/components/ui/icons';
import { Palette, Radius, Typography } from '@/constants/theme';
import { formatCountdown } from '@/lib/format';
import { StyleSheet, Text, View } from 'react-native';

export function ReserveNotice({ remaining, extra }: { remaining: number; extra?: string }) {
  return (
    <View style={styles.box}>
      <ClockIcon size={15} color={Palette.warningText} />
      <Text style={styles.text}>
        Reserved for you — {remaining > 0 ? formatCountdown(remaining) : 'expired'}
        {extra ? `. ${extra}` : '.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 13,
    backgroundColor: Palette.warningBg,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
    borderRadius: Radius.sm,
    marginBottom: 16,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.warningText,
  },
});
