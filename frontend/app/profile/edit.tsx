import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { UserIcon } from '@/components/ui/icons';
import { ProgressBar } from '@/components/ui/loading-skeleton';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getSellerAvatar } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { AppImage } from '@/components/ui/app-image';
import { ensureMediaLibraryPermission } from '@/lib/listing-photos';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { session, updateProfile } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [name, setName] = useState(session?.name ?? '');
  const [username, setUsername] = useState(session?.username ?? '');
  const [bio, setBio] = useState(session?.bio ?? '');
  const [location, setLocation] = useState(session?.location ?? '');
  const [photoUri, setPhotoUri] = useState(session?.photoUri);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  async function onPickPhoto() {
    const allowed = await ensureMediaLibraryPermission();
    if (!allowed) return;
    setUploading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    setUploading(false);
    if (!result.canceled) {
      setPhotoUri(result.assets[0]?.uri);
    }
  }

  async function onSave() {
    if (!isConnected) return;
    setError('');
    setLoading(true);
    try {
      await updateProfile({ name, username, bio, location, photoUri });
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again in a moment.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Edit profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!isConnected ? <OfflineBanner message="Reconnect to save your profile." /> : null}
          <Text style={styles.lead}>Update your photo and details so buyers and sellers know who you are.</Text>
          <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <AppImage source={getSellerAvatar(username)} style={styles.avatar} />
            )}
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
            <TextField label="Display name" value={name} onChangeText={setName} />
            <TextField label="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
            <TextField
              label="Bio"
              placeholder="A line about your style"
              value={bio}
              onChangeText={setBio}
              multiline
              style={styles.bio}
            />
            <TextField label="Location" placeholder="Lagos, NG" value={location} onChangeText={setLocation} />
          </View>
          {error ? <AlertBanner variant="error" title="We couldn't save that" message={error} /> : null}
          <Button label="Save changes" loading={loading} onPress={onSave} disabled={!isConnected} />
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
