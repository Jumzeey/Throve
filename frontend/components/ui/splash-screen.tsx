import { Palette } from '@/constants/theme';
import { ThroveLogo } from '@/components/ui/throve-logo';
import { StyleSheet, View } from 'react-native';

/**
 * In-app splash that matches the native launch screen (ivory + Throve mark).
 * Shown while fonts/auth finish loading after the native splash hides.
 */
export function SplashScreen() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading Throve">
      <ThroveLogo size={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivory,
  },
});
