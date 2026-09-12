import { AppImage } from '@/components/ui/app-image';
import { CloseIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Palette, Typography } from '@/constants/theme';
import { getProductImageSource } from '@/data/images';
import type { Listing, LiveStreamProduct } from '@/data/types';
import type { PinnedProductVariant } from '@/components/live/pinned-product-card';
import { formatCountdown, formatNaira } from '@/lib/format';
import { useLiveClock } from '@/context/live-context';
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

type Props = {
  visible: boolean;
  product: LiveStreamProduct | null;
  listing?: Listing | null;
  variant: PinnedProductVariant;
  claimExpiresAt?: number;
  claiming?: boolean;
  claimError?: string | null;
  featuredInLive?: boolean;
  removed?: boolean;
  remainingCatalogCount?: number;
  onClose: () => void;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
  onCheckout?: () => void;
  onBrowseCatalog?: () => void;
  onSignIn?: () => void;
  signedIn?: boolean;
};

export function LiveListingDrawer({
  visible,
  product,
  listing,
  variant,
  claimExpiresAt,
  claiming,
  claimError,
  featuredInLive = true,
  removed = false,
  remainingCatalogCount = 0,
  onClose,
  onAddToCart,
  onBuyNow,
  onCheckout,
  onBrowseCatalog,
  onSignIn,
  signedIn = true,
}: Props) {
  const { sheetBottom } = useScreenInsets();
  const now = useLiveClock();
  const maxHeight = Dimensions.get('window').height * 0.76;

  const photos = useMemo(() => {
    const urls = product?.photoUrls?.length
      ? product.photoUrls
      : listing?.photoUrls?.length
        ? listing.photoUrls
        : [];
    return urls.slice(0, 6);
  }, [listing?.photoUrls, product?.photoUrls]);

  const title = product?.title ?? listing?.title ?? 'Product';
  const price = product ? formatNaira(product.livePrice) : listing ? formatNaira(listing.price) : '';
  const brand = listing?.brand;
  const size =
    product?.size && product.size !== '—'
      ? product.size
      : listing?.size && listing.size !== '—'
        ? listing.size
        : null;
  const condition = product?.condition ?? listing?.condition;
  const location = listing?.shipping;
  const description = listing?.description?.trim();
  const countdown =
    variant === 'your_claim' && claimExpiresAt ? formatCountdown(claimExpiresAt - now) : undefined;

  const tags = [brand, size, condition, location].filter(Boolean) as string[];
  const hero = photos[0];
  const sideA = photos[1];
  const sideB = photos[2];
  const extra = Math.max(0, photos.length - 3);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close listing" />
        <View style={[styles.sheet, { maxHeight }]}>
          <View style={styles.handleRow}>
            <View style={styles.handleSpacer} />
            <View style={styles.handle} />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Close">
              <CloseIcon size={15} color={Palette.body} strokeWidth={2} />
            </Pressable>
          </View>

          {removed || !product ? (
            <View style={[styles.removedBox, { paddingBottom: Math.max(sheetBottom, 24) }]}>
              <Text style={styles.removedTitle}>This item is no longer available</Text>
              <Text style={styles.removedBody}>
                The seller removed it from this Live
                {remainingCatalogCount > 0
                  ? `. Browse the other ${remainingCatalogCount} item${remainingCatalogCount === 1 ? '' : 's'}.`
                  : '.'}
              </Text>
              {remainingCatalogCount > 0 && onBrowseCatalog ? (
                <Button label="Browse items" onPress={onBrowseCatalog} style={styles.removedBtn} />
              ) : null}
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollBody}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.gallery}>
                  <AppImage
                    source={getProductImageSource(hero, product.listingId)}
                    style={styles.hero}
                  />
                  <View style={styles.sideCol}>
                    <AppImage
                      source={getProductImageSource(sideA ?? hero, product.listingId)}
                      style={styles.side}
                    />
                    <View style={styles.sideWrap}>
                      <AppImage
                        source={getProductImageSource(sideB ?? hero, product.listingId)}
                        style={styles.side}
                      />
                      {extra > 0 ? (
                        <View style={styles.extraOverlay}>
                          <Text style={styles.extraText}>+{extra}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <StatusBadge variant={variant} />
                  {featuredInLive ? <Text style={styles.featuredHint}>Featured in this Live</Text> : null}
                </View>

                <Text style={styles.title}>{title}</Text>
                <Text style={[styles.price, (variant === 'sold' || variant === 'reserved') && styles.priceMuted, variant === 'sold' && styles.priceStrike]}>
                  {price}
                </Text>

                {tags.length > 0 ? (
                  <View style={styles.tags}>
                    {tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {description ? <Text style={styles.description}>{description}</Text> : null}

                {countdown ? (
                  <Text style={styles.countdown}>Your claim · {countdown} left</Text>
                ) : null}

                {claimError ? <Text style={styles.error}>{claimError}</Text> : null}

                <View style={styles.protection}>
                  <Text style={styles.protectionTitle}>Buyer Protection included</Text>
                  <Text style={styles.protectionBody}>
                    Your payment is held until the order completes — automatically 48 hours after delivery, or
                    as soon as you confirm receipt.
                  </Text>
                </View>
              </ScrollView>

              <View style={[styles.footer, { paddingBottom: Math.max(sheetBottom, 16) }]}>
                <DrawerFooter
                  variant={variant}
                  signedIn={signedIn}
                  claiming={claiming}
                  onAddToCart={onAddToCart}
                  onBuyNow={onBuyNow}
                  onCheckout={onCheckout}
                  onSignIn={onSignIn}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function StatusBadge({ variant }: { variant: PinnedProductVariant }) {
  if (variant === 'sold') return <Text style={styles.badgeSold}>SOLD</Text>;
  if (variant === 'reserved') return <Text style={styles.badgeReserved}>RESERVED</Text>;
  if (variant === 'your_claim') return <Text style={styles.badgeAvailable}>YOUR CLAIM</Text>;
  return <Text style={styles.badgeAvailable}>AVAILABLE</Text>;
}

function DrawerFooter({
  variant,
  signedIn,
  claiming,
  onAddToCart,
  onBuyNow,
  onCheckout,
  onSignIn,
}: {
  variant: PinnedProductVariant;
  signedIn: boolean;
  claiming?: boolean;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
  onCheckout?: () => void;
  onSignIn?: () => void;
}) {
  if (!signedIn) {
    return <Button label="Sign in to buy" onPress={onSignIn} style={styles.fullBtn} />;
  }
  if (variant === 'sold') {
    return (
      <View style={styles.soldBanner}>
        <Text style={styles.soldBannerText}>Sold in this Live</Text>
      </View>
    );
  }
  if (variant === 'your_claim') {
    return <Button label="Complete checkout" onPress={onCheckout} style={styles.fullBtn} />;
  }
  if (variant === 'reserved') {
    return (
      <View style={styles.footerRow}>
        <Button label="Add to cart" variant="secondary" disabled style={styles.halfBtn} />
        <Button label="Reserved" disabled style={styles.buyBtn} />
      </View>
    );
  }
  return (
    <View style={styles.footerRow}>
      <Button
        label={claiming ? 'Reserving…' : 'Add to cart'}
        variant="secondary"
        disabled={claiming}
        onPress={onAddToCart}
        style={styles.halfBtn}
      />
      <Button
        label={claiming ? '…' : 'Buy now'}
        disabled={claiming}
        onPress={onBuyNow}
        style={styles.buyBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,12,14,0.62)',
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
    paddingBottom: 8,
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
  scroll: {
    flexShrink: 1,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  gallery: {
    flexDirection: 'row',
    gap: 8,
  },
  hero: {
    flex: 1.5,
    height: 168,
    borderRadius: 10,
    backgroundColor: Palette.skeleton,
  },
  sideCol: {
    flex: 1,
    gap: 8,
  },
  side: {
    flex: 1,
    minHeight: 80,
    borderRadius: 10,
    backgroundColor: Palette.skeleton,
  },
  sideWrap: {
    flex: 1,
    position: 'relative',
  },
  extraOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: 'rgba(27,17,19,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  featuredHint: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  badgeAvailable: {
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
  badgeReserved: {
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
  badgeSold: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.8,
    color: Palette.ivory,
    backgroundColor: Palette.espresso,
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  title: {
    marginTop: 9,
    fontFamily: Typography.display,
    fontSize: 23,
    lineHeight: 28,
    color: Palette.espresso,
  },
  price: {
    marginTop: 6,
    fontSize: 22,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  priceMuted: {
    color: Palette.muted,
  },
  priceStrike: {
    textDecorationLine: 'line-through',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  tag: {
    backgroundColor: Palette.sand,
    borderWidth: 1,
    borderColor: '#E7DCD2',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  description: {
    marginTop: 13,
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  countdown: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  error: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.errorText,
  },
  protection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    paddingTop: 13,
  },
  protectionTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  protectionBody: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivoryElevated,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 9,
  },
  halfBtn: {
    flex: 1,
  },
  buyBtn: {
    flex: 1.25,
  },
  fullBtn: {
    alignSelf: 'stretch',
  },
  soldBanner: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#E7DCD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBannerText: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
  },
  removedBox: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  removedTitle: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  removedBody: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  removedBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
});
