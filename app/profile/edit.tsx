import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { session, updateProfile } = useAuth();
  const [name, setName] = useState(session?.name ?? '');
  const [username, setUsername] = useState(session?.username ?? '');
  const [location, setLocation] = useState(session?.location ?? '');
  const [bio, setBio] = useState(session?.bio ?? '');
  const [photoUri, setPhotoUri] = useState(session?.photoUri);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
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

  async function onSave() {
    setError('');
    setLoading(true);
    try {
      await updateProfile({ name, username, bio, location, photoUri });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Edit profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.avatar} /> : <PlaceholderImage style={styles.avatar} />}
          </Pressable>
          <Field label="Name">
            <TextField value={name} onChangeText={(value) => { setName(value); setError(''); }} />
          </Field>
          <Field label="Username">
            <TextField autoCapitalize="none" value={username} onChangeText={(value) => { setUsername(value); setError(''); }} />
          </Field>
          <Field label="Location">
            <TextField value={location} onChangeText={setLocation} />
          </Field>
          <Field label="Bio">
            <TextField value={bio} onChangeText={setBio} multiline style={styles.bio} />
          </Field>
          <ErrorBanner message={error} />
          <Button label="Save changes" loading={loading} onPress={onSave} style={styles.save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  flex: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  bio: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  save: {
    marginTop: 20,
  },
});
