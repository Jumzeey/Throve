import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { EyeIcon } from '@/components/ui/icons';
import { PhotoPager } from '@/components/ui/photo-pager';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { isListingFormPublishable, parseListingPrice, useListings } from '@/context/listings-context';
import { DELIVERY_OPTIONS } from '@/data/checkout';
import { isNativeImageUri } from '@/data/images';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import { displayListingSize } from '@/lib/listing-display';
import { getCachedListingCatalog } from '@/lib/listing-catalog';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ListingPreviewScreen() {
  const router = useRouter();
  const { top, sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const { form, publish, saveDraft } = useListings();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!isListingFormPublishable(form)) {
    return <Redirect href="/sell/create" />;
  }

  const username = session.username;
  const price = parseListingPrice(form.price) ?? 0;
  const brand = form.brand.trim() || 'Unbranded';
  const sizeLabel = displayListingSize(form.size);
  const photoUris = (form.photoUris ?? []).filter(Boolean);
  const photoCount = Math.max(photoUris.length || form.photoCount, 1);
  const description = form.description.trim() || 'No description provided.';
  const shipping = shippingOptions();

  const details = [
    { label: 'Brand', value: brand },
    { label: 'Colour', value: form.colour.trim() || '—' },
    { label: 'Size', value: sizeLabel },
    { label: 'Condition', value: form.condition },
  ];

  function goEdit() {
    if (form.id) {
      router.replace({ pathname: '/sell/create', params: { id: form.id } });
      return;
    }
    router.replace('/sell/create');
  }

  async function goPublish() {
    if (publishing) return;
    setPublishing(true);
    try {
      const listing = await publish(username);
      if (!listing) {
        router.replace('/sell/create');
        return;
      }
      router.replace({ pathname: '/sell/[id]', params: { id: listing.id, notice: 'published' } });
    } catch {
      setPublishing(false);
    }
  }

  async function goDraft() {
    if (saving) return;
    setSaving(true);
    try {
      await saveDraft(username);
      router.replace({ pathname: '/(tabs)/sell', params: { tab: 'draft' } });
    } catch {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.previewBanner, { paddingTop: top + 10 }]}>
        <EyeIcon size={14} color={Palette.plum} />
        <Text style={styles.previewBannerText}>
          Seller preview. Not published — this is how buyers will see it.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
        <PhotoPager
          count={photoCount}
          uris={photoUris}
          index={photoIndex}
          onIndexChange={setPhotoIndex}
          aspectRatio={1}
        />

        {photoCount > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbs}
            keyboardShouldPersistTaps="handled">
            {Array.from({ length: photoCount }).map((_, index) => {
              const uri = photoUris[index];
              const loadable = uri && isNativeImageUri(uri);
              const active = photoIndex === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => setPhotoIndex(index)}
                  style={[styles.thumb, active && styles.thumbActive]}>
                  {loadable ? (
                    <Image source={{ uri }} style={styles.thumbImage} />
                  ) : (
                    <AppImage source={null} style={styles.thumbImage} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          <Text style={styles.title}>{form.title.trim()}</Text>
          <View style={styles.tags}>
            <MetaTag label={`Department · ${form.department}`} />
            <MetaTag label={`Category · ${form.category}`} />
          </View>
          <Text style={styles.price}>{formatNaira(price)}</Text>

          <Text style={styles.sectionHead}>Description</Text>
          <Text style={styles.description}>{description}</Text>

          <Text style={styles.sectionHead}>Item details</Text>
          {details.map((row, index) => (
            <View key={row.label} style={[styles.detailRow, index === details.length - 1 && styles.detailRowLast]}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}

          <Text style={styles.sectionHead}>Shipping</Text>
          <View style={styles.shippingCard}>
            {shipping.map((option, index) => (
              <View
                key={option.value}
                style={[styles.shippingRow, index === shipping.length - 1 && styles.shippingRowLast]}>
                <View style={styles.shippingCopy}>
                  <Text style={styles.shippingLabel}>{option.label}</Text>
                  <Text style={styles.shippingEta}>{option.eta}</Text>
                </View>
                <Text style={styles.shippingFee}>{formatNaira(option.fee)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: sheetBottom }]}>
        <Button
          label="Publish listing"
          loading={publishing}
          disabled={saving}
          onPress={() => void goPublish()}
        />
        <View style={styles.secondaryRow}>
          <Button
            label="Edit"
            variant="secondary"
            disabled={publishing || saving}
            onPress={goEdit}
            style={styles.secondaryBtn}
          />
          <Button
            label={saving ? 'Saving…' : 'Save as draft'}
            variant="ghost"
            loading={saving}
            disabled={publishing}
            onPress={() => void goDraft()}
            style={[styles.secondaryBtn, styles.draftBtn]}
          />
        </View>
      </View>
    </View>
  );
}

function MetaTag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function shippingOptions() {
  const catalog = getCachedListingCatalog();
  if (catalog?.shipping?.length) {
    return catalog.shipping.map((option) => ({
      value: option.value,
      label: option.label,
      eta: option.eta,
      fee: option.fee,
    }));
  }
  return DELIVERY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    eta: option.eta.replace(/^Estimated /, ''),
    fee: option.fee,
  }));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 12,
    backgroundColor: '#F3EAF0',
  },
  previewBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.plum,
  },
  thumbs: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.sand,
  },
  thumbActive: {
    borderWidth: 1.5,
    borderColor: Palette.plum,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  title: {
    fontSize: 27,
    lineHeight: 32,
    fontFamily: Typography.display,
    color: Palette.espresso,
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
  },
  tagText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  price: {
    fontSize: 27,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
  },
  sectionHead: {
    marginTop: 26,
    marginBottom: 9,
    fontSize: 19,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 23,
    fontFamily: Typography.body,
    color: Palette.body,
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
  detailRowLast: {
    borderBottomWidth: 0,
  },
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
  shippingCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    backgroundColor: Palette.ivoryElevated,
    overflow: 'hidden',
  },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  shippingRowLast: {
    borderBottomWidth: 0,
  },
  shippingCopy: {
    flex: 1,
    gap: 3,
  },
  shippingLabel: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: Palette.espresso,
  },
  shippingEta: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  shippingFee: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
  },
  actions: {
    gap: 10,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivoryElevated,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
  },
  draftBtn: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.button,
    backgroundColor: Palette.ivoryElevated,
  },
});
