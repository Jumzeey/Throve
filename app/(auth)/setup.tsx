import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SetupScreen() {
  const router = useRouter();
  const { session, completeSetup } = useAuth();
  const [username, setUsername] = useState(session?.username ?? '');
  const [bio, setBio] = useState(session?.bio ?? '');
  const [location, setLocation] = useState(session?.location ?? '');
  const [photoUri, setPhotoUri] = useState(session?.photoUri);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (session.setupComplete && !saved) {
    return <Redirect href="/(tabs)" />;
  }

  async function onPickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0]?.uri);
    }
  }

  async function onSubmit() {
    setError('');
    setLoading(true);
    try {
      await completeSetup({ username, bio, location, photoUri });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Set up your profile" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!saved ? (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarEmpty}>
                  <Ionicons name="camera-outline" size={28} color={Palette.muted3} />
                </View>
              )}
            </Pressable>
            <Text style={styles.usernameLabel}>Username</Text>
            <View style={styles.fields}>
              <TextField placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
              <TextField placeholder="Short bio" value={bio} onChangeText={setBio} multiline style={styles.bio} />
              <TextField placeholder="Location (e.g. Lagos, NG)" value={location} onChangeText={setLocation} />
            </View>
            <ErrorBanner message={error} />
            <Button label="Continue" loading={loading} onPress={onSubmit} style={styles.submit} />
          </ScrollView>
        ) : (
          <View style={styles.done}>
            <View style={styles.check}>
              <Ionicons name="checkmark" size={24} color={Palette.background} />
            </View>
            <Text style={styles.doneTitle}>Profile saved</Text>
            <Text style={styles.doneCopy}>{"Let's show you around before you start browsing."}</Text>
            <Button label="Continue" onPress={() => router.replace('/(tabs)')} style={styles.doneButton} />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  flex: { flex: 1 },
  form: { paddingHorizontal: 24, paddingBottom: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarEmpty: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Palette.hatch,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    borderStyle: 'dashed',
  },
  usernameLabel: {
    fontSize: 14,
    fontFamily: Typography.heading,
    color: Palette.muted,
    marginBottom: 6,
  },
  fields: { gap: 12 },
  bio: { height: 70, paddingTop: 10, textAlignVertical: 'top' },
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
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 20,
    fontFamily: Typography.heading,
    color: Palette.text,
  },
  doneCopy: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 270,
  },
  doneButton: { marginTop: 10 },
});
