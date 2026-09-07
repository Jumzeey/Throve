import { ModeratorsSheet } from '@/components/live/moderators-sheet';
import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import {
  AlertCircleIcon,
  CalendarIcon,
  ImagePlaceholderIcon,
  MicIcon,
  PlusIcon,
  UserIcon,
  VideoIcon,
} from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { MAX_LIVE_MODERATORS, useLive } from '@/context/live-context';
import { getListingImageSource } from '@/data/images';
import type { Department } from '@/data/types';
import { apiUpload } from '@/lib/api';
import { formatLiveSchedule, formatNaira } from '@/lib/format';
import { listingPhotoFormPart, pickListingPhotos } from '@/lib/listing-photos';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const IVORY_50 = 'rgba(255,247,240,0.5)';

type CategoryChip = {
  key: string;
  label: string;
  department: Department;
  category: string;
};

const CATEGORY_CHIPS: CategoryChip[] = [
  { key: 'Women|Bags', label: 'Women · Bags', department: 'Women', category: 'Bags' },
  { key: 'Women|Clothing', label: 'Women · Clothing', department: 'Women', category: 'Clothing' },
  { key: 'Men|Clothing', label: 'Men · Clothing', department: 'Men', category: 'Clothing' },
  { key: 'Women|Shoes', label: 'Women · Shoes', department: 'Women', category: 'Shoes' },
  { key: 'Men|Shoes', label: 'Men · Shoes', department: 'Men', category: 'Shoes' },
];

type DeviceStatus = 'ready' | 'needed' | 'blocked' | 'checking';

function permissionStatus(
  perm: { granted: boolean; canAskAgain?: boolean; status?: string } | null,
): DeviceStatus {
  if (!perm) return 'checking';
  if (perm.granted) return 'ready';
  if (perm.canAskAgain === false) return 'blocked';
  return 'needed';
}

export default function PrepareLiveScreen() {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const keyboard = useKeyboardInset();
  const { isConnected } = useNetworkStatus();
  const { session } = useAuth();
  const { listingsForSeller } = useListings();
  const inbox = useInbox();
  const live = useLive();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [categoryKey, setCategoryKey] = useState(CATEGORY_CHIPS[0].key);
  const [description, setDescription] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const next = new Date();
    next.setHours(next.getHours() + 2, 0, 0, 0);
    return next;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [modsOpen, setModsOpen] = useState(false);
  const productsRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);

  const products = useMemo(() => {
    if (!session) return [];
    return listingsForSeller(session.username).filter((listing) => listing.status === 'available');
  }, [listingsForSeller, session]);

  const cameraStatus = permissionStatus(cameraPermission);
  const micStatus = permissionStatus(micPermission);
  const categoryChip = CATEGORY_CHIPS.find((chip) => chip.key === categoryKey) ?? CATEGORY_CHIPS[0];

  const missing: string[] = [];
  if (!title.trim()) missing.push('A live title');
  if (selected.length === 0) missing.push('At least one product');

  const devicesOk = cameraStatus === 'ready' && micStatus === 'ready';
  const draftReady = missing.length === 0;
  const canStart = draftReady && devicesOk && isConnected && !coverUploading;
  const deviceBlocked = cameraStatus === 'blocked' || micStatus === 'blocked';
  const deviceNeedsPermission = cameraStatus === 'needed' || micStatus === 'needed';

  useEffect(() => {
    if (!isConnected) setError(null);
  }, [isConnected]);

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

  function toggleProduct(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setError(null);
  }

  async function changeCover() {
    setCoverUploading(true);
    setError(null);
    try {
      const picked = await pickListingPhotos(1);
      if (picked.rejected[0]) {
        setError(picked.rejected[0]);
        return;
      }
      const uri = picked.uris[0];
      if (!uri) return;
      const formData = new FormData();
      formData.append('files', listingPhotoFormPart(uri, 0) as unknown as Blob);
      const uploaded = await apiUpload<{ urls: string[] }>('/media/listing-photos', formData);
      if (uploaded.urls[0]) setCoverUrl(uploaded.urls[0]);
    } catch {
      setError("We couldn't upload that cover image. Try again.");
    } finally {
      setCoverUploading(false);
    }
  }

  async function ensureDevice(kind: 'camera' | 'mic') {
    setError(null);
    const status = kind === 'camera' ? cameraStatus : micStatus;
    if (status === 'blocked') {
      await Linking.openSettings();
      return;
    }
    if (kind === 'camera') await requestCameraPermission();
    else await requestMicPermission();
  }

  async function checkDevicesAgain() {
    setError(null);
    if (cameraStatus !== 'ready') await requestCameraPermission();
    if (micStatus !== 'ready') await requestMicPermission();
  }

  async function submit() {
    if (!isConnected) return;
    if (!draftReady) return;
    if (!devicesOk) {
      setError("Live can't start until the camera and microphone are both available.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const created = await live.startLive({
        host,
        title: title.trim(),
        department: categoryChip.department,
        category: categoryChip.category,
        description: description.trim() || undefined,
        featuredListingIds: selected,
        thumbnailUrl: coverUrl ?? undefined,
        products: selected.map((listingId, index) => {
          const listing = products.find((p) => p.id === listingId);
          return {
            listingId,
            livePrice: listing?.price ?? 0,
            stock: 1,
            isPinned: index === 0,
          };
        }),
        scheduledAt: scheduleMode ? scheduledDate.toISOString() : undefined,
      });
      if (created.status === 'upcoming') {
        router.replace('/(tabs)/live');
        return;
      }
      router.replace('/live/broadcast');
    } catch {
      setError("We couldn't start your live");
    } finally {
      setStarting(false);
    }
  }

  const startLabel = starting
    ? 'Starting your live...'
    : !canStart
      ? 'Start live · unavailable'
      : scheduleMode
        ? 'Schedule live'
        : 'Start live';

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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.body,
            {
              paddingBottom:
                sheetBottom + (Platform.OS === 'android' && keyboard.height > 0 ? keyboard.height : 0) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {!isConnected ? (
            <OfflineBanner
              title="No connection"
              message="Reconnect to continue setting up your live or start broadcasting."
              style={styles.banner}
            />
          ) : null}

          <Text style={styles.sectionLabel}>Cover image</Text>
          <Pressable onPress={changeCover} style={styles.cover}>
            {coverUrl ? (
              <AppImage source={coverUrl} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <ImagePlaceholderIcon size={22} color="rgba(255,247,240,0.34)" />
                <Text style={styles.coverLabel}>COVER IMAGE</Text>
              </View>
            )}
            <View style={styles.coverChange}>
              <Text style={styles.coverChangeLabel}>{coverUploading ? 'Uploading…' : 'Change'}</Text>
            </View>
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
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORY_CHIPS.map((chip) => {
              const on = chip.key === categoryKey;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setCategoryKey(chip.key)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>Description · optional</Text>
          <TextInput
            placeholder="Bags and tailoring from this week's intake. Sizes S–L."
            placeholderTextColor={IVORY_50}
            value={description}
            onChangeText={setDescription}
            multiline
            style={[styles.input, styles.textArea]}
          />

          <View ref={productsRef} style={styles.productsHeader}>
            <Text style={styles.sectionLabelInline}>Products in this live</Text>
            <Pressable
              onPress={() => scrollRef.current?.scrollTo({ y: 420, animated: true })}
              hitSlop={8}
            >
              <Text style={styles.editLink}>Edit selection</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productRow}
          >
            {products.map((listing) => {
              const on = selected.includes(listing.id);
              return (
                <Pressable key={listing.id} onPress={() => toggleProduct(listing.id)} style={styles.productTile}>
                  <View style={[styles.productThumb, on && styles.productThumbOn]}>
                    <AppImage source={getListingImageSource(listing)} style={styles.productImage} />
                  </View>
                  <Text style={styles.productPrice}>{formatNaira(listing.price)}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                if (products[0] && !selected.includes(products[0].id)) toggleProduct(products[0].id);
              }}
              style={styles.addTile}
            >
              <PlusIcon size={16} color="rgba(255,247,240,0.6)" />
              <Text style={styles.addTileLabel}>Add</Text>
            </Pressable>
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
              onPress={() => {
                setScheduleMode(true);
                setShowPicker(true);
              }}
              style={[styles.whenBtn, scheduleMode && styles.whenBtnOn]}
            >
              <Text style={[styles.whenBtnLabel, scheduleMode && styles.whenBtnLabelOn]}>Schedule</Text>
            </Pressable>
          </View>

          {scheduleMode ? (
            <Pressable onPress={() => setShowPicker(true)} style={styles.scheduledCard}>
              <CalendarIcon size={16} color={Palette.espresso} />
              <View style={styles.scheduledMeta}>
                <Text style={styles.scheduledWhen}>{formatLiveSchedule(scheduledDate.toISOString())}</Text>
                <Text style={styles.scheduledSub}>Shown under Upcoming lives</Text>
              </View>
              <View style={styles.scheduledBadge}>
                <Text style={styles.scheduledBadgeText}>SCHEDULED</Text>
              </View>
            </Pressable>
          ) : null}

          {showPicker && scheduleMode ? (
            <DateTimePicker
              value={scheduledDate}
              mode="datetime"
              minimumDate={new Date()}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowPicker(false);
                if (date) setScheduledDate(date);
              }}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
            />
          ) : null}

          <Text style={[styles.sectionLabel, styles.deviceSection]}>Device check</Text>
          <DeviceRow
            icon={<VideoIcon size={18} color={cameraStatus === 'ready' ? Palette.ivory : Palette.espresso} />}
            label="Camera"
            status={cameraStatus}
            onPress={() => void ensureDevice('camera')}
          />
          <DeviceRow
            icon={<MicIcon size={18} color={micStatus === 'ready' ? Palette.ivory : Palette.espresso} />}
            label="Microphone"
            status={micStatus}
            onPress={() => void ensureDevice('mic')}
          />

          {(deviceNeedsPermission || deviceBlocked) && (
            <View style={styles.deviceHelp}>
              <Text style={styles.deviceHelpText}>
                Throve needs your camera to broadcast. Allow camera access in your device settings, then check again.
              </Text>
              <Button label="Check again" variant="secondary" onPress={() => void checkDevicesAgain()} style={styles.checkAgain} />
            </View>
          )}

          <View style={styles.modsHeader}>
            <Text style={styles.sectionLabelInline}>
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

          {!draftReady ? (
            <View style={styles.needsCard}>
              <View style={styles.needsHeader}>
                <AlertCircleIcon size={16} color={Palette.warningText} />
                <Text style={styles.needsTitle}>
                  {missing.length === 1 ? 'One thing still needed' : `${missing.length} things still needed`}
                </Text>
              </View>
              {missing.map((item) => (
                <Text key={item} style={styles.needsItem}>
                  · {item}
                </Text>
              ))}
            </View>
          ) : null}

          {error ? (
            <AlertBanner
              variant="error"
              title={error}
              message={error.includes("couldn't start") ? 'Check your connection and try again.' : undefined}
              style={styles.banner}
            />
          ) : null}

          <View style={styles.footer}>
            <Button
              label={startLabel}
              variant="live"
              loading={starting}
              disabled={!canStart || starting}
              onPress={submit}
              style={styles.start}
            />
            {!devicesOk && draftReady ? (
              <Text style={styles.footerHint}>
                Live can't start until the camera and microphone are both available.
              </Text>
            ) : (
              <Text style={styles.footerHint}>
                Viewers can claim a featured item for about 5 minutes while they check out.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModeratorsSheet
        visible={modsOpen}
        title="Live moderators"
        copy="You can appoint up to two. They help with comments and disruptive viewers — nothing else."
        hostUsername={host}
        moderators={moderators}
        suggestions={suggestedMods}
        onClose={() => setModsOpen(false)}
        onAdd={live.addPrepareModerators}
        onRemove={live.removePrepareModerator}
      />
    </View>
  );
}

function DeviceRow({
  icon,
  label,
  status,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  status: DeviceStatus;
  onPress: () => void;
}) {
  const badge =
    status === 'ready'
      ? { label: 'READY', tone: 'ready' as const }
      : status === 'blocked'
        ? { label: 'BLOCKED', tone: 'blocked' as const }
        : status === 'needed'
          ? { label: 'PERMISSION NEEDED', tone: 'needed' as const }
          : { label: '…', tone: 'needed' as const };
  const light = status === 'needed' || status === 'blocked';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.deviceRow,
        status === 'blocked' && styles.deviceRowBlocked,
        status === 'needed' && styles.deviceRowNeeded,
      ]}
    >
      <View style={styles.deviceLeft}>
        {icon}
        <Text style={[styles.deviceName, light && styles.deviceNameLight]}>{label}</Text>
      </View>
      <View
        style={[
          styles.deviceBadge,
          badge.tone === 'ready' && styles.deviceBadgeReady,
          badge.tone === 'blocked' && styles.deviceBadgeBlocked,
          badge.tone === 'needed' && styles.deviceBadgeNeeded,
        ]}
      >
        <Text
          style={[
            styles.deviceBadgeText,
            badge.tone === 'ready' && styles.deviceBadgeTextReady,
            badge.tone === 'blocked' && styles.deviceBadgeTextBlocked,
            badge.tone === 'needed' && styles.deviceBadgeTextNeeded,
          ]}
        >
          {badge.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.liveDark,
  },
  flex: { flex: 1 },
  cancel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: 'rgba(255,247,240,0.7)',
  },
  body: {
    paddingHorizontal: 20,
    gap: 10,
  },
  banner: {
    marginTop: 4,
    width: '100%',
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: IVORY_50,
    marginTop: 8,
  },
  sectionLabelInline: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: IVORY_50,
  },
  cover: {
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    backgroundColor: '#463038',
    overflow: 'hidden',
    marginTop: 4,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverLabel: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,247,240,0.34)',
    fontFamily: Typography.bodySemiBold,
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
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.28)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipOn: {
    backgroundColor: Palette.ivory,
    borderColor: Palette.ivory,
  },
  chipLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  chipLabelOn: {
    color: Palette.liveDark,
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
    overflow: 'hidden',
  },
  productThumbOn: {
    borderColor: Palette.blush,
  },
  productImage: {
    width: '100%',
    height: '100%',
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
    gap: 6,
  },
  addTileLabel: {
    fontSize: 9,
    color: 'rgba(255,247,240,0.6)',
    fontFamily: Typography.bodySemiBold,
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
  scheduledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  scheduledMeta: {
    flex: 1,
    minWidth: 0,
  },
  scheduledWhen: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  scheduledSub: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  scheduledBadge: {
    borderWidth: 1,
    borderColor: Palette.espresso,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  scheduledBadgeText: {
    fontSize: 9,
    letterSpacing: 0.7,
    fontFamily: Typography.bodyBold,
    color: Palette.espresso,
  },
  deviceSection: {
    marginTop: 12,
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
  deviceRowNeeded: {
    backgroundColor: Palette.warningBg,
    borderColor: Palette.warningBorder,
  },
  deviceRowBlocked: {
    backgroundColor: Palette.errorBg,
    borderColor: Palette.errorBorder,
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceName: {
    fontSize: 13.5,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  deviceNameLight: {
    color: Palette.espresso,
  },
  deviceBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deviceBadgeReady: {
    borderColor: Palette.successBorder,
    backgroundColor: Palette.successBg,
  },
  deviceBadgeNeeded: {
    borderColor: Palette.warningBorder,
    backgroundColor: 'transparent',
  },
  deviceBadgeBlocked: {
    borderColor: Palette.errorBorder,
    backgroundColor: 'transparent',
  },
  deviceBadgeText: {
    fontSize: 9.5,
    letterSpacing: 0.7,
    fontFamily: Typography.bodyBold,
  },
  deviceBadgeTextReady: {
    color: Palette.successText,
  },
  deviceBadgeTextNeeded: {
    color: Palette.warningText,
  },
  deviceBadgeTextBlocked: {
    color: Palette.error,
  },
  deviceHelp: {
    gap: 10,
    marginTop: 4,
  },
  deviceHelpText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.62)',
  },
  checkAgain: {
    minHeight: 44,
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
  needsCard: {
    marginTop: 8,
    backgroundColor: Palette.warningBg,
    borderWidth: 1,
    borderColor: Palette.warningBorder,
    borderRadius: Radius.md,
    padding: 14,
    gap: 4,
  },
  needsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  needsTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.warningText,
  },
  needsItem: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
    paddingLeft: 4,
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
  footerHint: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.5)',
    textAlign: 'center',
  },
});
