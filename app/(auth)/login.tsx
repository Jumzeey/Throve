import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { session, requestMagicLink, completeMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'form' | 'sent'>('form');

  if (session?.setupComplete) {
    return <Redirect href="/(tabs)" />;
  }
  if (session) {
    return <Redirect href="/(auth)/setup" />;
  }

  async function onSend() {
    setError('');
    setLoading(true);
    try {
      await requestMagicLink(email);
      setStage('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function onUseLink() {
    setError('');
    setLoading(true);
    try {
      await completeMagicLink();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Log in" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {stage === 'form' ? (
          <View style={styles.form}>
            <TextField
              placeholder="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <ErrorBanner message={error} />
            <Button label="Send magic link" loading={loading} onPress={onSend} style={styles.submit} />
            <Button label="Can't access your account?" variant="ghost" onPress={() => router.push('/(auth)/recovery')} />
          </View>
        ) : (
          <View style={styles.sent}>
            <Text style={styles.emoji}>✉️</Text>
            <Text style={styles.title}>Magic link sent</Text>
            <Text style={styles.copy}>Check {email.trim()} and tap the link to log in.</Text>
            <ErrorBanner message={error} />
            <Button label="Simulate: I clicked the link" loading={loading} onPress={onUseLink} style={styles.simulate} />
          </View>
        )}
      </KeyboardAvoidingView>
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
  form: {
    paddingHorizontal: 24,
  },
  submit: {
    marginTop: 20,
  },
  sent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.text,
  },
  copy: {
    fontSize: 13,
    lineHeight: 21,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
  simulate: {
    marginTop: 8,
    height: 48,
  },
});
