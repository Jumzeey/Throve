import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { CheckIcon, ImagePlaceholderIcon, PlusIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { isListingFormPublishable, PREVIEW_ERROR, useListings } from '@/context/listings-context';
import { CONDITIONS, DEPARTMENTS, getCategoriesForDepartment } from '@/data/seed';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CreateListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const { form, setForm, getListing, loadFormFromListing, saveDraft } = useListings();
  const { isConnected } = useNetworkStatus();
  const [error, setError] = useState<string | null>(null);

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
  const categories = getCategoriesForDepartment(form.department);

  function preview() {
    if (!isListingFormPublishable(form)) {
      setError(PREVIEW_ERROR);
      return;
    }
    router.push('/sell/preview');
  }

  async function draft() {
    await saveDraft(username);
    router.replace('/(tabs)/sell?tab=draft');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New listing" onBack={() => router.replace('/(tabs)/sell')} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!isConnected ? <AlertBanner variant="warning" title="No connection" message="Reconnect to save or publish your listing." style={styles.banner} /> : null}

        <View style={styles.photoGrid}>
          {Array.from({ length: 8 }).map((_, index) => {
            const filled = index < form.photoCount;
            const isNext = index === form.photoCount;
            return (
              <View key={index} style={styles.photoCell}>
                <Pressable
                  onPress={() => {
                    if (filled || form.photoCount >= 8 || !isNext) return;
                    setForm({ photoCount: form.photoCount + 1 });
                    setError(null);
                  }}
                  style={[styles.photoSlot, filled ? styles.photoFilled : null]}>
                  {filled ? (
                    <CheckIcon size={20} color={Palette.successText} />
                  ) : isNext ? (
                    <PlusIcon size={20} color={Palette.plum} />
                  ) : (
                    <ImagePlaceholderIcon size={18} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <FieldLabel text="Title" />
        <TextField
          placeholder="e.g. Zara Wrap Dress"
          value={form.title}
          maxLength={80}
          onChangeText={(title) => {
            setForm({ title });
            setError(null);
          }}
        />

        <FieldLabel text="Department" />
        <WrapChips
          chips={DEPARTMENTS}
          selected={form.department}
          onSelect={(department) => {
            setForm({ department, category: '' });
            setError(null);
          }}
        />

        {form.department ? (
          <>
            <FieldLabel text="Category" />
            <WrapChips
              chips={categories}
              selected={form.category}
              onSelect={(category) => {
                setForm({ category });
                setError(null);
              }}
            />
          </>
        ) : null}

        <FieldLabel text="Brand (optional)" />
        <TextField placeholder="e.g. Zara" value={form.brand} onChangeText={(brand) => setForm({ brand })} />

        <FieldLabel text="Condition" />
        <WrapChips
          chips={CONDITIONS}
          selected={form.condition}
          onSelect={(condition) => {
            setForm({ condition });
            setError(null);
          }}
        />

        <FieldLabel text="Size (optional)" />
        <TextField placeholder="e.g. M, UK 9" value={form.size} onChangeText={(size) => setForm({ size })} />

        <FieldLabel text="Price (₦)" />
        <TextField
          placeholder="e.g. 18500"
          value={form.price}
          keyboardType="number-pad"
          onChangeText={(price) => {
            setForm({ price: price.replace(/[^\d]/g, '') });
            setError(null);
          }}
        />

        <FieldLabel text="Description" />
        <TextField
          placeholder="Condition details, measurements, etc."
          value={form.description}
          maxLength={1000}
          multiline
          style={styles.description}
          onChangeText={(description) => setForm({ description })}
        />

        {error ? <AlertBanner variant="error" title="Almost there" message={error} style={styles.banner} /> : null}
        <Button label="Preview listing" onPress={preview} style={styles.preview} />
        <Button label="Save as draft" variant="ghost" onPress={draft} />
      </ScrollView>
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function WrapChips({ chips, selected, onSelect }: { chips: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.chips}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  banner: {
    marginBottom: Spacing.lg,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: Spacing.lg,
  },
  photoCell: {
    width: '25%',
    padding: 4,
  },
  photoSlot: {
    aspectRatio: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.borderSoft,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.sand,
  },
  photoFilled: {
    backgroundColor: Palette.successBg,
    borderStyle: 'solid',
    borderColor: Palette.successBorder,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: Palette.plum,
  },
  chipOff: {
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
  },
  chipLabelOn: {
    color: Palette.ivory,
  },
  chipLabelOff: {
    color: Palette.espresso,
  },
  description: {
    height: 88,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  preview: {
    marginTop: Spacing.xl,
  },
});
