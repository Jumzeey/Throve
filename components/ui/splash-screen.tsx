import { Palette } from '@/constants/theme';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={Palette.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
});
