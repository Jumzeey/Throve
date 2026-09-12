import { AppImage } from '@/components/ui/app-image';
import { CloseIcon } from '@/components/ui/icons';
import { Palette, Typography } from '@/constants/theme';
import { getProductImageSource } from '@/data/images';
import type { LiveStreamProduct } from '@/data/types';
import type { PinnedProductVariant } from '@/components/live/pinned-product-card';
import { formatNaira } from '@/lib/format';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useMemo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function liveProductVariant(product: LiveStreamProduct, claimedByMe: boolean): PinnedProductVariant {
  const stock = product.stock ?? 0;
  const reserved = product.reservedCount ?? 0;
  const sold = product.soldCount ?? 0;
  const available = product.available ?? Math.max(0, stock - reserved - sold);
  const soldOut = sold >= stock || (available <= 0 && reserved <= 0);
  if (soldOut) return 'sold';
  if (claimedByMe) return 'your_claim';
  if (reserved > 0 && available <= 0) return 'reserved';
  return 'available';
}

type Props = {
  visible: boolean;
  products: LiveStreamProduct[];
  pinnedProductId?: string;
  claimedProductId?: string | null;
  onClose: () => void;
  onSelect: (product: LiveStreamProduct) => void;
};

export function LiveCatalogSheet({
  visible,
  products,
  pinnedProductId,
  claimedProductId,
  onClose,
  onSelect,
}: Props) {
  const { sheetBottom } = useScreenInsets();
  const maxHeight = Dimensions.get('window').height * 0.76;

  const availableCount = useMemo(
    () =>
      products.filter((p) => {
        const v = liveProductVariant(p, claimedProductId === p.id);
        return v === 'available' || v === 'your_claim';
      }).length,
    [claimedProductId, products],
  );

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      if (a.id === pinnedProductId) return -1;
      if (b.id === pinnedProductId) return 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [pinnedProductId, products]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close catalog" />
        <View style={[styles.sheet, { maxHeight, paddingBottom: Math.max(sheetBottom, 16) }]}>
          <View style={styles.handleRow}>
            <View style={styles.handleSpacer} />
            <View style={styles.handle} />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
              <CloseIcon size={15} color={Palette.body} strokeWidth={2} />
            </Pressable>
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>In this Live</Text>
            <Text style={styles.sub}>
              {products.length} item{products.length === 1 ? '' : 's'} · {availableCount} available
            </Text>
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listBody}
            showsVerticalScrollIndicator={false}
          >
            {sorted.map((product) => {
              const variant = liveProductVariant(product, claimedProductId === product.id);
              const featured = product.id === pinnedProductId;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => onSelect(product)}
                  style={[styles.row, featured && styles.rowFeatured, variant === 'sold' && styles.rowSold]}
                >
                  <AppImage
                    source={getProductImageSource(product.photoUrls?.[0], product.listingId)}
                    style={styles.thumb}
                  />
                  <View style={styles.meta}>
                    {featured ? <Text style={styles.featuredLabel}>FEATURED NOW</Text> : null}
                    <Text
                      style={[styles.itemTitle, variant === 'sold' && styles.itemTitleSold]}
                      numberOfLines={2}
                    >
                      {product.title ?? 'Product'}
                    </Text>
                    <Text
                      style={[
                        styles.price,
                        (variant === 'reserved' || variant === 'sold') && styles.priceMuted,
                        variant === 'sold' && styles.priceSold,
                      ]}
                    >
                      {formatNaira(product.livePrice)}
                    </Text>
                  </View>
                  <StatusTag variant={variant} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatusTag({ variant }: { variant: PinnedProductVariant }) {
  if (variant === 'sold') {
    return <Text style={styles.tagSold}>SOLD</Text>;
  }
  if (variant === 'reserved') {
    return <Text style={styles.tagReserved}>RESERVED</Text>;
  }
  if (variant === 'your_claim') {
    return <Text style={styles.tagAvailable}>YOUR CLAIM</Text>;
  }
  return <Text style={styles.tagAvailable}>AVAILABLE</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,12,14,0.58)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handleSpacer: { width: 34 },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderSoft,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 22,
    color: Palette.espresso,
  },
  sub: {
    marginTop: 2,
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  list: {
    flexGrow: 0,
  },
  listBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#E7DCD2',
    backgroundColor: Palette.ivoryElevated,
    borderRadius: 10,
    padding: 10,
  },
  rowFeatured: {
    borderWidth: 1.5,
    borderColor: Palette.plum,
  },
  rowSold: {
    backgroundColor: '#F7F1EA',
  },
  thumb: {
    width: 52,
    height: 60,
    borderRadius: 6,
    backgroundColor: Palette.skeleton,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  featuredLabel: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.9,
    color: Palette.plum,
  },
  itemTitle: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  itemTitleSold: {
    color: Palette.body,
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
    color: Palette.muted2,
  },
  tagAvailable: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: Palette.successText,
    borderWidth: 1,
    borderColor: Palette.successBorder,
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  tagReserved: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: Palette.warningText,
    backgroundColor: Palette.warningBg,
    borderWidth: 1,
    borderColor: '#E9CFA6',
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  tagSold: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: Palette.ivory,
    backgroundColor: Palette.espresso,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
