import { Palette, Radius, Typography } from '@/constants/theme';
import { getListingImage } from '@/data/images';
import type { Listing } from '@/data/types';
import { formatNaira } from '@/lib/format';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppImage } from '@/components/ui/app-image';

type Props = {
  listing: Listing;
  meta?: 'category' | 'condition';
  onPress: () => void;
};

export function ListingCard({ listing, meta = 'category', onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <AppImage source={getListingImage(listing.id)} style={styles.image} />
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
  card: { flex: 1 },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.sm,
  },
  title: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  price: {
    marginTop: 3,
    fontSize: 14,
    fontFamily: Typography.heading,
    color: Palette.accent700,
  },
});
