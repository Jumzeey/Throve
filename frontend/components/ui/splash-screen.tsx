import { Palette } from '@/constants/theme';
import { Image, StyleSheet, View } from 'react-native';

/**
 * In-app splash that matches the native launch screen (ivory + throve wordmark).
 * Shown while fonts/auth finish loading after the native splash hides.
 */
export function SplashScreen() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading Throve">
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
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
  logo: {
    width: 220,
    height: 88,
  },
});
