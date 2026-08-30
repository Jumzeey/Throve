import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { MailIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { isValidEmail } from '@/lib/validation';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { session, requestMagicLink, completeMagicLink } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'form' | 'sent'>('form');

  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;

  async function onSend() {
    if (!isConnected) return;
    setError('');
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      await requestMagicLink(email);
      setStage('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  async function onUseLink() {
    setError('');
    setLoading(true);
    try {
      await completeMagicLink(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  function onBack() {
    if (stage === 'sent') {
      setStage('form');
      setError('');
      return;
    }
    router.back();
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="" onBack={onBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {stage === 'form' ? (
          <View style={styles.form}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.lead}>Enter your email and we'll send you a sign-in link.</Text>
            {!isConnected ? <OfflineBanner message="Reconnect to sign in." /> : null}
            <TextField
              label="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              error={emailError}
            />
            {error ? <AlertBanner variant="error" title="We couldn't send that link" message={error} style={styles.banner} /> : null}
            <Button label="Send magic link" loading={loading} onPress={onSend} disabled={!isConnected} style={styles.submit} />
            <Button label="Can't access your account?" variant="ghost" onPress={() => router.push('/(auth)/recovery')} />
            <View style={styles.divider} />
            <Text style={styles.footer}>
              New to Throve?{' '}
              <Text style={styles.link} onPress={() => router.replace('/(auth)/signup')}>Create an account</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.sent}>
            <View style={styles.sentCard}>
              <MailIcon size={26} />
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.copy}>If an account is associated with this email, we've sent a sign-in link.</Text>
              <Button label="Resend link" variant="secondary" onPress={onSend} style={styles.resend} />
              {__DEV__ ? (
                <Button label="Simulate: I clicked the link" loading={loading} onPress={onUseLink} />
              ) : null}
            </View>
            {error ? <AlertBanner variant="error" title="We couldn't send that link" message={error} /> : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  flex: { flex: 1 },
  form: { paddingHorizontal: 24, flex: 1 },
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
  divider: { height: 1, backgroundColor: Palette.divider, marginVertical: 20 },
  footer: { fontSize: 13, textAlign: 'center', color: Palette.body, fontFamily: Typography.body },
  link: { color: Palette.plum, fontFamily: Typography.bodySemiBold },
  sent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 16,
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
  resend: { alignSelf: 'stretch', marginTop: 8 },
});
