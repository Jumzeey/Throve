import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { isListingFormPublishable, PREVIEW_ERROR, useListings } from '@/context/listings-context';
import { CONDITIONS, DEPARTMENTS, getCategoriesForDepartment } from '@/data/seed';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CreateListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const { form, setForm, getListing, loadFormFromListing, saveDraft } = useListings();
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

  function draft() {
    saveDraft(username);
    router.replace('/(tabs)/sell?tab=draft');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New listing" onBack={() => router.replace('/(tabs)/sell')} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.photoGrid}>
          {Array.from({ length: 8 }).map((_, index) => {
            const filled = index < form.photoCount;
            return (
              <View key={index} style={styles.photoCell}>
                <Pressable
                  onPress={() => {
                    if (filled || form.photoCount >= 8 || index !== form.photoCount) return;
                    setForm({ photoCount: form.photoCount + 1 });
                    setError(null);
                  }}
                  style={[styles.photoSlot, filled ? styles.photoFilled : null]}>
                  <Text style={styles.photoMark}>{filled ? '✓' : '+'}</Text>
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
        <TextField
          placeholder="e.g. Zara"
          value={form.brand}
          onChangeText={(brand) => setForm({ brand })}
        />

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
        <TextField
          placeholder="e.g. M, UK 9"
          value={form.size}
          onChangeText={(size) => setForm({ size })}
        />

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

        <ErrorBanner message={error} />
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
    backgroundColor: Palette.background,
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 18,
  },
  photoCell: {
    width: '25%',
    padding: 4,
  },
  photoSlot: {
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#b8b5b0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.hatch,
  },
  photoFilled: {
    backgroundColor: Palette.hatchAlt,
    borderStyle: 'solid',
  },
  photoMark: {
    fontSize: 18,
    fontWeight: '600',
    color: Palette.muted3,
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '600',
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: Palette.text,
  },
  chipOff: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelOn: {
    color: Palette.background,
  },
  chipLabelOff: {
    color: Palette.text,
  },
  description: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  preview: {
    marginTop: 20,
  },
});
