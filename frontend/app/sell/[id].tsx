import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ClockIcon, SpinnerArcIcon } from '@/components/ui/icons';
import { OfferSheet } from '@/components/ui/offer-sheet';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { getListingImageSource } from '@/data/images';
import type { Listing } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SellerListingScreen() {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const { session } = useAuth();
  const { getListing, loadFormFromListing, setStatus, removeListing, canDelete } = useListings();
  const inbox = useInbox();
  const checkout = useCheckout();
  const { isConnected } = useNetworkStatus();
  const [note, setNote] = useState<'published' | 'updated' | null>(notice === 'published' ? 'published' : null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(false);

  useEffect(() => {
    if (notice === 'published') setNote('published');
  }, [notice]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(timer);
  }, [note]);

  const listing = id ? getListing(id) : undefined;
  const order = useMemo(
    () => (listing ? checkout.orders.find((entry) => entry.listingId === listing.id) : undefined),
    [checkout.orders, listing],
  );

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!listing) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Manage listing" onBack={() => router.replace('/(tabs)/sell')} />
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

  const item = listing;
  const buyers = item.savedBy;
  const reserved = item.status === 'reserved' || checkout.draft?.listingId === item.id;
  const allowDelete = canDelete(item.id) && !reserved && item.status !== 'sold';

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/sell');
  }

  function edit() {
    loadFormFromListing(item);
    router.push({ pathname: '/sell/create', params: { id: item.id } });
  }

  async function runStatus(next: Listing['status'], successNote: 'updated' | null = 'updated') {
    if (!isConnected || saving) return;
    setSaving(true);
    setActionError(false);
    try {
      await setStatus(item.id, next);
      if (successNote) setNote(successNote);
    } catch {
      setActionError(true);
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!allowDelete || saving) return;
    setSaving(true);
    setActionError(false);
    setConfirmDelete(false);
    try {
      const removed = await removeListing(item.id);
      if (removed) {
        router.replace('/(tabs)/sell');
        return;
      }
      setActionError(true);
    } catch {
      setActionError(true);
    } finally {
      setSaving(false);
    }
  }

  const classification = [
    { label: 'Department', value: item.department },
    { label: 'Category', value: item.category },
    { label: 'Condition', value: item.condition },
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Manage listing" onBack={goBack} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: sheetBottom + 24 }]} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to manage this listing." />
        ) : null}
        {actionError ? (
          <AlertBanner
            variant="error"
            title="We couldn't save those changes"
            message="Please try again in a moment."
          />
        ) : null}
        {note === 'published' ? (
          <AlertBanner variant="success" title="Listing published" message="Your item is now live and visible to buyers." />
        ) : null}
        {note === 'updated' ? (
          <AlertBanner
            variant="success"
            title="Listing updated"
            message="Buyers see the new details straight away."
          />
        ) : null}

        <View style={styles.summaryCard}>
          <AppImage source={getListingImageSource(item)} style={styles.summaryThumb} />
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.summaryPrice}>{formatNaira(item.price)}</Text>
            <StatusChip kind="listing" variant={item.status as ListingChipVariant} />
          </View>
        </View>

        {item.status === 'reserved' || reserved ? (
          <View style={styles.reservedBanner}>
            <ClockIcon size={16} color={Palette.warningText} />
            <Text style={styles.reservedBannerText}>
              A buyer is completing checkout. This item is held while their claim is active. If it expires it returns to
              Available.
            </Text>
          </View>
        ) : null}

        {item.status !== 'draft' ? (
          <View style={styles.classification}>
            <Text style={styles.classLabel}>CLASSIFICATION</Text>
            {classification.map((row, index) => (
              <View
                key={row.label}
                style={[styles.classRow, index === classification.length - 1 && styles.classRowLast]}>
                <Text style={styles.classKey}>{row.label}</Text>
                <Text style={styles.classValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionHead}>Listing controls</Text>
        <View style={styles.controls}>
          {item.status === 'available' && !reserved ? (
            <>
              <Button label="Edit listing" onPress={edit} disabled={saving || !isConnected} />
              <Button
                label="Mark as sold"
                variant="secondary"
                disabled={saving || !isConnected}
                onPress={() => void runStatus('sold')}
              />
              <Button
                label="Hide listing"
                variant="secondary"
                disabled={saving || !isConnected}
                onPress={() => void runStatus('hidden')}
                style={styles.softSecondary}
              />
              <Pressable
                disabled={!allowDelete || saving || !isConnected}
                onPress={() => setConfirmDelete(true)}
                style={[styles.deleteOutline, (!allowDelete || saving || !isConnected) && styles.controlDisabled]}>
                <Text
                  style={[
                    styles.deleteOutlineLabel,
                    (!allowDelete || saving || !isConnected) && styles.controlDisabledLabel,
                  ]}>
                  Delete listing
                </Text>
              </Pressable>
              <Text style={styles.help}>
                Hide removes this from public browse until you make it available again. Mark as sold is for sales
                completed outside Throve.
              </Text>
            </>
          ) : null}

          {(item.status === 'reserved' || reserved) && item.status !== 'sold' && item.status !== 'hidden' && item.status !== 'draft' ? (
            <>
              <Button
                label="View listing"
                variant="secondary"
                onPress={() => router.push(`/product/${item.id}`)}
              />
              <Button label="Edit listing" variant="secondary" disabled />
              <Button label="Mark as sold" variant="secondary" disabled />
              <Button label="Hide listing" variant="secondary" disabled />
              <Pressable disabled style={[styles.deleteOutline, styles.controlDisabled]}>
                <Text style={[styles.deleteOutlineLabel, styles.controlDisabledLabel]}>Delete listing</Text>
              </Pressable>
              <Text style={styles.help}>
                Listing changes are temporarily unavailable while a buyer is completing checkout. Hide, Mark as sold,
                and Delete stay locked until the claim expires or the order completes.
              </Text>
            </>
          ) : null}

          {item.status === 'sold' ? (
            <>
              <Button
                label="View order"
                variant="secondary"
                disabled={!order}
                onPress={() => {
                  if (order) router.push(`/checkout/order?id=${order.id}`);
                }}
              />
              <Pressable disabled style={[styles.deleteOutline, styles.controlDisabled]}>
                <Text style={[styles.deleteOutlineLabel, styles.controlDisabledLabel]}>Delete listing</Text>
              </Pressable>
              <Text style={styles.help}>
                Sold items can&apos;t be bought again. Delete stays unavailable while the order is open.
              </Text>
            </>
          ) : null}

          {item.status === 'hidden' ? (
            <>
              <Button
                label="Make available again"
                disabled={saving || !isConnected}
                onPress={() => void runStatus('available')}
              />
              <Button label="Edit listing" variant="secondary" disabled={saving || !isConnected} onPress={edit} />
              <Pressable
                disabled={!allowDelete || saving || !isConnected}
                onPress={() => setConfirmDelete(true)}
                style={[styles.deleteOutline, (!allowDelete || saving || !isConnected) && styles.controlDisabled]}>
                <Text
                  style={[
                    styles.deleteOutlineLabel,
                    (!allowDelete || saving || !isConnected) && styles.controlDisabledLabel,
                  ]}>
                  Delete listing
                </Text>
              </Pressable>
              <Text style={styles.help}>
                A hidden listing isn&apos;t publicly available and can&apos;t be bought until you make it available again.
              </Text>
            </>
          ) : null}

          {item.status === 'draft' ? (
            <>
              <Button label="Continue editing" onPress={edit} disabled={!isConnected} />
              <Pressable
                disabled={!allowDelete || saving || !isConnected}
                onPress={() => setConfirmDelete(true)}
                style={[styles.deleteOutline, (!allowDelete || saving || !isConnected) && styles.controlDisabled]}>
                <Text
                  style={[
                    styles.deleteOutlineLabel,
                    (!allowDelete || saving || !isConnected) && styles.controlDisabledLabel,
                  ]}>
                  Delete draft
                </Text>
              </Pressable>
              <Text style={styles.help}>A draft isn&apos;t visible to buyers and has no interested buyers yet.</Text>
            </>
          ) : null}
        </View>

        {item.status !== 'draft' ? (
          <View style={styles.buyersSection}>
            <View style={styles.buyersHead}>
              <Text style={styles.sectionHeadInline}>Interested buyers</Text>
              <Text style={styles.buyersCount}>{buyers.length}</Text>
            </View>
            <Text style={styles.buyersIntro}>
              Buyers who saved this item. You can send one message per buyer, or send them an offer.
            </Text>

            {buyers.length === 0 ? (
              <EmptyState
                title="No interested buyers yet"
                message="When someone saves this item they'll appear here."
                style={styles.buyersEmpty}
              />
            ) : (
              <View style={styles.buyersList}>
                {buyers.map((username) => {
                  const messagedLocked = !inbox.canSellerMessage(item.id, username, session.username);
                  return (
                    <View key={username} style={styles.buyerRow}>
                      <View style={styles.buyerTop}>
                        <ProfileAvatar username={username} style={styles.avatar} />
                        <View style={styles.buyerCopy}>
                          <Text style={styles.buyerName}>{username}</Text>
                          <Text style={styles.buyerMeta}>Saved this item</Text>
                        </View>
                      </View>
                      <View style={styles.buyerActions}>
                        <Button
                          label={messagedLocked ? 'Message sent' : 'Send message'}
                          variant="secondary"
                          disabled={messagedLocked || !isConnected}
                          onPress={() => {
                            void inbox.openOrCreateConversation(username, item.id, session.username).then((conv) => {
                              router.push(`/inbox/chat/${conv.id}`);
                            });
                          }}
                          style={styles.buyerBtn}
                        />
                        <Button
                          label="Send offer"
                          disabled={!isConnected || reserved || item.status === 'sold' || item.status === 'hidden'}
                          onPress={() => setOfferFor(username)}
                          style={styles.buyerBtn}
                        />
                      </View>
                      {messagedLocked ? (
                        <Text style={styles.messageHint}>
                          You&apos;ve used your one message to this buyer. They can reply any time.
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.privacyNote}>
              Only the username and when they saved the item are shown — nothing else about the buyer.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {saving ? (
        <View style={[styles.savingBar, { bottom: sheetBottom + 12 }]}>
          <SpinnerArcIcon size={16} color={Palette.ivory} />
          <Text style={styles.savingLabel}>Saving changes...</Text>
        </View>
      ) : null}

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Delete this listing?</Text>
            <Text style={styles.modalBody}>This can&apos;t be undone. There&apos;s no active transaction on this item.</Text>
            <View style={styles.modalActions}>
              <Button label="Keep listing" variant="secondary" onPress={() => setConfirmDelete(false)} style={styles.modalBtn} />
              <Button label="Delete" variant="danger" onPress={() => void confirmRemove()} style={styles.modalBtn} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: 14,
  },
  missingState: {
    marginTop: 40,
    marginHorizontal: Spacing.xl,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
  },
  summaryThumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  summaryPrice: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
  },
  reservedBanner: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
    backgroundColor: Palette.warningBg,
  },
  reservedBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.warningText,
  },
  classification: {
    marginTop: 4,
  },
  classLabel: {
    marginBottom: 4,
    fontSize: 11,
    letterSpacing: 0.7,
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  classRowLast: {
    borderBottomWidth: 0,
  },
  classKey: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.label,
  },
  classValue: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: Palette.espresso,
  },
  sectionHead: {
    marginTop: 8,
    fontSize: 19,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  sectionHeadInline: {
    fontSize: 19,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  controls: {
    gap: 10,
  },
  softSecondary: {
    borderColor: Palette.borderSoft,
  },
  deleteOutline: {
    minHeight: 52,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    backgroundColor: Palette.ivoryElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  deleteOutlineLabel: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.error,
  },
  controlDisabled: {
    backgroundColor: Palette.disabledBg,
    borderColor: Palette.disabledBorder,
  },
  controlDisabledLabel: {
    color: Palette.disabled,
  },
  help: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  buyersSection: {
    marginTop: 10,
    gap: 10,
  },
  buyersHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  buyersCount: {
    fontSize: 16,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  buyersIntro: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  buyersEmpty: {
    marginTop: 4,
  },
  buyersList: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  buyerRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    gap: 12,
  },
  buyerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  buyerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  buyerName: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  buyerMeta: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  buyerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  buyerBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
  },
  messageHint: {
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  privacyNote: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  savingBar: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Palette.plum,
  },
  savingLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43,33,31,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  modalBody: {
    fontSize: 13.5,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
  },
});
