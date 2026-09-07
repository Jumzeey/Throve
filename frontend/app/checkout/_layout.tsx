import { Palette } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/**
 * Owns the bottom system inset for the whole checkout stack so sticky CTAs
 * and scroll content clear Android navigation buttons.
 */
export default function CheckoutLayout() {
  const { bottom } = useScreenInsets();
  return (
    <View style={[styles.safe, { paddingBottom: bottom }]}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
});
