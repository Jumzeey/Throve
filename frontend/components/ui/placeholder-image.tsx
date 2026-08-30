import { Palette } from '@/constants/theme';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function PlaceholderImage({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.base, style]}>
      {Array.from({ length: 14 }).map((_, index) => (
        <View key={index} style={[styles.stripe, { left: index * 16 - 48 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Palette.hatch,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: -60,
    width: 8,
    height: '220%',
    backgroundColor: Palette.hatchAlt,
    transform: [{ rotate: '45deg' }],
  },
});
