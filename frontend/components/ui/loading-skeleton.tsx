import { Palette, Radius } from '@/constants/theme';
import { StyleSheet, View, type ViewStyle } from 'react-native';

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

export function ListingGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <View style={styles.gridImage} />
          <View style={[styles.line, { width: '80%', marginTop: 9 }]} />
          <View style={[styles.line, { width: '50%', marginTop: 6 }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
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
