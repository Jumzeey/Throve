import { AppImage } from '@/components/ui/app-image';
import { ImagePlaceholderIcon } from '@/components/ui/icons';
import { Palette, Radius } from '@/constants/theme';
import { getListingImage } from '@/data/images';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const WIDTH = Dimensions.get('window').width;

type Props = {
  count: number;
  listingId?: string;
  /** Prefer these URIs (local or remote) when previewing a form. */
  uris?: string[];
};

export function PhotoPager({ count, listingId, uris }: Props) {
  const fromUris = (uris ?? []).filter(Boolean);
  const slides = Math.max(1, Math.min(fromUris.length || count, 8));
  const [index, setIndex] = useState(0);
  const fallback = listingId ? getListingImage(listingId) : null;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / WIDTH);
    if (next !== index) setIndex(next);
  }

  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {Array.from({ length: slides }).map((_, slide) => {
          const uri = fromUris[slide];
          return (
            <View key={slide} style={styles.slideWrap}>
              {uri ? (
                <Image source={{ uri }} style={styles.slide} resizeMode="cover" />
              ) : (
                <AppImage source={slide === 0 ? fallback : null} style={styles.slide} />
              )}
              {!uri && slide === 0 && !fallback ? (
                <View style={styles.placeholder}>
                  <ImagePlaceholderIcon size={28} />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      {slides > 1 ? (
        <View style={styles.dots}>
          {Array.from({ length: slides }).map((_, slide) => (
            <View key={slide} style={[styles.dot, slide === index ? styles.dotActive : styles.dotIdle]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slideWrap: {
    width: WIDTH,
    aspectRatio: 1,
    backgroundColor: Palette.sand,
  },
  slide: { width: WIDTH, aspectRatio: 1 },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.sand,
  },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: Radius.full },
  dotActive: { backgroundColor: Palette.plum },
  dotIdle: { backgroundColor: 'rgba(255,247,240,0.75)' },
});
