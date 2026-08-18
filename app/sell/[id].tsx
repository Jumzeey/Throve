import { OfferSheet } from '@/components/ui/offer-sheet';
import { PhotoPager } from '@/components/ui/photo-pager';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { listingStatusStyle } from '@/components/ui/simulated-stage';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellerListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const { session } = useAuth();
  const { getListing, loadFormFromListing, setStatus, removeListing, canDelete } = useListings();
  const inbox = useInbox();
  const checkout = useCheckout();
  const [note, setNote] = useState(notice === 'published' ? 'Listing published.' : '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [offerFor, setOfferFor] = useState<string | null>(null);

  useEffect(() => {
    if (notice === 'published') setNote('Listing published.');
  }, [notice]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const listing = id ? getListing(id) : undefined;
  if (!listing) {
    return (
      <View style={styles.screen}>
        <Pressable onPress={() => router.replace('/(tabs)/sell')} style={[styles.missingBack, { marginTop: insets.top + 12 }]}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.missing}>This listing is unavailable.</Text>
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
  const status = listingStatusStyle(item.status);
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
    if (removeListing(item.id)) {
      router.replace('/(tabs)/sell');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView>
        <View>
          <PhotoPager count={item.photoCount} />
          <Pressable onPress={() => router.replace('/(tabs)/sell')} style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={[styles.status, { backgroundColor: status.backgroundColor }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
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
            <Text style={styles.empty}>No one has saved this listing yet.</Text>
          ) : (
            buyers.map((username) => {
              const messagedLocked = !inbox.canSellerMessage(item.id, username, session.username);
              return (
                <View key={username} style={styles.buyer}>
                  <PlaceholderImage style={styles.avatar} />
                  <Text style={styles.buyerName}>@{username}</Text>
                  <Pressable
                    disabled={messagedLocked}
                    onPress={() => {
                      const conv = inbox.openOrCreateConversation(username, item.id, session.username);
                      router.push(`/inbox/chat/${conv.id}`);
                    }}
                    style={[styles.messageBtn, messagedLocked ? styles.messageOff : null]}>
                    <Text style={styles.messageLabel}>Message</Text>
                  </Pressable>
                  <Pressable onPress={() => setOfferFor(username)} style={styles.offerBtn}>
                    <Text style={styles.offerLabel}>Send offer</Text>
                  </Pressable>
                </View>
              );
            })
          )}
          {note ? (
            <View style={styles.note}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ) : null}
          {confirmDelete ? (
            <View style={styles.deleteBox}>
              <Text style={styles.deleteCopy}>{"Delete this listing? This can't be undone."}</Text>
              <View style={styles.deleteRow}>
                <Pressable onPress={() => setConfirmDelete(false)} style={styles.deleteCancel}>
                  <Text style={styles.deleteCancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable onPress={confirmRemove} style={styles.deleteConfirm}>
                  <Text style={styles.deleteConfirmLabel}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={edit} style={styles.footerBtn}>
          <Text style={styles.footerLabel}>Edit</Text>
        </Pressable>
        <Pressable onPress={toggleHidden} disabled={hideDisabled} style={[styles.footerBtn, hideDisabled ? styles.footerDisabled : null]}>
          <Text style={styles.footerLabel}>{hideLabel}</Text>
        </Pressable>
        <Pressable onPress={toggleSold} disabled={soldDisabled} style={[styles.footerBtn, soldDisabled ? styles.footerDisabled : null]}>
          <Text style={styles.footerLabel}>{soldLabel}</Text>
        </Pressable>
        <Pressable
          onPress={() => allowDelete && setConfirmDelete(true)}
          disabled={!allowDelete}
          style={[styles.deleteBtn, !allowDelete ? styles.footerDisabled : null]}>
          <Text style={styles.deleteBtnLabel}>Delete</Text>
        </Pressable>
      </View>
      <OfferSheet
        visible={Boolean(offerFor)}
        listingPrice={item.price}
        onClose={() => setOfferFor(null)}
        onSubmit={(amount) => {
          if (!offerFor) return;
          const created = inbox.createOffer({
            listingId: item.id,
            buyer: offerFor,
            seller: session.username,
            amount,
            initiator: 'seller',
          });
          setOfferFor(null);
          if (created) router.push(`/inbox/offer/${created.id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    color: Palette.text,
  },
  status: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: Palette.text,
  },
  price: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: '700',
    color: Palette.text,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: Palette.muted2,
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '600',
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    fontSize: 13,
    color: Palette.muted3,
  },
  buyer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hatch,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  buyerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  messageBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  messageOff: {
    opacity: 0.4,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.text,
  },
  offerBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: Palette.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.background,
  },
  note: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Palette.chipBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 13,
    color: Palette.muted,
  },
  deleteBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: 8,
  },
  deleteCopy: {
    fontSize: 13,
    color: Palette.errorText,
    marginBottom: 10,
  },
  deleteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteCancel: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: Palette.live,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  deleteCancelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.live,
  },
  deleteConfirm: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.live,
  },
  deleteConfirmLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.background,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
  },
  footerBtn: {
    flexGrow: 1,
    flexBasis: '22%',
    height: 44,
    borderWidth: 1,
    borderColor: Palette.text,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.text,
  },
  deleteBtn: {
    flexGrow: 1,
    flexBasis: '22%',
    height: 44,
    borderWidth: 1,
    borderColor: Palette.live,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  deleteBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.live,
  },
  footerDisabled: {
    opacity: 0.4,
  },
  missing: {
    marginTop: 40,
    textAlign: 'center',
    color: Palette.muted2,
  },
  missingBack: {
    marginLeft: 20,
  },
});
