import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { MailIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

export default function RecoveryScreen() {
  const router = useRouter();
  const { session, requestRecovery } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;

  async function onSend() {
    if (!isConnected) return;
    setError('');
    setLoading(true);
    try {
      await requestRecovery(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  function onBack() {
    if (sent) {
      setSent(false);
      setError('');
      return;
    }
    router.back();
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="" onBack={onBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!sent ? (
          <View style={styles.form}>
            <Text style={styles.heading}>Account{'\n'}recovery</Text>
            <Text style={styles.lead}>
              Enter your registered email address and we'll send recovery instructions if it's associated with an account.
            </Text>
            {!isConnected ? <OfflineBanner message="Reconnect to request recovery instructions." /> : null}
            <TextField
              label="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <AlertBanner variant="error" title="Recovery failed" message={error} style={styles.banner} /> : null}
            <Button label="Send recovery link" loading={loading} onPress={onSend} disabled={!isConnected} style={styles.submit} />
          </View>
        ) : (
          <View style={styles.sent}>
            <View style={styles.sentCard}>
              <MailIcon size={26} />
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.copy}>
                If {email.trim()} is associated with a Throve account, recovery instructions have been sent.
              </Text>
              <Button label="Back to log in" variant="secondary" onPress={() => router.replace('/(auth)/login')} style={styles.back} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  flex: { flex: 1 },
  form: { paddingHorizontal: 24 },
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
    marginBottom: 26,
  },
  banner: { marginTop: 12 },
  submit: { marginTop: 22 },
  sent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  sentCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
    borderRadius: Radius.md,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    marginTop: 4,
  },
  copy: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
    textAlign: 'center',
  },
  back: { alignSelf: 'stretch', marginTop: 8 },
});
