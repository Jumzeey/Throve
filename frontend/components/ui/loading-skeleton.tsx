import { Palette, Radius } from '@/constants/theme';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

/** Gentle fade in and out so placeholders read as "loading", not as empty boxes. */
export function SkeletonPulse({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

/** Horizontal row of card placeholders (live, following, sellers rows on Home). */
export function CardRowSkeleton({
  count = 3,
  width,
  height,
  lines = 2,
  round = false,
}: {
  count?: number;
  width: number;
  height: number;
  lines?: number;
  round?: boolean;
}) {
  return (
    <SkeletonPulse style={styles.cardRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width }}>
          <View
            style={[
              styles.cardImage,
              { height },
              round && { width: height, borderRadius: height / 2, alignSelf: 'center' },
            ]}
          />
          {Array.from({ length: lines }).map((__, j) => (
            <View key={j} style={[styles.line, { width: j === 0 ? '80%' : '50%', marginTop: j === 0 ? 10 : 6 }]} />
          ))}
        </View>
      ))}
    </SkeletonPulse>
  );
}

type Props = { style?: ViewStyle; rows?: number };

export function LoadingSkeleton({ style, rows = 3 }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.thumb} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: '70%' }]} />
            <View style={[styles.line, { width: '40%', marginTop: 9 }]} />
            <View style={[styles.line, { width: '55%', marginTop: 9 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ListingGridSkeleton({ count = 4, inset = true }: { count?: number; inset?: boolean }) {
  return (
    <SkeletonPulse style={[styles.grid, !inset && { paddingHorizontal: 0 }] as unknown as ViewStyle}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <View style={styles.gridImage} />
          <View style={[styles.line, { width: '80%', marginTop: 9 }]} />
          <View style={[styles.line, { width: '50%', marginTop: 6 }]} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

export function SellerProfileSkeleton() {
  return (
    <View style={styles.sellerWrap}>
      <View style={styles.sellerIdentity}>
        <View style={styles.sellerAvatar} />
        <View style={styles.sellerLines}>
          <View style={[styles.line, { width: '72%', height: 12 }]} />
          <View style={[styles.line, { width: '44%', marginTop: 10 }]} />
        </View>
      </View>
      <View style={styles.sellerGrid}>
        <View style={styles.sellerTile} />
        <View style={styles.sellerTile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  cardRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  cardImage: { borderRadius: Radius.sm, backgroundColor: Palette.skeleton },
  row: { flexDirection: 'row', gap: 13 },
  thumb: {
    width: 58,
    height: 72,
    borderRadius: 5,
    backgroundColor: Palette.skeleton,
  },
  lines: { flex: 1, justifyContent: 'center' },
  line: {
    height: 10,
    borderRadius: 4,
    backgroundColor: Palette.skeleton,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  gridItem: { width: '47%' },
  gridImage: {
    height: 212,
    borderRadius: 6,
    backgroundColor: Palette.skeleton,
  },
  sellerWrap: { paddingHorizontal: 20, paddingTop: 8 },
  sellerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  sellerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.skeleton,
  },
  sellerLines: { flex: 1 },
  sellerGrid: { flexDirection: 'row', gap: 12 },
  sellerTile: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: Radius.sm,
    backgroundColor: Palette.skeleton,
  },
});

export function ProgressBar({ progress = 0.45, width = 120 }: { progress?: number; width?: number }) {
  return (
    <View style={[barStyles.track, { width }]}>
      <View style={[barStyles.fill, { width: width * progress }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.divider,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.plum,
  },
});
