import { ModeratorsSheet } from '@/components/live/moderators-sheet';
import { Button } from '@/components/ui/button';
import { DepartmentChips } from '@/components/ui/department-chips';
import { AlertBanner } from '@/components/ui/alert-banner';
import { UserIcon } from '@/components/ui/icons';
import { ReadyToggle } from '@/components/ui/ready-toggle';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/status-chip';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { MAX_LIVE_MODERATORS, useLive } from '@/context/live-context';
import { DEPARTMENTS } from '@/data/seed';
import { formatNaira } from '@/lib/format';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const DEPARTMENT_CHIPS = DEPARTMENTS.map((department) => ({ label: department, value: department }));
const IVORY_50 = 'rgba(255,247,240,0.5)';

export default function PrepareLiveScreen() {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const { listingsForSeller } = useListings();
  const inbox = useInbox();
  const live = useLive();
  const [title, setTitle] = useState('');
  const [coverSet, setCoverSet] = useState(false);
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [modsOpen, setModsOpen] = useState(false);

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
  const moderators = live.prepareModerators;
  const suggestedMods = inbox
    .conversationsFor(host)
    .map((conv) => inbox.otherParticipant(conv, host))
    .filter(Boolean);
  const canStart = title.trim() && department && selected.length > 0 && cameraReady && micReady;

  function toggleProduct(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setError(null);
  }

  async function submit() {
    if (!title.trim() || !department || selected.length === 0) {
      setError('Add a title, category and at least one product.');
      return;
    }
    if (!cameraReady || !micReady) {
      setError('Camera and microphone must both be ready.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const created = await live.startLive({
        host,
        title,
        department: department as 'Women' | 'Men' | 'Kids',
        description,
        featuredListingIds: selected,
        products: selected.map((listingId, index) => {
          const listing = products.find((p) => p.id === listingId);
          return {
            listingId,
            livePrice: listing?.price ?? 0,
            stock: 1,
            isPinned: index === 0,
          };
        }),
        scheduledAt: scheduleMode && scheduledAt.trim() ? scheduledAt.trim() : undefined,
      });
      if (created.status === 'upcoming') {
        router.replace('/(tabs)/live');
        return;
      }
      router.replace('/live/broadcast');
    } catch {
      setError("We couldn't start your live. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Set up your live"
        dark
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: sheetBottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Cover image</Text>
        <Pressable onPress={() => setCoverSet(true)} style={[styles.cover, coverSet && styles.coverSet]}>
          <Text style={styles.coverLabel}>{coverSet ? 'Cover image set' : 'Cover image'}</Text>
          {coverSet ? (
            <View style={styles.coverChange}>
              <Text style={styles.coverChangeLabel}>Change</Text>
            </View>
          ) : null}
        </Pressable>

        <Text style={styles.sectionLabel}>Live title</Text>
        <TextInput
          placeholder="The Fashion Edit"
          placeholderTextColor={IVORY_50}
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setError(null);
          }}
          style={styles.input}
        />

        <Text style={styles.sectionLabel}>Category</Text>
        <DepartmentChips
          chips={DEPARTMENT_CHIPS}
          selected={department}
          onSelect={(value) => {
            setDepartment(value);
            setError(null);
          }}
        />

        <Text style={styles.sectionLabel}>Description · optional</Text>
        <TextInput
          placeholder="Tell viewers what to expect…"
          placeholderTextColor={IVORY_50}
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textArea]}
        />

        <View style={styles.productsHeader}>
          <Text style={styles.sectionLabel}>Products in this live</Text>
          <Text style={styles.editLink}>Edit selection</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
          {products.map((listing) => {
            const on = selected.includes(listing.id);
            return (
              <Pressable key={listing.id} onPress={() => toggleProduct(listing.id)} style={styles.productTile}>
                <View style={[styles.productThumb, on && styles.productThumbOn]} />
                <Text style={styles.productPrice}>{formatNaira(listing.price)}</Text>
              </Pressable>
            );
          })}
          <View style={styles.addTile}>
            <Text style={styles.addTileLabel}>Add</Text>
          </View>
        </ScrollView>
        <Text style={styles.hint}>Only your own available listings can be featured.</Text>

        <Text style={[styles.sectionLabel, styles.whenLabel]}>When</Text>
        <View style={styles.whenRow}>
          <Pressable
            onPress={() => setScheduleMode(false)}
            style={[styles.whenBtn, !scheduleMode && styles.whenBtnOn]}
          >
            <Text style={[styles.whenBtnLabel, !scheduleMode && styles.whenBtnLabelOn]}>Start when ready</Text>
          </Pressable>
          <Pressable
            onPress={() => setScheduleMode(true)}
            style={[styles.whenBtn, scheduleMode && styles.whenBtnOn]}
          >
            <Text style={[styles.whenBtnLabel, scheduleMode && styles.whenBtnLabelOn]}>Schedule</Text>
          </Pressable>
        </View>
        {scheduleMode ? (
          <TextInput
            placeholder="Saturday, 7:00 pm"
            placeholderTextColor={IVORY_50}
            value={scheduledAt}
            onChangeText={setScheduledAt}
            style={styles.input}
          />
        ) : null}

        <Text style={[styles.sectionLabel, styles.deviceSection]}>Device check</Text>
        <View style={styles.deviceRow}>
          <Text style={styles.deviceName}>Camera</Text>
          <View style={styles.deviceRight}>
            {cameraReady ? <StatusChip kind="live" variant="available" label="READY" /> : null}
            <ReadyToggle
              on={cameraReady}
              onToggle={() => {
                setCameraReady((value) => !value);
                setError(null);
              }}
            />
          </View>
        </View>
        <View style={styles.deviceRow}>
          <Text style={styles.deviceName}>Microphone</Text>
          <View style={styles.deviceRight}>
            {micReady ? <StatusChip kind="live" variant="available" label="READY" /> : null}
            <ReadyToggle
              on={micReady}
              onToggle={() => {
                setMicReady((value) => !value);
                setError(null);
              }}
            />
          </View>
        </View>

        <View style={styles.modsHeader}>
          <Text style={styles.sectionLabel}>
            Moderators · {moderators.length} of {MAX_LIVE_MODERATORS}
          </Text>
          <Pressable onPress={() => setModsOpen(true)} hitSlop={8}>
            <Text style={styles.editLink}>Manage</Text>
          </Pressable>
        </View>
        {moderators.length === 0 ? (
          <Pressable onPress={() => setModsOpen(true)} style={styles.emptyMod}>
            <Text style={styles.emptyModLabel}>Add a moderator (optional)</Text>
          </Pressable>
        ) : (
          moderators.map((mod) => (
            <View key={mod} style={styles.modRow}>
              <View style={styles.modAvatar}>
                <UserIcon size={16} color={Palette.muted3} />
              </View>
              <View style={styles.modMeta}>
                <Text style={styles.modName}>{mod}</Text>
                <Text style={styles.modSub}>Can moderate comments and viewers</Text>
              </View>
              <Pressable onPress={() => live.removePrepareModerator(mod)} hitSlop={8}>
                <Text style={styles.modRemove}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
        <Text style={styles.hint}>
          A moderator helps with comments only — they never host, sell or manage products.
        </Text>

        {error ? <AlertBanner variant="error" title={error} style={styles.errorBanner} /> : null}

        <View style={styles.footer}>
          <Button
            label={starting ? 'Starting your live…' : scheduleMode ? 'Schedule live' : 'Start live'}
            variant="live"
            loading={starting}
            disabled={!canStart || starting}
            onPress={submit}
            style={styles.start}
          />
          {!canStart ? (
            <Button label="Start live · unavailable" disabled style={styles.startDisabled} />
          ) : null}
          <Text style={styles.footerHint}>
            Viewers can claim a featured item for about 5 minutes while they check out.
          </Text>
        </View>
      </ScrollView>

      <ModeratorsSheet
        visible={modsOpen}
        title="Live moderators"
        copy="You can appoint up to two. Search a username, tap who you want, then Add."
        hostUsername={host}
        moderators={moderators}
        suggestions={suggestedMods}
        onClose={() => setModsOpen(false)}
        onAdd={live.addPrepareModerator}
        onRemove={live.removePrepareModerator}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.liveDark,
  },
  cancel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: 'rgba(255,247,240,0.7)',
  },
  body: {
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: IVORY_50,
    marginTop: 8,
  },
  cover: {
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    backgroundColor: '#463038',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  coverSet: {
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.2)',
  },
  coverLabel: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,247,240,0.34)',
  },
  coverChange: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: Palette.ivory,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  coverChangeLabel: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.liveDark,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.22)',
    backgroundColor: 'rgba(255,247,240,0.05)',
    borderRadius: Radius.sm,
    paddingHorizontal: 15,
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  textArea: {
    minHeight: 78,
    paddingTop: 13,
    textAlignVertical: 'top',
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editLink: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.blush,
  },
  productRow: {
    gap: 9,
    paddingVertical: 4,
  },
  productTile: {
    width: 78,
  },
  productThumb: {
    aspectRatio: 3 / 4,
    borderRadius: 6,
    backgroundColor: '#463038',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productThumbOn: {
    borderColor: Palette.blush,
  },
  productPrice: {
    marginTop: 6,
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.68)',
    fontVariant: ['tabular-nums'],
  },
  addTile: {
    width: 78,
    aspectRatio: 3 / 4,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,247,240,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileLabel: {
    fontSize: 9,
    color: 'rgba(255,247,240,0.6)',
  },
  hint: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.5)',
  },
  whenLabel: {
    marginTop: 12,
  },
  whenRow: {
    flexDirection: 'row',
    gap: 9,
  },
  whenBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whenBtnOn: {
    backgroundColor: Palette.ivory,
    borderColor: Palette.ivory,
  },
  whenBtnLabel: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  whenBtnLabelOn: {
    color: Palette.liveDark,
  },
  deviceSection: {
    marginTop: 12,
  },
  deviceName: {
    fontSize: 13.5,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.18)',
    backgroundColor: 'rgba(255,247,240,0.04)',
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  deviceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  emptyMod: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,247,240,0.24)',
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyModLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.blush,
  },
  modRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.18)',
    backgroundColor: 'rgba(255,247,240,0.04)',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  modAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.border,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modMeta: {
    flex: 1,
  },
  modName: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  modSub: {
    marginTop: 2,
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.6)',
  },
  modRemove: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.blush,
  },
  errorBanner: {
    marginTop: 8,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,247,240,0.14)',
    gap: 10,
  },
  start: {
    minHeight: 54,
  },
  startDisabled: {
    minHeight: 46,
  },
  footerHint: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.5)',
    textAlign: 'center',
  },
});
