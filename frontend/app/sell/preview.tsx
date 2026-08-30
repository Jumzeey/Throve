import { Button } from '@/components/ui/button';
import { PhotoPager } from '@/components/ui/photo-pager';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { isListingFormPublishable, parseListingPrice, useListings } from '@/context/listings-context';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ListingPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { form, publish } = useListings();

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!isListingFormPublishable(form)) {
    return <Redirect href="/sell/create" />;
  }

  const username = session.username;
  const price = parseListingPrice(form.price) ?? 0;
  const brand = form.brand.trim() || 'Unbranded';
  const size = form.size.trim();

  function goEdit() {
    if (form.id) {
      router.replace({ pathname: '/sell/create', params: { id: form.id } });
      return;
    }
    router.replace('/sell/create');
  }

  async function goPublish() {
    const listing = await publish(username);
    if (!listing) {
      router.replace('/sell/create');
      return;
    }
    router.replace({ pathname: '/sell/[id]', params: { id: listing.id, notice: 'published' } });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Preview" onBack={goEdit} />
      <ScrollView>
        <PhotoPager count={form.photoCount} />
        <View style={styles.body}>
          <Text style={styles.title}>{form.title.trim()}</Text>
          <Text style={styles.price}>{formatNaira(price)}</Text>
          <View style={styles.chips}>
            <MetaChip label={`${form.department} · ${form.category}`} />
            <MetaChip label={form.condition} />
            {size && size !== '—' ? <MetaChip label={`Size ${size}`} /> : null}
            {brand ? <MetaChip label={brand} /> : null}
          </View>
          <Text style={styles.description}>{form.description.trim() || 'No description provided.'}</Text>
        </View>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button label="Edit" variant="secondary" onPress={goEdit} style={styles.action} />
        <Button label="Publish" onPress={goPublish} style={styles.action} />
      </View>
    </View>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
  },
  chipText: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted,
  },
  description: {
    marginTop: Spacing.lg,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivory,
  },
  action: {
    flex: 1,
    minHeight: 48,
  },
});
