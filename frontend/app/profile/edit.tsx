import { LocationField } from '@/components/ui/location-field';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SpinnerArcIcon, UserIcon } from '@/components/ui/icons';
import { ProgressBar } from '@/components/ui/loading-skeleton';
import { PhoneField } from '@/components/ui/phone-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DEFAULT_COUNTRY_ISO } from '@/data/country-codes';
import { useKeyboardAwareScroll } from '@/hooks/use-keyboard-aware-scroll';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { ApiError } from '@/lib/api';
import { ensureMediaLibraryPermission } from '@/lib/listing-photos';
import { formatPhoneE164, isValidPhone, parseStoredPhone } from '@/lib/phone';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type LeavePrompt = 'idle' | 'confirm';

export default function EditProfileScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const keyboardScroll = useKeyboardAwareScroll();
  const { session, updateProfile, setProfilePhoto, isReady } = useAuth();
  const { isConnected } = useNetworkStatus();

  const baseline = useMemo(() => {
    if (!session) return null;
    const phone = parseStoredPhone(session.phone);
    return {
      name: session.name ?? '',
      username: session.username ?? '',
      bio: session.bio ?? '',
      location: session.location ?? '',
      countryIso: phone.countryIso || DEFAULT_COUNTRY_ISO,
      nationalNumber: phone.nationalNumber,
      photoUri: session.photoUri,
    };
  }, [session]);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [nationalNumber, setNationalNumber] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [hydrated, setHydrated] = useState(false);

  const [leavePrompt, setLeavePrompt] = useState<LeavePrompt>('idle');
  const [saveError, setSaveError] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0.35);

  useEffect(() => {
    if (!baseline || hydrated) return;
    setName(baseline.name);
    setUsername(baseline.username);
    setBio(baseline.bio);
    setLocation(baseline.location);
    setCountryIso(baseline.countryIso);
    setNationalNumber(baseline.nationalNumber);
    setPhotoUri(baseline.photoUri);
    setHydrated(true);
  }, [baseline, hydrated]);

  useEffect(() => {
    if (!uploading) {
      setUploadProgress(0.35);
      return;
    }
    const timer = setInterval(() => {
      setUploadProgress((current) => Math.min(0.92, current + 0.08));
    }, 280);
    return () => clearInterval(timer);
  }, [uploading]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => router.back(), 900);
    return () => clearTimeout(timer);
  }, [router, saved]);

  const dirty = useMemo(() => {
    if (!baseline || !hydrated) return false;
    return (
      name.trim() !== baseline.name.trim() ||
      username.trim() !== baseline.username.trim() ||
      bio.trim() !== baseline.bio.trim() ||
      location.trim() !== baseline.location.trim() ||
      countryIso !== baseline.countryIso ||
      nationalNumber.trim() !== baseline.nationalNumber.trim() ||
      (photoUri ?? '') !== (baseline.photoUri ?? '')
    );
  }, [baseline, bio, countryIso, hydrated, location, name, nationalNumber, photoUri, username]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving || uploading) return true;
      if (dirty && !saved) {
        setLeavePrompt('confirm');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [dirty, saved, saving, uploading]);

  function requestLeave() {
    if (saving || uploading) return;
    if (dirty && !saved) {
      setLeavePrompt('confirm');
      return;
    }
    router.back();
  }

  function discardChanges() {
    if (!baseline) return;
    setName(baseline.name);
    setUsername(baseline.username);
    setBio(baseline.bio);
    setLocation(baseline.location);
    setCountryIso(baseline.countryIso);
    setNationalNumber(baseline.nationalNumber);
    setPhotoUri(baseline.photoUri);
    setLeavePrompt('idle');
    setSaveError(false);
    setPhotoError(false);
    setUsernameError(null);
    setPhoneError('');
    router.back();
  }

  async function onPickPhoto() {
    if (uploading || saving) return;
    const allowed = await ensureMediaLibraryPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const local = result.canceled ? undefined : result.assets[0]?.uri;
    if (!local) return;

    const previous = photoUri;
    setPhotoUri(local);
    setUploading(true);
    setPhotoError(false);
    setSaveError(false);
    setUploadProgress(0.28);
    try {
      setPhotoUri(await setProfilePhoto(local));
      setUploadProgress(1);
    } catch {
      setPhotoUri(previous);
      setPhotoError(true);
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    if (!isConnected || saving || uploading) return;
    setSaveError(false);
    setPhotoError(false);
    setUsernameError(null);
    setPhoneError('');
    setLeavePrompt('idle');
    setSaved(false);

    if (!isValidPhone(countryIso, nationalNumber)) {
      setPhoneError('Enter a valid phone number.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name,
        username,
        bio,
        location,
        photoUri,
        phone: formatPhoneE164(countryIso, nationalNumber),
      });
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'USERNAME_TAKEN' || /username.*taken|unavailable/i.test(err.message))) {
        setUsernameError('That username is taken. Try another.');
      } else {
        setSaveError(true);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!isReady || !hydrated) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Edit profile" onBack={() => router.back()} />
        <EditProfileSkeleton />
      </View>
    );
  }

  const missingPhoto = !photoUri;
  const missingBio = !bio.trim();
  const lead =
    missingPhoto && missingBio
      ? 'Add a photo and a few details so buyers and sellers know who you are.'
      : missingPhoto
        ? 'Add a profile photo and update your details so buyers and sellers know who you are.'
        : missingBio
          ? 'Add a short bio and update your details so buyers and sellers know who you are.'
          : 'Update your photo and details so buyers and sellers know who you are.';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Edit profile" onBack={requestLeave} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={keyboardScroll.scrollRef}
          onScroll={keyboardScroll.onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: Spacing.xxxl + Math.max(keyboardScroll.contentPaddingBottom, bottom) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={keyboardScroll.automaticallyAdjustKeyboardInsets}>
          {!isConnected ? (
            <OfflineBanner title="No connection" message="Reconnect to save your changes." />
          ) : null}

          {leavePrompt === 'confirm' ? (
            <View style={styles.unsavedBlock}>
              <AlertBanner
                variant="warning"
                title="You have unsaved changes"
                message="Save them before leaving this screen."
              />
              <View style={styles.unsavedActions}>
                <Button label="Discard" variant="secondary" style={styles.halfBtn} onPress={discardChanges} />
                <Button
                  label="Save"
                  style={styles.halfBtn}
                  loading={saving}
                  disabled={!isConnected || uploading}
                  onPress={() => void onSave()}
                />
              </View>
            </View>
          ) : null}

          {saved ? (
            <AlertBanner variant="success" title="Profile updated" message="Your changes are live." />
          ) : null}

          {saveError ? (
            <AlertBanner
              variant="error"
              title="We couldn't save your profile"
              message="Please try again in a moment."
            />
          ) : null}

          {photoError ? (
            <AlertBanner
              variant="error"
              title="That photo didn't upload"
              message="Try again or choose another image."
            />
          ) : null}

          <Text style={styles.lead}>{lead}</Text>

          <Pressable onPress={() => void onPickPhoto()} style={styles.avatarWrap} disabled={uploading || saving}>
            {uploading ? (
              <View style={[styles.avatar, styles.avatarUploading]}>
                <SpinnerArcIcon size={22} color={Palette.plum} />
              </View>
            ) : (
              <ProfileAvatar uri={photoUri} username={username} style={styles.avatar} allowLocal />
            )}
            {!uploading ? (
              <View style={styles.avatarBadge}>
                <UserIcon size={14} color={Palette.ivory} />
              </View>
            ) : null}
          </Pressable>

          {uploading ? (
            <View style={styles.uploadRow}>
              <Text style={styles.uploadText}>Uploading photo…</Text>
              <ProgressBar progress={uploadProgress} width={120} />
            </View>
          ) : null}

          <View style={styles.fields}>
            <View ref={keyboardScroll.setAnchor('name')} collapsable={false}>
              <TextField
                label="Display name"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setSaved(false);
                }}
                onFocus={() => keyboardScroll.onFieldFocus('name')}
              />
            </View>
            <View ref={keyboardScroll.setAnchor('username')} collapsable={false}>
              <TextField
                label="Username"
                autoCapitalize="none"
                value={username}
                error={usernameError}
                onChangeText={(value) => {
                  setUsername(value);
                  setUsernameError(null);
                  setSaved(false);
                }}
                onFocus={() => keyboardScroll.onFieldFocus('username')}
              />
            </View>
            <View ref={keyboardScroll.setAnchor('phone')} collapsable={false}>
              <PhoneField
                countryIso={countryIso}
                nationalNumber={nationalNumber}
                onCountryChange={(value) => {
                  setCountryIso(value);
                  setSaved(false);
                }}
                onNumberChange={(value) => {
                  setNationalNumber(value);
                  setPhoneError('');
                  setSaved(false);
                }}
                error={phoneError}
                onFocus={() => keyboardScroll.onFieldFocus('phone')}
              />
            </View>
            <View ref={keyboardScroll.setAnchor('bio')} collapsable={false}>
              <TextField
                label="Bio"
                placeholder="A line about your style"
                value={bio}
                onChangeText={(value) => {
                  setBio(value);
                  setSaved(false);
                }}
                multiline
                style={styles.bio}
                onFocus={() => keyboardScroll.onFieldFocus('bio')}
              />
            </View>
            <View ref={keyboardScroll.setAnchor('location')} collapsable={false}>
              <LocationField
                label="Location"
                placeholder="Search for a place"
                value={location}
                hint="Search or type your city or area."
                onFocus={() => keyboardScroll.onFieldFocus('location')}
                onSelect={(place) => {
                  setLocation(place.label || place.formattedAddress);
                  setSaved(false);
                }}
              />
            </View>
          </View>

          <Button
            label={saving ? 'Saving…' : 'Save changes'}
            loading={saving}
            onPress={() => void onSave()}
            disabled={!isConnected || uploading || (!dirty && !saved)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function EditProfileSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonAvatar} />
      <View style={[styles.skeletonLine, { width: '58%' }]} />
      <View style={[styles.skeletonLine, { width: '78%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  flex: { flex: 1 },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  lead: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  unsavedBlock: {
    gap: 11,
  },
  unsavedActions: {
    flexDirection: 'row',
    gap: 9,
  },
  halfBtn: { flex: 1 },
  avatarWrap: {
    alignSelf: 'center',
    marginVertical: Spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  avatarUploading: {
    backgroundColor: Palette.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Palette.ivory,
  },
  uploadRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uploadText: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  fields: { gap: Spacing.lg },
  bio: {
    minHeight: 72,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
  skeleton: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: 11,
    paddingHorizontal: Spacing.xl,
  },
  skeletonAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Palette.skeleton,
    marginBottom: 4,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: Palette.skeleton,
  },
});
