import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Typography } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { isValidEmail } from '@/lib/validation';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

/** Account recovery now routes into the OTP password setup / reset flow. */
export default function RecoveryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;

  async function onContinue() {
    if (!isConnected) return;
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      router.push({
        pathname: '/(auth)/set-password',
        params: { email: email.trim().toLowerCase(), purpose: 'setup' },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <Text style={styles.heading}>Forgot{'\n'}password</Text>
          <Text style={styles.lead}>
            Enter your email and we’ll help you set a new password with a one-time verification code.
          </Text>
          {!isConnected ? <OfflineBanner message="Reconnect to continue." /> : null}
          <TextField
            label="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {error ? <AlertBanner variant="error" title="Couldn’t continue" message={error} style={styles.banner} /> : null}
          <Button label="Continue" loading={loading} onPress={onContinue} disabled={!isConnected} style={styles.submit} />
        </View>
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
});
