import { Palette } from '@/constants/theme';
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  source: ImageSourcePropType | string | null;
  style?: StyleProp<ViewStyle>;
};

function resolveSource(source: ImageSourcePropType | string | null): ImageSourcePropType | null {
  if (!source) return null;
  if (typeof source === 'string') {
    if (!source.startsWith('http://') && !source.startsWith('https://') && !source.startsWith('file://') && !source.startsWith('data:')) {
      return null;
    }
    return { uri: source };
  }
  return source;
}

export function AppImage({ source, style }: Props) {
  const resolved = resolveSource(source);
  if (!resolved) {
    return <PlaceholderBox style={style} />;
  }
  return (
    <View style={[styles.wrap, style]}>
      <Image source={resolved} style={styles.image} resizeMode="cover" />
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
