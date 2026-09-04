import { OtpInput } from '@/components/auth/otp-input';
import { PasswordField } from '@/components/auth/password-field';
import { PasswordRequirements } from '@/components/auth/password-requirements';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { MailIcon } from '@/components/ui/icons';
import { PhoneField } from '@/components/ui/phone-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DEFAULT_COUNTRY_ISO } from '@/data/country-codes';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { validatePassword } from '@/lib/password';
import { formatPhoneE164, isValidPhone } from '@/lib/phone';
import { OTP_LENGTH } from '@/lib/otp';
import { isValidDob, isValidEmail } from '@/lib/validation';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

const RESEND_COOLDOWN_SEC = 30;

export default function SignupScreen() {
  const router = useRouter();
  const { session, signup, verifySignupOtp, completeVerification, sendPasswordOtp } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [nationalNumber, setNationalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'form' | 'verify'>('form');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SEC);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter your name to continue.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!username.trim()) next.username = 'Choose a username.';
    if (!dob.trim()) next.dob = 'Select your date of birth.';
    else if (!isValidDob(dob)) next.dob = 'Select a valid date of birth.';
    if (!isValidPhone(countryIso, nationalNumber)) next.phone = 'Enter a valid phone number.';
    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    if (!isConnected) return;
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const phone = formatPhoneE164(countryIso, nationalNumber);
      await signup({ email, name, username, dob, password, phone });
      setStage('verify');
      startCooldown();
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
    if (!isConnected) return;
    setError('');
    if (otp.trim().length < OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    setLoading(true);
    try {
      await verifySignupOtp({ email, otp });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!isConnected || cooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await sendPasswordOtp(email, 'signup');
      setOtp('');
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  async function onDevSimulate() {
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
            <Text style={styles.lead}>Sign up with email and password. We’ll send a code to verify your email.</Text>
            {!isConnected ? (
              <OfflineBanner message="You'll need an internet connection to create your account. Reconnect and try again." />
            ) : null}
            <View style={styles.fields}>
              <TextField
                label="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
              />
              <TextField label="Name" value={name} onChangeText={setName} error={fieldErrors.name} placeholder="Your name" />
              <TextField
                label="Username"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                error={fieldErrors.username}
              />
              <DateField label="Date of birth" value={dob} onChange={setDob} error={fieldErrors.dob} />
              <PhoneField
                countryIso={countryIso}
                nationalNumber={nationalNumber}
                onCountryChange={setCountryIso}
                onNumberChange={setNationalNumber}
                error={fieldErrors.phone}
              />
              <PasswordField label="Password" value={password} onChangeText={setPassword} error={fieldErrors.password} />
              <PasswordStrengthMeter password={password} />
              <PasswordRequirements password={password} />
              <PasswordField label="Confirm password" value={confirm} onChangeText={setConfirm} error={fieldErrors.confirm} />
            </View>
            <View style={styles.notice}>
              <MailIcon size={18} />
              <View style={styles.noticeText}>
                <Text style={styles.noticeTitle}>Email verification is required</Text>
                <Text style={styles.noticeBody}>
                  We’ll send a one-time code to your email. Your account is ready once you enter it.
                </Text>
              </View>
            </View>
            {error ? <AlertBanner variant="error" title="We couldn't complete that" message={error} style={styles.banner} /> : null}
            <Button label="Create account" loading={loading} onPress={onSubmit} disabled={!isConnected} style={styles.submit} />
            <Text style={styles.footer}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => router.replace('/(auth)/login')}>
                Log in
              </Text>
            </Text>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.verify} keyboardShouldPersistTaps="handled">
            <View style={styles.verifyCard}>
              <MailIcon size={26} />
              <Text style={styles.verifyTitle}>Check your email</Text>
              <Text style={styles.verifyCopy}>
                We sent a verification code to {email.trim()}. Enter it below to finish creating your account.
              </Text>
              <OtpInput value={otp} onChange={setOtp} error={Boolean(error)} />
              <Button
                label="Verify email"
                loading={loading}
                onPress={onVerify}
                disabled={!isConnected || otp.trim().length < OTP_LENGTH}
                style={styles.verifyBtn}
              />
              <Button
                label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                variant="secondary"
                onPress={onResend}
                disabled={!isConnected || loading || cooldown > 0}
                style={styles.resend}
              />
              {__DEV__ ? (
                <Button label="Simulate: I verified" loading={loading} onPress={onDevSimulate} style={styles.simulate} />
              ) : null}
            </View>
            {error ? <AlertBanner variant="error" title="We couldn't complete that" message={error} /> : null}
          </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 30,
  },
  verifyCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
    borderRadius: Radius.md,
    padding: 18,
    alignItems: 'center',
    gap: 12,
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
  verifyBtn: { alignSelf: 'stretch', marginTop: 4 },
  resend: { alignSelf: 'stretch' },
  simulate: { alignSelf: 'stretch' },
});
