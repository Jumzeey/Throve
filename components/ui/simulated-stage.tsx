import { Palette } from '@/constants/theme';
import type { ListingStatus } from '@/data/types';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export function SimulatedStage({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.stage}>
      {Array.from({ length: 18 }).map((_, index) => (
        <View key={index} style={[styles.stripe, { left: index * 20 - 80 }]} />
      ))}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function listingStatusStyle(status: ListingStatus) {
  if (status === 'reserved') {
    return { backgroundColor: '#fdf3e3', color: '#8a6112', label: 'Reserved' };
  }
  if (status === 'sold') {
    return { backgroundColor: Palette.chipBg, color: Palette.muted, label: 'Sold' };
  }
  return { backgroundColor: Palette.chipBg, color: Palette.muted, label: 'Available' };
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: -80,
    width: 10,
    height: '240%',
    backgroundColor: '#262626',
    transform: [{ rotate: '45deg' }],
  },
  content: {
    flex: 1,
  },
});
