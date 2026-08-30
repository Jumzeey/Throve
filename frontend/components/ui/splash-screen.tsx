import { ProgressBar } from '@/components/ui/loading-skeleton';
import { Palette, Typography } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

export function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.wordmark}>throve</Text>
      <ProgressBar progress={0.43} width={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivory,
    gap: 14,
  },
  wordmark: {
    fontFamily: Typography.display,
    fontSize: 30,
    lineHeight: 30,
    color: Palette.plum,
  },
});
