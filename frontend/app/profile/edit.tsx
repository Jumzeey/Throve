import { LocationField } from '@/components/ui/location-field';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { UserIcon } from '@/components/ui/icons';
import { ProgressBar } from '@/components/ui/loading-skeleton';
import { PhoneField } from '@/components/ui/phone-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DEFAULT_COUNTRY_ISO } from '@/data/country-codes';
import { useKeyboardBottomInset } from '@/hooks/use-keyboard-bottom-inset';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { ensureMediaLibraryPermission } from '@/lib/listing-photos';
import { formatPhoneE164, isValidPhone, parseStoredPhone } from '@/lib/phone';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const keyboardBottom = useKeyboardBottomInset();
  const scrollRef = useRef<ScrollView>(null);
  const { session, updateProfile, setProfilePhoto } = useAuth();
  const { isConnected } = useNetworkStatus();
  const initialPhone = parseStoredPhone(session?.phone);
  const [name, setName] = useState(session?.name ?? '');
  const [username, setUsername] = useState(session?.username ?? '');
  const [bio, setBio] = useState(session?.bio ?? '');
  const [location, setLocation] = useState(session?.location ?? '');
  const [countryIso, setCountryIso] = useState(initialPhone.countryIso || DEFAULT_COUNTRY_ISO);
  const [nationalNumber, setNationalNumber] = useState(initialPhone.nationalNumber);
  const [photoUri, setPhotoUri] = useState(session?.photoUri);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (keyboardBottom <= 0) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [keyboardBottom]);

  function scrollFieldIntoView() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 280);
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  async function onPickPhoto() {
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
    setError('');
    try {
      setPhotoUri(await setProfilePhoto(local));
    } catch (err) {
      setPhotoUri(previous);
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    if (!isConnected) return;
    setError('');
    setPhoneError('');
    if (!isValidPhone(countryIso, nationalNumber)) {
      setPhoneError('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        name,
        username,
        bio,
        location,
        photoUri,
        phone: formatPhoneE164(countryIso, nationalNumber),
      });
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again in a moment.';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
      <ScreenHeader title="Edit profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: Spacing.xxxl + bottom + (keyboardBottom > 0 ? keyboardBottom : 0) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {!isConnected ? <OfflineBanner message="Reconnect to save your profile." /> : null}
          <Text style={styles.lead}>{lead}</Text>
          <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
            <ProfileAvatar uri={photoUri} username={username} style={styles.avatar} allowLocal />
            <View style={styles.avatarBadge}>
              <UserIcon size={14} color={Palette.ivory} />
            </View>
          </Pressable>
          {uploading ? (
            <View style={styles.uploadRow}>
              <Text style={styles.uploadText}>Uploading photo…</Text>
              <ProgressBar progress={0.74} width={120} />
            </View>
          ) : null}
          <View style={styles.fields}>
            <TextField label="Display name" value={name} onChangeText={setName} onFocus={scrollFieldIntoView} />
            <TextField
              label="Username"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              onFocus={scrollFieldIntoView}
            />
            <PhoneField
              countryIso={countryIso}
              nationalNumber={nationalNumber}
              onCountryChange={setCountryIso}
              onNumberChange={setNationalNumber}
              error={phoneError}
            />
            <TextField
              label="Bio"
              placeholder="A line about your style"
              value={bio}
              onChangeText={setBio}
              multiline
              style={styles.bio}
              onFocus={scrollFieldIntoView}
            />
            <LocationField
              label="Location"
              placeholder="Search Google Maps"
              value={location}
              hint="Pick a real city or area from Google Maps."
              onFocus={scrollFieldIntoView}
              onSelect={(place) => setLocation(place.label || place.formattedAddress)}
            />
          </View>
          {error ? <AlertBanner variant="error" title="We couldn't save that" message={error} /> : null}
          <Button label="Save changes" loading={loading} onPress={onSave} disabled={!isConnected || uploading} />
        </ScrollView>
      </KeyboardAvoidingView>
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
});
