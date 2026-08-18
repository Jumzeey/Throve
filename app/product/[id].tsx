import { Button } from '@/components/ui/button';
import { PhotoPager } from '@/components/ui/photo-pager';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getListing } from '@/data/seed';
import { formatNaira } from '@/lib/format';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = id ? getListing(id) : undefined;

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!listing) {
    return (
      <View style={styles.screen}>
        <Pressable onPress={() => router.back()} style={[styles.missingBack, { marginTop: insets.top + 12 }]}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.missing}>This listing is unavailable.</Text>
      </View>
    );
  }

  const statusLabel = listing.status === 'available' ? null : listing.status === 'reserved' ? 'Reserved' : 'Sold';

  return (
    <View style={styles.screen}>
      <ScrollView>
        <View>
          <PhotoPager count={listing.photoCount} />
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          {statusLabel ? (
            <View style={[styles.status, listing.status === 'reserved' ? styles.reserved : styles.sold]}>
              <Text style={[styles.statusText, listing.status === 'reserved' ? styles.reservedText : styles.soldText]}>
                {statusLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{formatNaira(listing.price)}</Text>
          <View style={styles.chips}>
            <Chip label={`${listing.department} · ${listing.category}`} />
            <Chip label={listing.condition} />
            {listing.size && listing.size !== '—' ? <Chip label={`Size ${listing.size}`} /> : null}
            {listing.brand ? <Chip label={listing.brand} /> : null}
            {listing.colour ? <Chip label={listing.colour} /> : null}
          </View>
          <Text style={styles.description}>{listing.description}</Text>
          <Text style={styles.shipping}>{listing.shipping}</Text>
          <Text style={styles.seller}>Sold by @{listing.seller}</Text>
        </View>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button label="Make offer" variant="secondary" disabled style={styles.action} />
        <Button label="Buy now" disabled style={styles.action} />
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
  reserved: {
    backgroundColor: '#fdf3e3',
  },
  sold: {
    backgroundColor: Palette.chipBg,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reservedText: {
    color: '#8a6112',
  },
  soldText: {
    color: Palette.muted,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Palette.chipBg,
  },
  chipText: {
    fontSize: 12,
    color: Palette.muted,
  },
  description: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 22,
    color: Palette.muted,
  },
  shipping: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted2,
  },
  seller: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
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
  missing: {
    marginTop: 40,
    textAlign: 'center',
    color: Palette.muted2,
  },
  missingBack: {
    marginLeft: 20,
  },
});
