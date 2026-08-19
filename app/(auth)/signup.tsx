import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SignupScreen() {
  const router = useRouter();
  const { session, signup, completeVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'form' | 'verify'>('form');

  if (session?.setupComplete) {
    return <Redirect href="/(tabs)" />;
  }
  if (session) {
    return <Redirect href="/(auth)/setup" />;
  }

  async function onSubmit() {
    setError('');
    setLoading(true);
    try {
      await signup({ email, name, username, dob });
      setStage('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setError('');
    setLoading(true);
    try {
      await completeVerification();
      router.replace('/(auth)/setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Create account" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {stage === 'form' ? (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <View style={styles.fields}>
              <TextField placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <TextField placeholder="Full name" value={name} onChangeText={setName} />
              <TextField placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
              <TextField placeholder="Date of birth (DD/MM/YYYY)" keyboardType="numbers-and-punctuation" value={dob} onChangeText={setDob} />
            </View>
            <Text style={styles.helper}>{"We'll email you a verification link — no password needed."}</Text>
            <ErrorBanner message={error} />
            <Button label="Create account" loading={loading} onPress={onSubmit} style={styles.submit} />
            <Button label="Already have an account? Log in" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
          </ScrollView>
        ) : (
          <View style={styles.verify}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={28} color={Palette.background} />
            </View>
            <Text style={styles.verifyTitle}>Check your email</Text>
            <Text style={styles.verifyCopy}>We sent a verification link to {email.trim()}. Click it to continue.</Text>
            <ErrorBanner message={error} />
            <Button label="Simulate: I clicked the link" loading={loading} onPress={onVerify} style={styles.simulate} />
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
  fields: { gap: 12 },
  helper: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
  submit: { marginTop: 20 },
  verify: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTitle: {
    fontSize: 18,
    fontFamily: Typography.heading,
    color: Palette.text,
  },
  verifyCopy: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
  simulate: { marginTop: 8 },
});
