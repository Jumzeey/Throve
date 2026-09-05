import { AppImage } from '@/components/ui/app-image';
import { ImagePlaceholderIcon } from '@/components/ui/icons';
import { Palette, Radius, Typography } from '@/constants/theme';
import { getListingImage, isNativeImageUri } from '@/data/images';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WIDTH = Dimensions.get('window').width;

type Props = {
  count: number;
  listingId?: string;
  /** Prefer these URIs (local or remote) when previewing a form. */
  uris?: string[];
  index?: number;
  onIndexChange?: (index: number) => void;
  aspectRatio?: number;
  showCounter?: boolean;
};

export function PhotoPager({ count, listingId, uris, index, onIndexChange, aspectRatio = 1, showCounter }: Props) {
  const fromUris = (uris ?? []).filter(Boolean);
  const slides = Math.max(1, Math.min(fromUris.length || count, 8));
  const [internal, setInternal] = useState(0);
  const current = index ?? internal;
  const scrollRef = useRef<ScrollView>(null);
  const fallback = listingId ? getListingImage(listingId) : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: current * WIDTH, animated: true });
  }, [current]);

  function report(next: number) {
    if (next === current) return;
    if (index === undefined) setInternal(next);
    onIndexChange?.(next);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / WIDTH);
    report(next);
  }

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {Array.from({ length: slides }).map((_, slide) => {
          const uri = fromUris[slide];
          const loadable = uri && isNativeImageUri(uri);
          return (
            <View key={slide} style={[styles.slideWrap, { aspectRatio }]}>
              {loadable ? (
                <Image source={{ uri }} style={[styles.slide, { aspectRatio }]} resizeMode="cover" />
              ) : (
                <AppImage source={fallback} style={[styles.slide, { aspectRatio }]} />
              )}
              {!loadable && slide === 0 && !fallback ? (
                <View style={styles.placeholder}>
                  <ImagePlaceholderIcon size={28} />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      {showCounter && slides > 0 ? (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {current + 1} / {slides}
          </Text>
        </View>
      ) : slides > 1 && !showCounter ? (
        <View style={styles.dots}>
          {Array.from({ length: slides }).map((_, slide) => (
            <View key={slide} style={[styles.dot, slide === current ? styles.dotActive : styles.dotIdle]} />
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
  counter: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    backgroundColor: 'rgba(43,33,31,0.7)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  counterText: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
});
