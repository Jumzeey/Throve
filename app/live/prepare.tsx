import { Button } from '@/components/ui/button';
import { DepartmentChips } from '@/components/ui/department-chips';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ReadyToggle } from '@/components/ui/ready-toggle';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Typography, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { useLive } from '@/context/live-context';
import { DEPARTMENTS } from '@/data/seed';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const DEPARTMENT_CHIPS = DEPARTMENTS.map((department) => ({ label: department, value: department }));

export default function PrepareLiveScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { listingsForSeller } = useListings();
  const { startLive } = useLive();
  const [title, setTitle] = useState('');
  const [coverSet, setCoverSet] = useState(false);
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(() => {
    if (!session) return [];
    return listingsForSeller(session.username).filter((listing) => listing.status === 'available');
  }, [listingsForSeller, session]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!session.canHostLive) {
    return <Redirect href="/live/host-access" />;
  }

  const host = session.username;

  function toggleProduct(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setError(null);
  }

  function submit() {
    if (!title.trim() || !department || selected.length === 0) {
      setError('Add a title, category and at least one product.');
      return;
    }
    if (!cameraReady || !micReady) {
      setError('Camera and microphone must both be ready.');
      return;
    }
    const created = startLive({
      host,
      title,
      department: department as 'Women' | 'Men' | 'Kids',
      description,
      featuredListingIds: selected,
      scheduledAt: scheduledAt.trim() || undefined,
    });
    if (created.status === 'upcoming') {
      router.replace('/(tabs)/live');
      return;
    }
    router.replace('/live/broadcast');
  }

  const scheduleMode = scheduledAt.trim().length > 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Prepare live" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextField placeholder="Live title" value={title} onChangeText={(value) => { setTitle(value); setError(null); }} />
        <Pressable onPress={() => setCoverSet(true)} style={[styles.cover, coverSet ? styles.coverSet : null]}>
          <Text style={styles.coverLabel}>{coverSet ? 'Cover image set ✓' : '+ Add cover image'}</Text>
        </Pressable>
        <DepartmentChips chips={DEPARTMENT_CHIPS} selected={department} onSelect={(value) => { setDepartment(value); setError(null); }} />
        <TextField
          placeholder="Short description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.description}
        />
        <TextField
          placeholder="Scheduled date/time (optional — leave blank to start now)"
          value={scheduledAt}
          onChangeText={setScheduledAt}
        />
        <Text style={styles.section}>Select products to feature</Text>
        {products.length === 0 ? (
          <Text style={styles.empty}>No available listings to feature yet.</Text>
        ) : (
          products.map((listing) => {
            const on = selected.includes(listing.id);
            return (
              <Pressable key={listing.id} onPress={() => toggleProduct(listing.id)} style={[styles.product, on ? styles.productOn : styles.productOff]}>
                <Text style={[styles.productTitle, on ? styles.productTitleOn : null]}>{listing.title}</Text>
                <Text style={[styles.productMark, on ? styles.productTitleOn : null]}>{on ? '✓' : ''}</Text>
              </Pressable>
            );
          })
        )}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Camera ready</Text>
          <ReadyToggle on={cameraReady} onToggle={() => { setCameraReady((value) => !value); setError(null); }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Microphone ready</Text>
          <ReadyToggle on={micReady} onToggle={() => { setMicReady((value) => !value); setError(null); }} />
        </View>
        <ErrorBanner message={error} />
        <Button label={scheduleMode ? 'Schedule live' : 'Start live now'} onPress={submit} style={styles.start} />
      </ScrollView>
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
    paddingBottom: 32,
    gap: 12,
  },
  cover: {
    height: 90,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  coverSet: {
    backgroundColor: Palette.accent100,
    borderColor: Palette.accent300,
    borderStyle: 'solid',
  },
  coverLabel: {
    fontSize: 12,
    color: Palette.muted3,
  },
  description: {
    height: 64,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  section: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    fontSize: 13,
    color: Palette.muted3,
  },
  product: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productOn: {
    backgroundColor: Palette.accent,
  },
  productOff: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  productTitle: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
  productTitleOn: {
    color: Palette.background,
  },
  productMark: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
  },
  toggleLabel: {
    fontSize: 13,
    color: Palette.text,
  },
  start: {
    marginTop: 8,
    height: 52,
    backgroundColor: Palette.live,
  },
});
