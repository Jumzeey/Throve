import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { CheckIcon, UserIcon } from '@/components/ui/icons';
import { ProgressBar } from '@/components/ui/loading-skeleton';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SetupScreen() {
  const router = useRouter();
  const { session, completeSetup, logout } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [username, setUsername] = useState(session?.username ?? '');
  const [bio, setBio] = useState(session?.bio ?? '');
  const [location, setLocation] = useState(session?.location ?? '');
  const [photoUri, setPhotoUri] = useState(session?.photoUri);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (session.setupComplete && !saved) return <Redirect href="/(tabs)" />;

  async function onPickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
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

  async function onSubmit() {
    if (!isConnected) return;
    setError('');
    setLoading(true);
    try {
      await completeSetup({ username, bio, location, photoUri });
      setSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again in a moment.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onBack() {
    await logout();
    router.replace('/(auth)/welcome');
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="" onBack={onBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!saved ? (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Set up your{'\n'}profile</Text>
            <Text style={styles.lead}>Add a photo and a few details so buyers and sellers know who you are.</Text>
            {!isConnected ? <OfflineBanner message="Reconnect to save your profile." /> : null}
            <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarEmpty}>
                  <UserIcon size={30} />
                </View>
              )}
            </Pressable>
            {uploading ? (
              <View style={styles.uploadRow}>
                <Text style={styles.uploadText}>Uploading photo…</Text>
                <ProgressBar progress={0.74} width={120} />
              </View>
            ) : null}
            <View style={styles.fields}>
              <TextField label="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
              <TextField label="Bio" placeholder="A line about your style" value={bio} onChangeText={setBio} multiline style={styles.bio} />
              <TextField label="Location" placeholder="Lagos, NG" value={location} onChangeText={setLocation} />
            </View>
            {error ? <AlertBanner variant="error" title="We couldn't save that" message={error} style={styles.banner} /> : null}
            <Button label="Continue" loading={loading} onPress={onSubmit} disabled={!isConnected} style={styles.submit} />
          </ScrollView>
        ) : (
          <View style={styles.done}>
            <View style={styles.check}>
              <CheckIcon size={20} color={Palette.ivory} />
            </View>
            <Text style={styles.doneTitle}>Profile saved</Text>
            <Text style={styles.doneCopy}>Taking you to Home.</Text>
            <Button label="Continue" onPress={() => router.replace('/(tabs)')} style={styles.doneButton} />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  flex: { flex: 1 },
  form: { paddingHorizontal: 24, paddingBottom: 30 },
  heading: {
    fontFamily: Typography.display,
    fontSize: 32,
    lineHeight: 35,
    color: Palette.espresso,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  lead: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: Typography.body,
    color: Palette.body,
    marginBottom: 20,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: Palette.border },
  avatarEmpty: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Palette.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  uploadRow: { alignItems: 'center', gap: 8, marginBottom: 16 },
  uploadText: { fontSize: 12.5, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  fields: { gap: 18 },
  bio: { minHeight: 70, paddingTop: 12, textAlignVertical: 'top' },
  banner: { marginTop: 16 },
  submit: { marginTop: 22 },
  done: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  check: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  doneCopy: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  doneButton: { marginTop: 10, alignSelf: 'stretch' },
});
