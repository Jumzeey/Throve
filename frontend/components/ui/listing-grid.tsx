import { Palette } from '@/constants/theme';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  listings: ReactNode[];
};

export function ListingGrid({ listings }: Props) {
  const rows: ReactNode[][] = [];
  for (let i = 0; i < listings.length; i += 2) {
    rows.push(listings.slice(i, i + 2));
  }
  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.cell}>
              {item}
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    backgroundColor: Palette.background,
  },
});
