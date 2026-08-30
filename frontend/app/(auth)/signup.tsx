import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { MailIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { isValidDob, isValidEmail } from '@/lib/validation';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SignupScreen() {
  const router = useRouter();
  const { session, signup, completeVerification } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'form' | 'verify'>('form');

  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter your name to continue.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address so we can send your verification link.';
    if (!username.trim()) next.username = 'Choose a username.';
    if (!dob.trim()) next.dob = 'Select your date of birth.';
    else if (!isValidDob(dob)) next.dob = 'Select a valid date of birth.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    if (!isConnected) return;
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await signup({ email, name, username, dob });
      setStage('verify');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again in a moment.';
      if (msg.toLowerCase().includes('username')) {
        setFieldErrors({ username: 'That username is taken. Try another.' });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setError('');
    setLoading(true);
    try {
      await completeVerification({ email, name, username, dob });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  function onBack() {
    if (stage === 'verify') {
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
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Create your{'\n'}account</Text>
            <Text style={styles.lead}>Throve uses email sign-in links — no passwords to remember.</Text>
            {!isConnected ? (
              <OfflineBanner message="You'll need an internet connection to create your account. Reconnect and try again." />
            ) : null}
            <View style={styles.fields}>
              <TextField label="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} error={fieldErrors.email} />
              <TextField label="Name" value={name} onChangeText={setName} error={fieldErrors.name} placeholder="Your name" />
              <TextField label="Username" autoCapitalize="none" value={username} onChangeText={setUsername} error={fieldErrors.username} />
              <DateField label="Date of birth" value={dob} onChange={setDob} error={fieldErrors.dob} />
            </View>
            <View style={styles.notice}>
              <MailIcon size={18} />
              <View style={styles.noticeText}>
                <Text style={styles.noticeTitle}>Email verification is required</Text>
                <Text style={styles.noticeBody}>We'll send a verification link to your email. Your account is created once you open it.</Text>
              </View>
            </View>
            {error ? <AlertBanner variant="error" title="We couldn't complete that" message={error} style={styles.banner} /> : null}
            <Button label="Create account" loading={loading} onPress={onSubmit} disabled={!isConnected} style={styles.submit} />
            <Text style={styles.footer}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => router.replace('/(auth)/login')}>Log in</Text>
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.verify}>
            <View style={styles.verifyCard}>
              <MailIcon size={26} />
              <Text style={styles.verifyTitle}>Check your email</Text>
              <Text style={styles.verifyCopy}>We sent a verification link to {email.trim()}. Open it to finish creating your account.</Text>
              <Button label="Resend link" variant="secondary" onPress={onSubmit} style={styles.resend} />
              {__DEV__ ? (
                <Button label="Simulate: I clicked the link" loading={loading} onPress={onVerify} style={styles.simulate} />
              ) : null}
            </View>
            {error ? <AlertBanner variant="error" title="We couldn't complete that" message={error} /> : null}
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
    marginBottom: 24,
  },
  fields: { gap: 18 },
  notice: {
    flexDirection: 'row',
    gap: 11,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
    padding: 14,
    marginTop: 22,
  },
  noticeText: { flex: 1 },
  noticeTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    marginBottom: 3,
  },
  noticeBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  banner: { marginTop: 16 },
  submit: { marginTop: 20 },
  footer: {
    marginTop: 14,
    fontSize: 13,
    textAlign: 'center',
    color: Palette.body,
    fontFamily: Typography.body,
  },
  link: { color: Palette.plum, fontFamily: Typography.bodySemiBold },
  verify: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 16,
  },
  verifyCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
    borderRadius: Radius.md,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  verifyTitle: {
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    marginTop: 4,
  },
  verifyCopy: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
    textAlign: 'center',
  },
  resend: { alignSelf: 'stretch', marginTop: 8 },
  simulate: { alignSelf: 'stretch' },
});
