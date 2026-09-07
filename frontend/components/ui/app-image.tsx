import { Palette } from '@/constants/theme';
import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  source: ImageSourcePropType | string | null;
  style?: StyleProp<ViewStyle>;
};

function resolveSource(source: ImageSourcePropType | string | null): ImageSourcePropType | null {
  if (!source) return null;
  if (typeof source === 'string') {
    if (
      !source.startsWith('http://') &&
      !source.startsWith('https://') &&
      !source.startsWith('file://') &&
      !source.startsWith('data:')
    ) {
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
  const recyclingKey = typeof source === 'string' ? source : undefined;
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={resolved}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
        transition={0}
      />
    </View>
  );
}

function PlaceholderBox({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.placeholder, style]} />;
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
});
