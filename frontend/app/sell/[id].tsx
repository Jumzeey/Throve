import { AlertBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ChevronBackIcon } from '@/components/ui/icons';
import { OfferSheet } from '@/components/ui/offer-sheet';
import { PhotoPager } from '@/components/ui/photo-pager';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { getSellerAvatar } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { formatNaira } from '@/lib/format';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SellerListingScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const { session } = useAuth();
  const { getListing, loadFormFromListing, setStatus, removeListing, canDelete } = useListings();
  const inbox = useInbox();
  const checkout = useCheckout();
  const [note, setNote] = useState(notice === 'published' ? 'published' : '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [offerFor, setOfferFor] = useState<string | null>(null);

  useEffect(() => {
    if (notice === 'published') setNote('published');
  }, [notice]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const listing = id ? getListing(id) : undefined;
  if (!listing) {
    return (
      <View style={styles.screen}>
        <Pressable onPress={() => router.replace('/(tabs)/sell')} style={[styles.missingBack, { marginTop: top + 12 }]}>
          <ChevronBackIcon />
        </Pressable>
        <EmptyState
          title="Listing unavailable"
          message="This listing may have been removed or is no longer accessible."
          actionLabel="Back to listings"
          onAction={() => router.replace('/(tabs)/sell')}
          style={styles.missingState}
        />
      </View>
    );
  }

  if (listing.seller !== session.username) {
    return <Redirect href={`/product/${listing.id}`} />;
  }

  if (listing.status === 'draft') {
    return <Redirect href={{ pathname: '/sell/create', params: { id: listing.id } }} />;
  }

  const item = listing;
  const buyers = item.savedBy;
  const locked = item.status === 'reserved' || checkout.draft?.listingId === item.id;
  const allowDelete = canDelete(item.id) && !locked;
  const hideLabel = item.status === 'hidden' ? 'Unhide' : 'Hide';
  const soldLabel = item.status === 'sold' ? 'Relist' : 'Mark sold';
  const hideDisabled = item.status === 'reserved' || item.status === 'sold';
  const soldDisabled = item.status === 'reserved';

  function edit() {
    loadFormFromListing(item);
    router.push({ pathname: '/sell/create', params: { id: item.id } });
  }

  function toggleHidden() {
    if (item.status === 'hidden') {
      setStatus(item.id, 'available');
      return;
    }
    if (item.status === 'available') setStatus(item.id, 'hidden');
  }

  function toggleSold() {
    if (item.status === 'sold') {
      setStatus(item.id, 'available');
      return;
    }
    if (item.status !== 'reserved') setStatus(item.id, 'sold');
  }

  function confirmRemove() {
    if (!allowDelete) return;
    void removeListing(item.id).then((removed) => {
      if (removed) router.replace('/(tabs)/sell');
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView>
        <View>
          <PhotoPager count={item.photoCount} listingId={item.id} uris={item.photoUrls} />
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/sell'))} style={[styles.backBtn, { top: top + 8 }]}>
            <ChevronBackIcon />
          </Pressable>
          <View style={styles.statusWrap}>
            <StatusChip kind="listing" variant={item.status as ListingChipVariant} />
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>{formatNaira(item.price)}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.savedBy.length}</Text>
              <Text style={styles.statLabel}>Saved by</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{inbox.offersOnListing(item.id).length}</Text>
              <Text style={styles.statLabel}>Offers</Text>
            </View>
          </View>
          <Text style={styles.section}>Interested buyers</Text>
          {buyers.length === 0 ? (
            <EmptyState title="No interest yet" message="When buyers save this listing, they'll appear here." style={styles.buyersEmpty} />
          ) : (
            buyers.map((username) => {
              const messagedLocked = !inbox.canSellerMessage(item.id, username, session.username);
              return (
                <View key={username} style={styles.buyer}>
                  <AppImage source={getSellerAvatar(username)} style={styles.avatar} />
                  <Text style={styles.buyerName}>@{username}</Text>
                  <Button
                    label="Message"
                    variant="secondary"
                    disabled={messagedLocked}
                    onPress={() => {
                      void inbox.openOrCreateConversation(username, item.id, session.username).then((conv) => {
                        router.push(`/inbox/chat/${conv.id}`);
                      });
                    }}
                    style={styles.buyerBtn}
                  />
                  <Button label="Send offer" onPress={() => setOfferFor(username)} style={styles.buyerBtn} />
                </View>
              );
            })
          )}
          {note === 'published' ? (
            <AlertBanner variant="success" title="Listing published" message="Your item is now live and visible to buyers." style={styles.note} />
          ) : null}
          {confirmDelete ? (
            <View style={styles.deleteBox}>
              <Text style={styles.deleteCopy}>{"Delete this listing? This can't be undone."}</Text>
              <View style={styles.deleteRow}>
                <Button label="Cancel" variant="secondary" onPress={() => setConfirmDelete(false)} style={styles.deleteAction} />
                <Button label="Delete" variant="danger" onPress={confirmRemove} style={styles.deleteAction} />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: sheetBottom }]}>
        <Button label="Edit" variant="secondary" onPress={edit} style={styles.footerBtn} />
        <Button label={hideLabel} variant="secondary" disabled={hideDisabled} onPress={toggleHidden} style={styles.footerBtn} />
        <Button label={soldLabel} variant="secondary" disabled={soldDisabled} onPress={toggleSold} style={styles.footerBtn} />
        <Button label="Delete" variant="danger" disabled={!allowDelete} onPress={() => allowDelete && setConfirmDelete(true)} style={styles.footerBtn} />
      </View>
      <OfferSheet
        visible={Boolean(offerFor)}
        listingPrice={item.price}
        onClose={() => setOfferFor(null)}
        onSubmit={(amount) => {
          if (!offerFor) return;
          void inbox
            .createOffer({
              listingId: item.id,
              buyer: offerFor,
              seller: session.username,
              amount,
              initiator: 'seller',
            })
            .then((created) => {
              setOfferFor(null);
              if (created) router.push(`/inbox/offer/${created.id}`);
            });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,247,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusWrap: {
    position: 'absolute',
    bottom: 14,
    left: 14,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  price: {
    marginTop: 6,
    fontSize: 22,
    fontFamily: Typography.displayBold,
    color: Palette.plum,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.lg,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Typography.displayBold,
    color: Palette.espresso,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  section: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  buyersEmpty: {
    marginTop: Spacing.sm,
  },
  buyer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  buyerName: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  buyerBtn: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
  },
  note: {
    marginTop: Spacing.lg,
  },
  deleteBox: {
    marginTop: Spacing.lg,
    padding: 14,
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: Radius.sm,
  },
  deleteCopy: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.errorText,
    marginBottom: 12,
  },
  deleteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteAction: {
    flex: 1,
    minHeight: 44,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivory,
  },
  footerBtn: {
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: 44,
  },
  missingBack: {
    marginLeft: Spacing.xl,
  },
  missingState: {
    marginTop: 40,
    marginHorizontal: Spacing.xl,
  },
});
