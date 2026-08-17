import { Palette } from '@/constants/theme';
import type { Listing } from '@/data/types';
import { formatNaira } from '@/lib/format';
import { Pressable, StyleSheet, Text } from 'react-native';

import { PlaceholderImage } from '@/components/ui/placeholder-image';

type Props = {
  listing: Listing;
  meta?: 'category' | 'condition';
  onPress: () => void;
};

export function ListingCard({ listing, meta = 'category', onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <PlaceholderImage style={styles.image} />
      <Text style={styles.title} numberOfLines={2}>
        {listing.title}
      </Text>
      <Text style={styles.meta}>
        {meta === 'condition' ? listing.condition : `${listing.department} · ${listing.category}`}
      </Text>
      <Text style={styles.price}>{formatNaira(listing.price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  title: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: Palette.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  price: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
});
