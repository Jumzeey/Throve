import { AppImage } from '@/components/ui/app-image';
import { ChevronForwardIcon } from '@/components/ui/icons';
import { Palette, Typography } from '@/constants/theme';
import { getProductImageSource } from '@/data/images';
import type { PinnedProductVariant } from '@/components/live/pinned-product-card';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title?: string;
  price?: string;
  listingId?: string;
  imageUri?: string;
  variant: PinnedProductVariant | 'none';
  itemCount?: number;
  /** Footer CTA label — viewer default "View", host can use "Change". */
  actionLabel?: string;
  onPress?: () => void;
  onBrowseCatalog?: () => void;
};

export function FeaturedLiveCard({
  title,
  price,
  listingId,
  imageUri,
  variant,
  itemCount = 0,
  actionLabel = 'View',
  onPress,
  onBrowseCatalog,
}: Props) {
  if (variant === 'none' || !title) {
    return (
      <Pressable onPress={onBrowseCatalog} style={styles.emptyCard} accessibilityRole="button">
        <Text style={styles.emptyTitle}>No item featured</Text>
        <Text style={styles.emptyBody}>
          {itemCount > 0
            ? `Browse the ${itemCount} item${itemCount === 1 ? '' : 's'} in this Live.`
            : 'Browse the items in this Live.'}
        </Text>
      </Pressable>
    );
  }

  const sold = variant === 'sold';
  const reserved = variant === 'reserved';

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${price ?? ''}. ${actionLabel}`}
    >
      <View style={[styles.row, reserved && styles.rowDimmed]}>
        <AppImage source={getProductImageSource(imageUri, listingId)} style={styles.thumb} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.price, (sold || reserved) && styles.priceMuted, sold && styles.priceSold]}>
            {price}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        {variant === 'available' || variant === 'your_claim' ? (
          <Text style={styles.statusAvailable}>
            {variant === 'your_claim' ? 'YOUR CLAIM' : 'AVAILABLE'}
          </Text>
        ) : null}
        {reserved ? <Text style={styles.statusReserved}>RESERVED</Text> : null}
        {sold ? <Text style={styles.statusSold}>SOLD</Text> : null}
        <View style={styles.viewRow}>
          <Text style={styles.viewLabel}>{actionLabel}</Text>
          <ChevronForwardIcon size={11} color={Palette.plum} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    backgroundColor: 'rgba(255,247,240,0.97)',
    borderRadius: 12,
    padding: 9,
    shadowColor: '#000',
    shadowOpacity: 0.36,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  emptyCard: {
    width: 150,
    backgroundColor: 'rgba(20,12,14,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emptyTitle: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  emptyBody: {
    marginTop: 3,
    fontSize: 10.5,
    lineHeight: 15,
    fontFamily: Typography.body,
    color: '#EADFD7',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  rowDimmed: {
    opacity: 0.62,
  },
  thumb: {
    width: 42,
    height: 48,
    borderRadius: 6,
    backgroundColor: Palette.skeleton,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    lineHeight: 15,
  },
  price: {
    marginTop: 3,
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  priceMuted: {
    color: Palette.muted,
  },
  priceSold: {
    textDecorationLine: 'line-through',
  },
  footer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    paddingTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  statusAvailable: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: Palette.successText,
  },
  statusReserved: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: Palette.warningText,
    backgroundColor: Palette.warningBg,
    borderWidth: 1,
    borderColor: '#E9CFA6',
    borderRadius: 3,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusSold: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: Palette.ivory,
    backgroundColor: Palette.espresso,
    borderRadius: 3,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLabel: {
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
});
