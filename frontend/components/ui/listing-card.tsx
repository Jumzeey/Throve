import { HeartIcon, ImagePlaceholderIcon } from '@/components/ui/icons';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { AppImage } from '@/components/ui/app-image';
import { Palette, Radius, Typography } from '@/constants/theme';
import { getListingImageSource } from '@/data/images';
import type { Listing } from '@/data/types';
import { formatNaira } from '@/lib/format';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  listing: Listing;
  meta?: 'category' | 'condition';
  onPress: () => void;
  showSave?: boolean;
  saved?: boolean;
  onSave?: () => void;
  statusChip?: ListingChipVariant;
};

export function ListingCard({ listing, meta = 'category', onPress, showSave, saved, onSave, statusChip }: Props) {
  const metaLine =
    meta === 'condition'
      ? `${listing.condition} · ${listing.seller}`
      : `${listing.department} · ${listing.category}`;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.imageWrap}>
        <AppImage source={getListingImageSource(listing)} style={styles.image} />
        {statusChip ? (
          <View style={styles.chipOverlay}>
            <StatusChip kind="listing" variant={statusChip} />
          </View>
        ) : null}
        {showSave ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onSave?.();
            }}
            style={styles.heartBtn}
            hitSlop={8}>
            <HeartIcon size={15} filled={saved} color={saved ? Palette.plum : Palette.espresso} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {listing.title}
      </Text>
      <Text style={styles.price}>{formatNaira(listing.price)}</Text>
      <Text style={styles.meta} numberOfLines={1}>{metaLine}</Text>
    </Pressable>
  );
}

export function ListingCardPlaceholder() {
  return (
    <View style={styles.card}>
      <View style={[styles.imageWrap, styles.placeholderImage]}>
        <ImagePlaceholderIcon />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  imageWrap: {
    position: 'relative',
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.sand,
  },
  image: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: Radius.sm,
  },
  placeholderImage: {
    aspectRatio: 0.82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOverlay: {
    position: 'absolute',
    top: 9,
    left: 9,
  },
  heartBtn: {
    position: 'absolute',
    zIndex: 2,
    elevation: 3,
    top: 9,
    right: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,247,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  price: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
  },
  meta: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
});
