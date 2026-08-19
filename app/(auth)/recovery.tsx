import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

export default function RecoveryScreen() {
  const router = useRouter();
  const { session, requestRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
      await requestRecovery(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Account recovery" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!sent ? (
          <View style={styles.form}>
            <Text style={styles.copy}>
              {"Enter your registered email address and we'll send recovery instructions if it's associated with an account."}
            </Text>
            <TextField
              placeholder="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <ErrorBanner message={error} />
            <Button label="Send recovery link" loading={loading} onPress={onSend} style={styles.submit} />
          </View>
        ) : (
          <View style={styles.sent}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={28} color={Palette.background} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.copyCenter}>
              If {email.trim()} is associated with a Throve account, recovery instructions have been sent.
            </Text>
            <Button label="Back to log in" variant="secondary" onPress={() => router.replace('/(auth)/login')} style={styles.back} />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  flex: { flex: 1 },
  form: { paddingHorizontal: 24 },
  copy: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
    marginBottom: 14,
  },
  submit: { marginTop: 20 },
  sent: {
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
  title: {
    fontSize: 18,
    fontFamily: Typography.heading,
    color: Palette.text,
  },
  copyCenter: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 270,
  },
  back: { marginTop: 8 },
});
