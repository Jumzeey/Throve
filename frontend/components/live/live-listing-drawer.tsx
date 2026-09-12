import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { CloseIcon, ShieldCheckIcon } from '@/components/ui/icons';
import { PhotoPager } from '@/components/ui/photo-pager';
import { Palette, Typography } from '@/constants/theme';
import { getProductImageSource } from '@/data/images';
import type { Listing, LiveStreamProduct } from '@/data/types';
import type { PinnedProductVariant } from '@/components/live/pinned-product-card';
import { formatCountdown, formatNaira } from '@/lib/format';
import {
  buyerProtectionFee,
  displayListingSize,
  formatUploaded,
  shippingRows,
} from '@/lib/listing-display';
import { useLiveClock } from '@/context/live-context';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const HERO_RATIO = 390 / 420;

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
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const now = useLiveClock();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const maxHeight = Dimensions.get('window').height * 0.92;

  useEffect(() => {
    if (!visible) return;
    setPhotoIndex(0);
    setDescOpen(false);
  }, [visible, product?.id]);

  const photos = useMemo(() => {
    const urls = product?.photoUrls?.length
      ? product.photoUrls
      : listing?.photoUrls?.length
        ? listing.photoUrls
        : [];
    return urls;
  }, [listing?.photoUrls, product?.photoUrls]);

  const title = product?.title ?? listing?.title ?? 'Product';
  const listPrice = product?.livePrice ?? listing?.price ?? 0;
  const price = listPrice ? formatNaira(listPrice) : '';
  const protection = buyerProtectionFee(listPrice);
  const protectedTotal = listPrice + protection;
  const sizeLabel = displayListingSize(product?.size ?? listing?.size ?? '');
  const condition = product?.condition ?? listing?.condition ?? '—';
  const brand = listing?.brand ?? '—';
  const description = listing?.description?.trim() || 'No description provided.';
  const descLong = description.length > 160;
  const shownDescription = descOpen || !descLong ? description : `${description.slice(0, 158).trim()}…`;
  const countdown =
    variant === 'your_claim' && claimExpiresAt ? formatCountdown(claimExpiresAt - now) : undefined;

  const details = [
    { label: 'Department', value: listing?.department ?? product?.department ?? '—' },
    { label: 'Category', value: listing?.category ?? product?.category ?? '—' },
    { label: 'Brand', value: brand },
    { label: 'Colour', value: listing?.colour || '—' },
    { label: 'Size', value: sizeLabel },
    { label: 'Condition', value: condition },
    ...(listing?.createdAt
      ? [{ label: 'Uploaded', value: formatUploaded(listing.createdAt) }]
      : []),
  ];

  const photoCount = Math.max(photos.length, listing?.photoCount ?? 0, 1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close listing" />
        <View style={[styles.sheet, { maxHeight, height: maxHeight }]}>
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
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.pagerBleed}>
                  <PhotoPager
                    count={photoCount}
                    listingId={product.listingId}
                    uris={photos}
                    index={photoIndex}
                    onIndexChange={setPhotoIndex}
                    aspectRatio={HERO_RATIO}
                    showCounter
                  />
                </View>

                {photos.length > 1 ? (
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    directionalLockEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbs}
                    keyboardShouldPersistTaps="handled"
                  >
                    {photos.slice(0, 6).map((uri, index) => {
                      const active = photoIndex === index;
                      return (
                        <Pressable
                          key={`${uri}-${index}`}
                          onPress={() => setPhotoIndex(index)}
                          style={[styles.thumb, active && styles.thumbActive]}
                        >
                          <AppImage
                            source={getProductImageSource(uri, product.listingId)}
                            style={styles.thumbImage}
                          />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <View style={styles.body}>
                  <View style={styles.statusRow}>
                    <StatusBadge variant={variant} />
                    {featuredInLive ? <Text style={styles.featuredHint}>Featured in this Live</Text> : null}
                  </View>

                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.metaLine}>
                    {sizeLabel} · {condition} · {brand}
                  </Text>
                  <Text
                    style={[
                      styles.price,
                      (variant === 'sold' || variant === 'reserved') && styles.priceMuted,
                      variant === 'sold' && styles.priceStrike,
                    ]}
                  >
                    {price}
                  </Text>

                  {variant !== 'sold' ? (
                    <>
                      <View style={styles.protectRow}>
                        <ShieldCheckIcon size={16} color={Palette.plum} />
                        <Text style={styles.protectTotal}>{formatNaira(protectedTotal)}</Text>
                        <Text style={styles.protectLabel}>incl. Buyer Protection</Text>
                      </View>
                      <Text style={styles.protectCopy}>
                        Covers your payment until the order completes — automatically 48 hours after delivery, or as
                        soon as you confirm receipt.{' '}
                        <Text
                          style={styles.learnMore}
                          onPress={() => {
                            onClose();
                            router.push('/buyer-protection');
                          }}
                        >
                          Learn more
                        </Text>
                      </Text>
                    </>
                  ) : null}

                  {countdown ? <Text style={styles.countdown}>Your claim · {countdown} left</Text> : null}
                  {claimError ? <Text style={styles.error}>{claimError}</Text> : null}

                  <Text style={styles.sectionHead}>Description</Text>
                  <Text style={styles.description}>{shownDescription}</Text>
                  {descLong ? (
                    <Pressable onPress={() => setDescOpen((open) => !open)} hitSlop={8}>
                      <Text style={styles.readMore}>{descOpen ? 'Read less' : 'Read more'}</Text>
                    </Pressable>
                  ) : null}

                  <Text style={styles.sectionHead}>Product details</Text>
                  {details.map((row, index) => (
                    <View
                      key={row.label}
                      style={[styles.detailRow, index === details.length - 1 && styles.detailRowLast]}
                    >
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{row.value}</Text>
                    </View>
                  ))}

                  <Text style={styles.sectionHead}>Shipping</Text>
                  {shippingRows().map((row, index) => (
                    <View key={row.label} style={[styles.detailRow, index === 1 && styles.detailRowLast]}>
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{formatNaira(row.fee)}</Text>
                    </View>
                  ))}
                  <Text style={styles.shippingNote}>
                    Delivery is chosen at checkout. Buyer Protection applies to every order paid through Throve.
                  </Text>

                  {listing?.seller ? (
                    <>
                      <Text style={styles.sectionHead}>Seller</Text>
                      <Text style={styles.sellerName}>{listing.seller}</Text>
                      <Text style={styles.sellerHint}>You’re watching this seller’s Live right now.</Text>
                    </>
                  ) : null}
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
    paddingBottom: 6,
    zIndex: 2,
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
    flex: 1,
  },
  scrollBody: {
    paddingBottom: 20,
  },
  pagerBleed: {
    marginHorizontal: -0,
  },
  thumbs: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: Palette.skeleton,
  },
  thumbActive: {
    borderColor: Palette.plum,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
    fontFamily: Typography.display,
    fontSize: 24,
    lineHeight: 30,
    color: Palette.espresso,
  },
  metaLine: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  price: {
    marginTop: 10,
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
  protectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  protectTotal: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  protectLabel: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  protectCopy: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  learnMore: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
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
  sectionHead: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  readMore: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: Palette.espresso,
  },
  shippingNote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  sellerName: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  sellerHint: {
    marginTop: 4,
    fontSize: 12,
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
