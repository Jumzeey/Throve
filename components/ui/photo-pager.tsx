import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { Palette } from '@/constants/theme';
import { useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

const WIDTH = Dimensions.get('window').width;

type Props = {
  count: number;
};

export function PhotoPager({ count }: Props) {
  const slides = Math.max(1, Math.min(count, 8));
  const [index, setIndex] = useState(0);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / WIDTH);
    if (next !== index) setIndex(next);
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {Array.from({ length: slides }).map((_, slide) => (
          <PlaceholderImage key={slide} style={styles.slide} />
        ))}
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
  slide: {
    width: WIDTH,
    aspectRatio: 1,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Palette.text,
  },
  dotIdle: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
