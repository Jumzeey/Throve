import { Palette } from '@/constants/theme';
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  source: ImageSourcePropType | null;
  style?: StyleProp<ViewStyle>;
};

export function AppImage({ source, style }: Props) {
  if (!source) {
    return <PlaceholderBox style={style} />;
  }
  return (
    <View style={[styles.wrap, style]}>
      <Image source={source} style={styles.image} resizeMode="cover" />
    </View>
  );
}

function PlaceholderBox({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.placeholder, style]}>
      {Array.from({ length: 14 }).map((_, i) => (
        <View key={i} style={[styles.stripe, { left: i * 16 - 48 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholder: {
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
