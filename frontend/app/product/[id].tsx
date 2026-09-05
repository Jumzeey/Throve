import { AppImage } from '@/components/ui/app-image';
import { OfferSheet } from '@/components/ui/offer-sheet';
import { PhotoPager } from '@/components/ui/photo-pager';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getListingImage, getListingImageSource, isUsableRemoteImageUri } from '@/data/images';
import { sellerRatingInfo } from '@/data/seed';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { openNativeShare } from '@/lib/share-listing';
import {
  buyerProtectionFee,
  displayListingSize,
  formatUploaded,
  shippingRows,
} from '@/lib/listing-display';
import {
  ChatBubbleIcon,
  ChevronBackIcon,
  HeartIcon,
  ShareIcon,
  ShieldCheckIcon,
  StarIcon,
} from '@/components/ui/icons';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const HERO_RATIO = 390 / 452;

export default function ProductScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const { session, publicProfiles, ensurePublicProfile } = useAuth();
  const { getListing, toggleSave } = useListings();
  const inbox = useInbox();
  const checkout = useCheckout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = id ? getListing(id) : undefined;
  const [offerOpen, setOfferOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const [protectOpen, setProtectOpen] = useState(false);
  const [sellerStats, setSellerStats] = useState({ avg: 0, count: 0 });

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 2000);
    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    if (!listing?.seller) return;
    void ensurePublicProfile(listing.seller).catch(() => undefined);
    const fallback = sellerRatingInfo(listing.seller);
    const live = checkout.ratingInfo(listing.seller);
    setSellerStats(live.count ? live : fallback);
    void apiFetch<{ avg: number; count: number }>(`/checkout/reviews/${encodeURIComponent(listing.seller)}`)
      .then((data) => {
        if (data.count) setSellerStats({ avg: data.avg, count: data.count });
      })
      .catch(() => undefined);
  }, [checkout, ensurePublicProfile, listing?.seller]);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  if (!listing) {
    return (
      <View style={styles.screen}>
        <Pressable onPress={() => router.back()} style={[styles.missingBack, { marginTop: top + 12 }]}>
          <ChevronBackIcon />
        </Pressable>
        <Text style={styles.missing}>This listing is unavailable.</Text>
      </View>
    );
  }

  const product = listing;
  const username = session.username;
  const saved = product.savedBy.includes(username);
  const isOwn = username === product.seller;
  const canTrade = !isOwn && product.status === 'available';
  const sizeLabel = displayListingSize(product.size);
  const photoTotal = Math.max(product.photoUrls?.length ?? 0, product.photoCount, 1);
  const protection = buyerProtectionFee(product.price);
  const protectedTotal = product.price + protection;
  const sellerProfile = publicProfiles[product.seller];
  const photoUris = product.photoUrls?.length ? product.photoUrls : [];
  const description = product.description?.trim() || 'No description provided.';
  const descLong = description.length > 160;
  const shownDescription = descOpen || !descLong ? description : `${description.slice(0, 158).trim()}…`;
  const thumbCount = Math.min(5, photoTotal);
  const extraThumbs = photoTotal > 5 ? photoTotal - 4 : 0;
  const visibleThumbs = extraThumbs ? 4 : thumbCount;

  async function messageSeller() {
    const conv = await inbox.openOrCreateConversation(product.seller, product.id, username);
    router.push(`/inbox/chat/${conv.id}`);
  }

  async function buyNow() {
    const started = await checkout.startCheckout({ listingId: product.id, buyer: username, liveSessionId: null });
    if (started) router.push('/checkout/shipping');
  }

  async function shareListing() {
    try {
      await openNativeShare({ id: product.id, title: product.title, price: product.price });
    } catch {
      setBanner('Could not share this item.');
    }
  }

  const details = [
    { label: 'Department', value: product.department },
    { label: 'Category', value: product.category },
    { label: 'Brand', value: product.brand },
    { label: 'Colour', value: product.colour || '—' },
    { label: 'Size', value: sizeLabel },
    { label: 'Condition', value: product.condition },
    { label: 'Uploaded', value: formatUploaded(product.createdAt) },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
        <View>
          <PhotoPager
            count={photoTotal}
            listingId={listing.id}
            uris={photoUris}
            index={photoIndex}
            onIndexChange={setPhotoIndex}
            aspectRatio={HERO_RATIO}
            showCounter
          />
          <View style={styles.heroActions} pointerEvents="box-none">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={[styles.circleBtn, { top: top + 8, left: 16 }]}>
              <ChevronBackIcon />
            </Pressable>
            <View style={[styles.heroRight, { top: top + 8 }]}>
              <Pressable
                onPress={() => {
                  void toggleSave(product.id, username).catch(() => setBanner('Could not save this item.'));
                }}
                hitSlop={8}
                style={styles.circleBtnStatic}>
                <HeartIcon size={18} filled={saved} color={saved ? Palette.plum : Palette.espresso} />
              </Pressable>
              <Pressable onPress={() => void shareListing()} hitSlop={8} style={styles.circleBtnStatic}>
                <ShareIcon />
              </Pressable>
            </View>
          </View>
          {banner ? (
            <View style={[styles.banner, { top: top + 8 }]}>
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          ) : null}
        </View>

        {photoTotal > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbs}
            keyboardShouldPersistTaps="handled">
            {Array.from({ length: visibleThumbs }).map((_, index) => {
              const uri = photoUris[index];
              const source = uri && isUsableRemoteImageUri(uri) ? uri : getListingImage(listing.id);
              const active = photoIndex === index;
              return (
                <Pressable key={index} onPress={() => setPhotoIndex(index)} style={[styles.thumb, active && styles.thumbActive]}>
                  <AppImage source={source ?? getListingImageSource(listing)} style={styles.thumbImage} />
                </Pressable>
              );
            })}
            {extraThumbs ? (
              <Pressable onPress={() => setPhotoIndex(Math.min(4, photoTotal - 1))} style={styles.thumbMore}>
                <Text style={styles.thumbMoreText}>+{extraThumbs}</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.metaLine}>
            {sizeLabel} · {listing.condition} · {listing.brand}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatNaira(listing.price)}</Text>
            {listing.status !== 'reserved' ? <AvailabilityBadge status={listing.status} /> : null}
          </View>
          {listing.status === 'available' ? (
            <>
              <View style={styles.protectRow}>
                <ShieldCheckIcon />
                <Text style={styles.protectTotal}>{formatNaira(protectedTotal)}</Text>
                <Text style={styles.protectLabel}>incl. Buyer Protection</Text>
              </View>
              <Text style={styles.protectCopy}>
                Covers your payment until the order completes — automatically 48 hours after delivery, or as soon as you
                confirm receipt.{' '}
                <Text style={styles.learnMore} onPress={() => setProtectOpen(true)}>
                  Learn more
                </Text>
              </Text>
            </>
          ) : listing.status === 'reserved' ? (
            <View style={styles.reservedNotice}>
              <AvailabilityBadge status="reserved" />
              <Text style={styles.reservedCopy}>
                This item is reserved for another buyer while their checkout completes. You can still save it or message
                the seller — if the reservation expires it returns to Available.
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionHead}>Description</Text>
          <Text style={styles.description}>{shownDescription}</Text>
          {descLong ? (
            <Pressable onPress={() => setDescOpen((open) => !open)} hitSlop={8}>
              <Text style={styles.readMore}>{descOpen ? 'Read less' : 'Read more'}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionHead}>Product details</Text>
          {details.map((row, index) => (
            <View key={row.label} style={[styles.detailRow, index === details.length - 1 && styles.detailRowLast]}>
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

          <Text style={styles.sectionHead}>Seller</Text>
          <View style={styles.sellerCard}>
            <View style={styles.sellerTop}>
              <ProfileAvatar
                uri={sellerProfile?.photoUri}
                username={listing.seller}
                style={styles.sellerAvatar}
              />
              <View style={styles.sellerCopy}>
                <Text style={styles.sellerName} numberOfLines={1}>
                  {listing.seller}
                </Text>
                <View style={styles.ratingRow}>
                  {sellerStats.count > 0 ? (
                    <>
                      <StarIcon size={12} />
                      <Text style={styles.sellerRating}>
                        {sellerStats.avg.toFixed(1)} · {sellerStats.count} reviews
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.sellerRating}>New seller</Text>
                  )}
                </View>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/seller/[username]', params: { username: listing.seller } })}
                style={styles.viewProfile}>
                <Text style={styles.viewProfileLabel}>View profile</Text>
              </Pressable>
            </View>
            {!isOwn ? (
              <>
                <View style={styles.sellerDivider} />
                <Pressable onPress={() => void messageSeller()} style={styles.messageBtn}>
                  <ChatBubbleIcon />
                  <Text style={styles.messageBtnLabel}>Message seller</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: sheetBottom }]}>
        <Pressable
          onPress={() => {
            void toggleSave(product.id, username).catch(() => setBanner('Could not save this item.'));
          }}
          style={styles.heartFooter}>
          <HeartIcon size={20} filled={saved} color={saved ? Palette.plum : Palette.espresso} />
        </Pressable>
        {!isOwn ? (
          <Pressable
            disabled={!canTrade}
            onPress={() => setOfferOpen(true)}
            style={[
              styles.footerBtn,
              styles.footerOffer,
              product.status === 'reserved' && styles.footerOfferReserved,
              product.status === 'sold' && styles.footerDisabled,
            ]}
            accessibilityState={{ disabled: !canTrade }}>
            <Text
              style={[
                styles.footerOfferLabel,
                product.status === 'reserved' && styles.footerOfferReservedLabel,
                product.status === 'sold' && styles.footerDisabledLabel,
              ]}>
              {product.status === 'reserved' ? 'Make offer' : 'Make an offer'}
            </Text>
          </Pressable>
        ) : null}
        {isOwn ? null : (
          <Pressable
            disabled={!canTrade}
            onPress={() => void buyNow()}
            style={[
              styles.footerBtn,
              styles.footerBuy,
              product.status === 'reserved' && styles.footerBuyReserved,
              product.status === 'sold' && styles.footerBuyDisabled,
            ]}
            accessibilityState={{ disabled: !canTrade }}>
            <Text
              style={[
                styles.footerBuyLabel,
                product.status === 'reserved' && styles.footerBuyReservedLabel,
                product.status === 'sold' && styles.footerDisabledLabel,
              ]}>
              Buy now
            </Text>
          </Pressable>
        )}
      </View>

      {!isOwn ? (
        <OfferSheet
          visible={offerOpen}
          listingPrice={product.price}
          onClose={() => setOfferOpen(false)}
          onSubmit={(amount) => {
            void inbox
              .createOffer({
                listingId: product.id,
                buyer: username,
                seller: product.seller,
                amount,
                initiator: 'buyer',
              })
              .then((created) => {
                setOfferOpen(false);
                if (created) setBanner(`Offer of ${formatNaira(amount)} sent`);
              });
          }}
        />
      ) : null}

      <Modal visible={protectOpen} transparent animationType="fade" onRequestClose={() => setProtectOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setProtectOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Buyer Protection is included</Text>
            <Text style={styles.modalBody}>
              Covers eligible problems such as an item never arriving, the wrong item, or an item materially different
              from the listing. It doesn't cover a change of mind or an accurate listing that doesn't suit you. The fee
              is 5% of the item price, capped at ₦2,500.
            </Text>
            <Pressable onPress={() => setProtectOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseLabel}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function AvailabilityBadge({ status }: { status: string }) {
  const tone =
    status === 'available'
      ? { border: Palette.success, color: Palette.success, dot: Palette.success, label: 'AVAILABLE' }
      : status === 'reserved'
        ? { border: Palette.warning, color: Palette.warning, dot: Palette.warning, label: 'RESERVED' }
        : { border: Palette.espresso, color: Palette.espresso, dot: Palette.espresso, label: 'SOLD' };
  return (
    <View style={[styles.avail, { borderColor: tone.border }]}>
      <View style={[styles.availDot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.availLabel, { color: tone.color }]}>{tone.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  heroActions: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 4,
  },
  heroRight: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  circleBtn: {
    position: 'absolute',
    zIndex: 2,
    elevation: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,247,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnStatic: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,247,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Palette.plum,
    borderRadius: Radius.md,
    zIndex: 3,
  },
  bannerText: { fontSize: 13, fontFamily: Typography.bodySemiBold, color: Palette.ivory, textAlign: 'center' },
  thumbs: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  thumb: {
    width: 52,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  thumbActive: {
    borderWidth: 1.5,
    borderColor: Palette.plum,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbMore: {
    width: 52,
    height: 60,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbMoreText: { fontSize: 11, fontFamily: Typography.body, color: Palette.muted },
  body: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
  title: {
    fontSize: 27,
    lineHeight: 32,
    fontFamily: Typography.display,
    color: Palette.espresso,
    marginBottom: 7,
  },
  metaLine: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  price: {
    fontSize: 27,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
  },
  avail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availLabel: {
    fontSize: 10.5,
    letterSpacing: 0.7,
    fontFamily: Typography.bodySemiBold,
  },
  protectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  protectTotal: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.successText,
  },
  protectLabel: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: '#5C6B58',
  },
  protectCopy: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    marginTop: 8,
  },
  learnMore: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  reservedNotice: {
    marginTop: 4,
  },
  reservedCopy: {
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
    marginTop: 12,
  },
  sectionHead: {
    marginTop: 26,
    marginBottom: 9,
    fontSize: 19,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  description: { fontSize: 13.5, lineHeight: 23, fontFamily: Typography.body, color: Palette.body },
  readMore: {
    marginTop: 9,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  detailRowLast: { borderBottomWidth: 1 },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.label,
  },
  detailValue: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: Palette.espresso,
    textAlign: 'right',
  },
  shippingNote: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    paddingTop: 12,
  },
  sellerCard: {
    borderWidth: 1,
    borderColor: Palette.accent200,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
    padding: 15,
  },
  sellerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    backgroundColor: Palette.border,
  },
  sellerCopy: { flex: 1, minWidth: 0 },
  sellerName: {
    fontSize: 14.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sellerRating: { fontSize: 12, fontFamily: Typography.body, color: Palette.muted },
  viewProfile: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.plum,
  },
  viewProfileLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  sellerDivider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginVertical: 14,
  },
  messageBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#C8B7AE',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  messageBtnLabel: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: 'rgba(255,252,248,0.97)',
    alignItems: 'center',
  },
  heartFooter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#C8B7AE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerOffer: {
    borderWidth: 1,
    borderColor: Palette.plum,
  },
  footerOfferLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  footerBuy: {
    backgroundColor: Palette.plum,
  },
  footerBuyLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  footerDisabled: {
    borderColor: '#D4C7BE',
  },
  footerOfferReserved: {
    borderColor: '#D4C7BE',
  },
  footerOfferReservedLabel: {
    color: Palette.disabled,
  },
  footerBuyDisabled: {
    backgroundColor: Palette.accent200,
  },
  footerBuyReserved: {
    backgroundColor: Palette.accent200,
  },
  footerBuyReservedLabel: {
    color: Palette.muted3,
  },
  footerDisabledLabel: {
    color: Palette.disabled,
  },
  missing: { marginTop: 40, textAlign: 'center', fontFamily: Typography.body, color: Palette.muted },
  missingBack: { marginLeft: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23,23,23,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Palette.ivory,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  modalTitle: {
    fontFamily: Typography.display,
    fontSize: 19,
    color: Palette.espresso,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  modalClose: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
});
