import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { PlusIcon } from '@/components/ui/icons';
import { PickerField } from '@/components/ui/picker-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatNaira } from '@/lib/format';
import {
  categoriesForDepartment,
  fetchListingCatalog,
  listingFormIssues,
  shippingOption,
  sizeIsRequired,
  sizesForProductType,
  type ListingCatalog,
  type ListingFormIssueField,
} from '@/lib/listing-catalog';
import { pickListingPhotos } from '@/lib/listing-photos';
import * as Haptics from 'expo-haptics';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useKeyboardAwareScroll } from '@/hooks/use-keyboard-aware-scroll';

export default function CreateListingScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const keyboardScroll = useKeyboardAwareScroll();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const { form, setForm, getListing, loadFormFromListing, saveDraft, loading: listingsLoading } = useListings();
  const { isConnected } = useNetworkStatus();
  const [catalog, setCatalog] = useState<ListingCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [skipDialog, setSkipDialog] = useState<{ title: string; body: string } | null>(null);
  const fieldOffsets = useRef<Partial<Record<ListingFormIssueField, number>>>({});

  const photoUris = form.photoUris ?? [];

  useEffect(() => {
    let active = true;
    setCatalogError(false);
    void fetchListingCatalog()
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch(() => {
        if (active) setCatalogError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!catalog || form.shippingMethod) return;
    setForm({ shippingMethod: catalog.defaultShipping });
  }, [catalog, form.shippingMethod, setForm]);

  useEffect(() => {
    if (!id) return;
    if (form.id === id) return;
    const listing = getListing(id);
    if (listing) loadFormFromListing(listing);
  }, [form.id, getListing, id, loadFormFromListing]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (id) {
    const existing = getListing(id);
    if (existing && existing.seller !== session.username) {
      return <Redirect href={`/product/${id}`} />;
    }
  }

  const username = session.username;
  const loadingDraft = Boolean(id) && listingsLoading && form.id !== id;
  const loading = (!catalog && !catalogError) || loadingDraft;
  const categories = catalog ? categoriesForDepartment(catalog, form.department) : [];
  const issues = catalog ? listingFormIssues(form, catalog) : [];
  const issueFields = new Set(issues.map((item) => item.field));
  const photoMax = catalog?.photo.max ?? 8;
  const sizeOptions = catalog ? sizesForProductType(catalog, form.productType) : [];
  const sizeRequired = catalog ? sizeIsRequired(catalog, form.productType) : false;
  const sizeLabel = sizeOptions.find((item) => item.value === form.size)?.label ?? form.size;
  const selectedShipping = catalog ? shippingOption(catalog, form.shippingMethod) : null;
  const emptySlots =
    photoUris.length >= photoMax
      ? 0
      : photoUris.length === 0
        ? 3
        : Math.max(0, Math.min(3, 4 - photoUris.length - 1));

  function reloadCatalog() {
    setCatalogError(false);
    void fetchListingCatalog(true)
      .then(setCatalog)
      .catch(() => setCatalogError(true));
  }

  function rememberFieldOffset(field: ListingFormIssueField) {
    return (event: LayoutChangeEvent) => {
      fieldOffsets.current[field] = event.nativeEvent.layout.y;
    };
  }

  function scrollToField(field: ListingFormIssueField) {
    const y = fieldOffsets.current[field];
    if (y == null) return;
    keyboardScroll.scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
  }

  function preview() {
    if (issues.length > 0) {
      setShowErrors(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Wait for error styles / banner layout so offsets are fresh.
      setTimeout(() => scrollToField(issues[0].field), 100);
      return;
    }
    router.push('/sell/preview');
  }

  async function draft() {
    if (!isConnected) return;
    setSaving(true);
    setDraftError(false);
    setDraftSaved(false);
    try {
      await saveDraft(username);
      setDraftSaved(true);
    } catch {
      setDraftError(true);
    } finally {
      setSaving(false);
    }
  }

  async function addPhotos(replaceIndex?: number) {
    const remaining = replaceIndex === undefined ? photoMax - photoUris.length : 1;
    if (remaining <= 0) return;
    setPicking(true);
    try {
      const { uris, rejected } = await pickListingPhotos(remaining);
      if (uris.length) {
        const next =
          replaceIndex === undefined
            ? [...photoUris, ...uris].slice(0, photoMax)
            : photoUris.map((uri, index) => (index === replaceIndex ? uris[0] : uri));
        setForm({ photoUris: next, photoCount: next.length });
        setShowErrors(false);
      }
      if (rejected.length) {
        setSkipDialog({
          title: rejected.length > 1 ? 'Some photos were skipped' : 'Photo was skipped',
          body: rejected[0],
        });
      }
    } finally {
      setPicking(false);
      setPhotoIndex(null);
    }
  }

  function removePhoto(index: number) {
    const next = photoUris.filter((_, i) => i !== index);
    setForm({ photoUris: next, photoCount: next.length });
    setPhotoIndex(null);
  }

  async function makeMain(index: number) {
    if (index === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = [photoUris[index], ...photoUris.filter((_, i) => i !== index)];
    setForm({ photoUris: next, photoCount: next.length });
  }

  function selectDepartment(department: string) {
    const nextCategories = catalog ? categoriesForDepartment(catalog, department) : [];
    const category = nextCategories.includes(form.category) ? form.category : '';
    const productType =
      category && catalog?.productTypes.includes(category) ? category : form.productType && catalog?.productTypes.includes(form.productType)
        ? form.productType
        : '';
    const nextSizes = catalog && productType ? sizesForProductType(catalog, productType) : [];
    const size = nextSizes.some((item) => item.value === form.size) ? form.size : '';
    setForm({ department, category, productType, size });
    setShowErrors(false);
  }

  function selectCategory(category: string) {
    const productType = catalog?.productTypes.includes(category) ? category : form.productType;
    const nextSizes = catalog && productType ? sizesForProductType(catalog, productType) : [];
    const size = nextSizes.some((item) => item.value === form.size) ? form.size : '';
    setForm({ category, productType, size });
    setShowErrors(false);
  }

  function selectProductType(productType: string) {
    const nextSizes = catalog ? sizesForProductType(catalog, productType) : [];
    const size = nextSizes.some((item) => item.value === form.size) ? form.size : '';
    setForm({ productType, size });
    setShowErrors(false);
  }

  const neededLabel =
    issues.length === 1
      ? 'One thing still needed'
      : issues.length === 2
        ? 'Two things still needed'
        : issues.length === 3
          ? 'Three things still needed'
          : `${issues.length} things still needed`;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Create listing" onBack={() => router.replace('/(tabs)/sell')} />
      {loading ? (
        <CreateListingSkeleton />
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={keyboardScroll.scrollRef}
            onScroll={keyboardScroll.onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.body,
              {
                paddingBottom: Spacing.xxxl + Math.max(keyboardScroll.contentPaddingBottom, bottom),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={keyboardScroll.automaticallyAdjustKeyboardInsets}>
          {!isConnected ? (
            <AlertBanner variant="warning" title="No connection" message="Reconnect to save this listing." style={styles.banner} />
          ) : null}
          {catalogError ? (
            <AlertBanner
              variant="error"
              title="We couldn't load listing options"
              message="Please try again in a moment."
              style={styles.banner}
            />
          ) : null}
          {catalogError ? <Button label="Try again" variant="secondary" onPress={reloadCatalog} style={styles.retry} /> : null}
          {draftSaved ? (
            <AlertBanner
              variant="success"
              title="Draft saved"
              message="Find it under Drafts in My listings."
              style={styles.banner}
            />
          ) : null}
          {draftError ? (
            <AlertBanner
              variant="error"
              title="We couldn't save this draft"
              message="Please try again in a moment."
              style={styles.banner}
            />
          ) : null}
          {showErrors && issues.length > 0 ? (
            <AlertBanner
              variant="error"
              title={neededLabel}
              message={issues.map((item) => `• ${item.label}`).join('\n')}
              style={styles.banner}
            />
          ) : null}

          {catalog ? (
            <>
              <View onLayout={rememberFieldOffset('photos')}>
                <View style={styles.sectionHead}>
                  <Text style={styles.labelTight}>Photographs</Text>
                  <Text style={styles.counter}>
                    {photoUris.length} of {photoMax}
                  </Text>
                </View>
                <View
                  style={[
                    styles.photoGrid,
                    showErrors && issueFields.has('photos') ? styles.sectionError : null,
                  ]}>
                  {photoUris.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.photoCell}>
                      <Pressable
                        onPress={() => setPhotoIndex(index)}
                        onLongPress={() => void makeMain(index)}
                        delayLongPress={280}
                        style={[styles.photoSlot, styles.photoFilled, index === 0 && styles.photoMain]}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        {index === 0 ? (
                          <View style={styles.mainBanner}>
                            <Text style={styles.mainBannerText}>MAIN</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    </View>
                  ))}
                  {photoUris.length < photoMax ? (
                    <View style={styles.photoCell}>
                      <Pressable
                        onPress={() => void addPhotos()}
                        disabled={picking}
                        style={[
                          styles.photoSlot,
                          styles.photoAdd,
                          photoUris.length === 0 && styles.photoAddMain,
                          showErrors && issueFields.has('photos') ? styles.photoAddError : null,
                        ]}
                        accessibilityLabel="Add photos from library">
                        {picking ? (
                          <ActivityIndicator color={Palette.plum} />
                        ) : (
                          <>
                            <PlusIcon size={18} color={Palette.plum} />
                            <Text style={styles.addLabel}>{photoUris.length === 0 ? 'Main' : 'Add'}</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ) : null}
                  {Array.from({ length: emptySlots }).map((_, index) => (
                    <View key={`empty-${index}`} style={styles.photoCell}>
                      <View style={styles.photoSlot} />
                    </View>
                  ))}
                </View>
                <Text style={[styles.hint, showErrors && issueFields.has('photos') && styles.hintError]}>
                  {showErrors && issueFields.has('photos')
                    ? `Add at least ${catalog.photo.min} photo${catalog.photo.min === 1 ? '' : 's'} to continue.`
                    : photoUris.length === 0
                      ? `0 of ${photoMax} · ${catalog.hints.photosEmpty}`
                      : photoUris.length >= photoMax
                        ? `${photoMax} of ${photoMax} — the limit is reached, so Add is hidden. Press and hold a photo to make it the main image.`
                        : catalog.hints.photos}
                </Text>
              </View>

              <View onLayout={rememberFieldOffset('title')} ref={keyboardScroll.setAnchor('title')} collapsable={false}>
                <View style={styles.sectionHead}>
                  <Text style={styles.labelTight}>Item title</Text>
                  <Text style={styles.counter}>
                    {form.title.length} / {catalog.titleMax}
                  </Text>
                </View>
                <TextField
                  placeholder="e.g. Quilted chain flap bag"
                  value={form.title}
                  maxLength={catalog.titleMax}
                  error={showErrors && issueFields.has('title') ? 'Add a title for this listing.' : null}
                  onFocus={() => keyboardScroll.onFieldFocus('title')}
                  onChangeText={(title) => {
                    setForm({ title });
                    setDraftSaved(false);
                    setShowErrors(false);
                  }}
                />
              </View>

              <View onLayout={rememberFieldOffset('department')}>
                <Text style={styles.label}>Department</Text>
                <WrapChips
                  chips={catalog.departments}
                  selected={form.department}
                  error={showErrors && issueFields.has('department')}
                  onSelect={selectDepartment}
                />
                {showErrors && issueFields.has('department') ? (
                  <Text style={styles.fieldErrorText}>Choose a department.</Text>
                ) : null}
              </View>

              {form.department ? (
                <View onLayout={rememberFieldOffset('category')}>
                  <Text style={styles.label}>Category in {form.department}</Text>
                  <WrapChips
                    chips={categories}
                    selected={form.category}
                    error={showErrors && issueFields.has('category')}
                    onSelect={selectCategory}
                  />
                  <Text style={[styles.hint, showErrors && issueFields.has('category') && styles.hintError]}>
                    {showErrors && issueFields.has('category')
                      ? 'Choose a category for this item.'
                      : catalog.hints.category}
                  </Text>
                </View>
              ) : null}

              <View onLayout={rememberFieldOffset('condition')}>
                <Text style={styles.label}>Condition</Text>
                <WrapChips
                  chips={catalog.conditions}
                  selected={form.condition}
                  error={showErrors && issueFields.has('condition')}
                  onSelect={(condition) => {
                    setForm({ condition });
                    setShowErrors(false);
                  }}
                />
                {showErrors && issueFields.has('condition') ? (
                  <Text style={styles.fieldErrorText}>Choose a condition.</Text>
                ) : null}
              </View>

              <View onLayout={rememberFieldOffset('productType')}>
                <Text style={styles.label}>Product type</Text>
                <PickerField
                  value={form.productType}
                  options={catalog.productTypes}
                  placeholder="Choose a product type"
                  error={showErrors && issueFields.has('productType') ? 'Choose a product type for the size chart.' : null}
                  onSelect={selectProductType}
                />
                <Text style={styles.hint}>{catalog.hints.productType ?? catalog.hints.size}</Text>
              </View>

              <View onLayout={rememberFieldOffset('size')}>
                <Text style={styles.label}>Size{sizeRequired ? '' : ' - optional'}</Text>
                <PickerField
                  value={sizeLabel}
                  options={sizeOptions.map((item) => item.label)}
                  placeholder={form.productType ? 'Choose a size' : 'Choose a product type first'}
                  allowCustom
                  customEyebrow="Use this size"
                  error={
                    showErrors && issueFields.has('size')
                      ? `Size is required for ${form.productType}.`
                      : null
                  }
                  onSelect={(label) => {
                    const match = sizeOptions.find((item) => item.label === label);
                    setForm({ size: match?.value ?? label });
                    setShowErrors(false);
                  }}
                />
                <Text style={styles.hint}>{catalog.hints.size}</Text>
              </View>

              <Text style={styles.label}>Brand</Text>
              <PickerField
                value={form.brand}
                options={catalog.brands ?? []}
                placeholder="e.g. Zara, or your own label"
                allowCustom
                customEyebrow="Use your brand"
                onSelect={(brand) => {
                  setForm({ brand });
                  setDraftSaved(false);
                }}
              />
              <Text style={styles.hint}>
                Pick a suggestion or type any brand — including your own label. Use Unbranded if there isn’t one.
              </Text>

              <View ref={keyboardScroll.setAnchor('colour')} collapsable={false}>
                <Text style={styles.label}>Colour - optional</Text>
                <TextField
                  placeholder="e.g. Black"
                  value={form.colour}
                  onFocus={() => keyboardScroll.onFieldFocus('colour')}
                  onChangeText={(colour) => setForm({ colour })}
                />
              </View>

              <View
                onLayout={rememberFieldOffset('price')}
                ref={keyboardScroll.setAnchor('price')}
                collapsable={false}>
                <Text style={styles.label}>Price</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.naira}>₦</Text>
                  <TextField
                    placeholder="0"
                    value={form.price ? Number(form.price).toLocaleString('en-NG') : ''}
                    keyboardType="number-pad"
                    containerStyle={styles.priceField}
                    error={showErrors && issueFields.has('price') ? 'Enter a price in naira above zero.' : null}
                    onFocus={() => keyboardScroll.onFieldFocus('price')}
                    onChangeText={(price) => {
                      setForm({ price: price.replace(/[^\d]/g, '') });
                      setShowErrors(false);
                    }}
                  />
                </View>
              </View>

              <View ref={keyboardScroll.setAnchor('description')} collapsable={false}>
                <View style={styles.sectionHead}>
                  <Text style={styles.labelTight}>Description</Text>
                  <Text style={styles.counter}>
                    {form.description.length} / {catalog.descriptionMax}
                  </Text>
                </View>
                <TextField
                  placeholder="Condition details, measurements, etc."
                  value={form.description}
                  maxLength={catalog.descriptionMax}
                  multiline
                  style={styles.description}
                  onFocus={() => keyboardScroll.onFieldFocus('description')}
                  onChangeText={(description) => setForm({ description })}
                />
              </View>
              <Text style={styles.label}>Shipping</Text>
              {catalog.shipping.map((option) => {
                const active = selectedShipping?.value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setForm({ shippingMethod: option.value })}
                    style={[styles.shipCard, active && styles.shipCardOn]}>
                    <View style={[styles.radio, active && styles.radioOn]}>
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.shipCopy}>
                      <Text style={styles.shipTitle}>{option.label}</Text>
                      <Text style={styles.shipEta}>{option.eta}</Text>
                    </View>
                    <Text style={styles.shipFee}>{formatNaira(option.fee)}</Text>
                  </Pressable>
                );
              })}

              <View style={styles.actions}>
                <Button
                  label={saving ? 'Saving draft...' : 'Save as draft'}
                  variant="secondary"
                  loading={saving}
                  disabled={!isConnected || saving}
                  onPress={() => void draft()}
                  style={styles.action}
                />
                <Button label="Preview" onPress={preview} style={styles.action} />
              </View>
            </>
          ) : null}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Dialog
        visible={photoIndex !== null}
        title="Photograph"
        body="The first photo is your main image."
        onClose={() => setPhotoIndex(null)}
        actions={[
          { label: 'Replace', variant: 'primary', onPress: () => void addPhotos(photoIndex ?? 0) },
          {
            label: 'Make main',
            variant: 'secondary',
            onPress: () => {
              if (photoIndex !== null) void makeMain(photoIndex);
              setPhotoIndex(null);
            },
          },
          {
            label: 'Remove',
            variant: 'danger',
            onPress: () => {
              if (photoIndex !== null) removePhoto(photoIndex);
            },
          },
        ]}
      />

      <Dialog
        visible={Boolean(skipDialog)}
        title={skipDialog?.title ?? ''}
        body={skipDialog?.body}
        onClose={() => setSkipDialog(null)}
        actions={[{ label: 'OK', variant: 'primary', onPress: () => setSkipDialog(null) }]}
      />
    </View>
  );
}

function WrapChips({
  chips,
  selected,
  onSelect,
  error = false,
}: {
  chips: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  error?: boolean;
}) {
  return (
    <View style={[styles.chips, error ? styles.chipsError : null]}>
      {chips.map((chip) => {
        const active = selected === chip;
        return (
          <Pressable key={chip} onPress={() => onSelect(chip)} style={[styles.chip, active ? styles.chipOn : styles.chipOff]}>
            <Text style={[styles.chipLabel, active ? styles.chipLabelOn : styles.chipLabelOff]}>{chip}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CreateListingSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonRow}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.skeletonPhoto} />
        ))}
      </View>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  flex: { flex: 1 },
  body: { paddingHorizontal: Spacing.xl },
  banner: { marginBottom: Spacing.lg },
  retry: { marginBottom: Spacing.lg },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: 6,
  },
  label: {
    marginTop: Spacing.lg,
    marginBottom: 6,
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  labelTight: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  counter: { fontSize: 11, fontFamily: Typography.body, color: Palette.muted },
  hint: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  hintError: { color: Palette.error },
  fieldErrorText: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.error,
  },
  sectionError: {
    borderWidth: 1.5,
    borderColor: Palette.error,
    borderRadius: Radius.sm,
    padding: 4,
  },
  photoAddError: {
    borderColor: Palette.error,
    borderStyle: 'dashed',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  photoCell: { width: '25%', padding: 4 },
  photoSlot: {
    aspectRatio: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.borderSoft,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.sand,
    overflow: 'hidden',
  },
  photoAdd: {
    borderColor: Palette.plum,
    backgroundColor: Palette.ivoryElevated,
  },
  photoAddMain: { backgroundColor: '#F8ECEF' },
  photoFilled: { borderStyle: 'solid', borderColor: Palette.border },
  photoMain: { borderColor: Palette.plum },
  photoThumb: { width: '100%', height: '100%' },
  mainBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.plum,
    paddingVertical: 3,
    alignItems: 'center',
  },
  mainBannerText: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: Typography.bodyBold,
    color: Palette.ivory,
  },
  addLabel: { marginTop: 4, fontSize: 10, fontFamily: Typography.bodySemiBold, color: Palette.plum },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chipsError: {
    borderWidth: 1.5,
    borderColor: Palette.error,
    borderRadius: Radius.sm,
    padding: 8,
  },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: Radius.pill, justifyContent: 'center' },
  chipOn: { backgroundColor: Palette.plum },
  chipOff: { backgroundColor: Palette.ivoryElevated, borderWidth: 1, borderColor: Palette.border },
  chipLabel: { fontSize: 12, fontFamily: Typography.bodySemiBold },
  chipLabelOn: { color: Palette.ivory },
  chipLabelOff: { color: Palette.espresso },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  naira: {
    marginTop: 16,
    marginRight: 8,
    fontSize: 18,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  priceField: { flex: 1 },
  description: { height: 120, paddingTop: 12, textAlignVertical: 'top' },
  shipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  shipCardOn: { borderColor: Palette.plum },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Palette.plum },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.plum },
  shipCopy: { flex: 1 },
  shipTitle: { fontSize: 14.5, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  shipEta: { marginTop: 2, fontSize: 12, fontFamily: Typography.body, color: Palette.muted },
  shipFee: { fontSize: 14, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  actions: { flexDirection: 'row', gap: 10, marginTop: Spacing.xl },
  action: { flex: 1 },
  skeleton: { paddingHorizontal: 20, paddingTop: 16 },
  skeletonRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  skeletonPhoto: { flex: 1, aspectRatio: 1, borderRadius: Radius.sm, backgroundColor: Palette.skeleton },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: Palette.skeleton, marginBottom: 10 },
  skeletonLineShort: { width: '55%' },
});
