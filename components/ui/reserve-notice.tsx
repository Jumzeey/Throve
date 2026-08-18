import { Palette } from '@/constants/theme';
import { formatCountdown } from '@/lib/format';
import { StyleSheet, Text, View } from 'react-native';

export function ReserveNotice({ remaining, extra }: { remaining: number; extra?: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        Reserved for you — {remaining > 0 ? formatCountdown(remaining) : 'expired'}
        {extra ? `. ${extra}` : '.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Palette.chipBg,
    borderRadius: 8,
    marginBottom: 16,
  },
  text: {
    fontSize: 12,
    color: Palette.muted,
  },
});
