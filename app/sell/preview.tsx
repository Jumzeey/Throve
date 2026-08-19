import { Button } from '@/components/ui/button';
import { PhotoPager } from '@/components/ui/photo-pager';
import { Palette, Radius, Typography } from '@/constants/theme';
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

  function goPublish() {
    const listing = publish(username);
    if (!listing) {
      router.replace('/sell/create');
      return;
    }
    router.replace({ pathname: '/sell/[id]', params: { id: listing.id, notice: 'published' } });
  }

  return (
    <View style={styles.screen}>
      <ScrollView>
        <PhotoPager count={form.photoCount} />
        <View style={styles.body}>
          <Text style={styles.title}>{form.title.trim()}</Text>
          <Text style={styles.price}>{formatNaira(price)}</Text>
          <View style={styles.chips}>
            <Chip label={`${form.department} · ${form.category}`} />
            <Chip label={form.condition} />
            {size && size !== '—' ? <Chip label={`Size ${size}`} /> : null}
            {brand ? <Chip label={brand} /> : null}
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

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: Typography.heading,
    color: Palette.text,
  },
  price: {
    marginTop: 4,
    fontSize: 22,
    fontFamily: Typography.headingBold,
    color: Palette.accent700,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Palette.chipBg,
  },
  chipText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  description: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
  },
  action: {
    flex: 1,
    height: 48,
  },
});
