import { OtpInput } from '@/components/auth/otp-input';
import { PasswordField } from '@/components/auth/password-field';
import { PasswordRequirements } from '@/components/auth/password-requirements';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { MailIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { validatePassword } from '@/lib/password';
import { OTP_LENGTH } from '@/lib/otp';
import { isValidEmail } from '@/lib/validation';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Stage = 'otp' | 'password' | 'done';
type Purpose = 'setup' | 'change';

const RESEND_COOLDOWN_SEC = 30;

export default function SetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const { session, sendPasswordOtp, setPasswordWithOtp } = useAuth();
  const { isConnected } = useNetworkStatus();

  const purpose: Purpose = params.purpose === 'change' ? 'change' : 'setup';
  const initialEmail = (typeof params.email === 'string' ? params.email : session?.email ?? '').trim();

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState<Stage>('otp');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didAutoSend = useRef(false);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    if (didAutoSend.current) return;
    if (initialEmail && isConnected) {
      didAutoSend.current = true;
      void sendCode(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

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

  async function sendCode(target = email, isResend = false) {
    if (!isConnected) return;
    if (isResend && cooldown > 0) return;
    setError('');
    setInfo('');
    const trimmed = target.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await sendPasswordOtp(trimmed, purpose);
      setEmail(trimmed);
      setOtpSent(true);
      startCooldown();
      if (isResend) {
        setOtp('');
        setInfo('A new code is on its way. Check your inbox and spam folder.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  function onContinueOtp() {
    setError('');
    if (otp.trim().length < OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    setStage('password');
  }

  async function onSavePassword() {
    if (!isConnected) return;
    setError('');
    const next: Record<string, string> = {};
    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await setPasswordWithOtp({ email, otp, password, purpose });
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  function onBack() {
    if (stage === 'password') {
      setStage('otp');
      setError('');
      return;
    }
    if (stage === 'done') {
      finish();
      return;
    }
    router.back();
  }

  function finish() {
    if (session?.setupComplete || purpose === 'change') {
      router.replace(purpose === 'change' ? '/profile/login-security' : '/(tabs)');
      return;
    }
    if (session) {
      router.replace('/(auth)/setup');
      return;
    }
    router.replace('/(auth)/login');
  }

  if (session?.setupComplete && purpose === 'setup' && stage === 'done') {
    return <Redirect href="/(tabs)" />;
  }

  const resendDisabled = !isConnected || loading || cooldown > 0;
  const resendLabel = cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="" onBack={onBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {stage === 'otp' ? (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>{purpose === 'change' ? 'Confirm it’s you' : 'Set up your\npassword'}</Text>
            <Text style={styles.lead}>
              {purpose === 'change'
                ? 'We’ll email a one-time code to verify before you change your password.'
                : 'Existing accounts need a password. We’ll email a one-time code to verify it’s you.'}
            </Text>
            {!isConnected ? <OfflineBanner message="Reconnect to continue." /> : null}

            {!otpSent ? (
              <>
                {!session ? (
                  <TextField
                    label="Email address"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    error={fieldErrors.email}
                  />
                ) : (
                  <View style={styles.emailCard}>
                    <Text style={styles.emailCardLabel}>Sending to</Text>
                    <Text style={styles.emailCardValue}>{email}</Text>
                  </View>
                )}
                {error ? <AlertBanner variant="error" title="Couldn’t continue" message={error} style={styles.banner} /> : null}
                <Button label="Send code" loading={loading} onPress={() => sendCode()} disabled={!isConnected} style={styles.submit} />
              </>
            ) : (
              <>
                <View style={styles.sentCard}>
                  <View style={styles.sentIcon}>
                    <MailIcon size={22} />
                  </View>
                  <View style={styles.sentCopy}>
                    <Text style={styles.sentTitle}>Check your email</Text>
                    <Text style={styles.sentBody}>
                      We sent an {OTP_LENGTH}-digit code to{'\n'}
                      <Text style={styles.sentEmail}>{email}</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.otpBlock}>
                  <Text style={styles.otpLabel}>Verification code</Text>
                  <OtpInput value={otp} onChange={setOtp} error={Boolean(error)} />
                </View>

                {info ? <AlertBanner variant="info" title="Code resent" message={info} style={styles.banner} /> : null}
                {error ? <AlertBanner variant="error" title="Couldn’t continue" message={error} style={styles.banner} /> : null}

                <Button
                  label="Continue"
                  loading={loading}
                  onPress={onContinueOtp}
                  disabled={!isConnected || otp.trim().length < OTP_LENGTH}
                  style={styles.submit}
                />

                <Pressable
                  onPress={() => sendCode(email, true)}
                  disabled={resendDisabled}
                  style={styles.resendWrap}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: resendDisabled }}
                >
                  <Text style={[styles.resendText, resendDisabled ? styles.resendDisabled : null]}>{resendLabel}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        ) : null}

        {stage === 'password' ? (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>{purpose === 'change' ? 'Choose a new\npassword' : 'Create your\npassword'}</Text>
            <Text style={styles.lead}>Use a strong password you don’t reuse elsewhere.</Text>
            {!isConnected ? <OfflineBanner message="Reconnect to save your password." /> : null}
            <View style={styles.fields}>
              <PasswordField label="Password" value={password} onChangeText={setPassword} error={fieldErrors.password} />
              <PasswordStrengthMeter password={password} />
              <PasswordRequirements password={password} />
              <PasswordField label="Confirm password" value={confirm} onChangeText={setConfirm} error={fieldErrors.confirm} />
            </View>
            {error ? <AlertBanner variant="error" title="Couldn’t save password" message={error} style={styles.banner} /> : null}
            <Button label="Save password" loading={loading} onPress={onSavePassword} disabled={!isConnected} style={styles.submit} />
          </ScrollView>
        ) : null}

        {stage === 'done' ? (
          <View style={styles.done}>
            <View style={styles.doneCard}>
              <MailIcon size={26} />
              <Text style={styles.doneTitle}>Password ready</Text>
              <Text style={styles.doneCopy}>
                {purpose === 'change'
                  ? 'Your password has been updated. You can use it the next time you sign in.'
                  : 'Your password is set. You can sign in with email and password from now on.'}
              </Text>
              <Button label="Continue" onPress={finish} style={styles.doneBtn} />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  flex: { flex: 1 },
  form: { paddingHorizontal: 24, paddingBottom: 40 },
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
    marginBottom: 28,
  },
  emailCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  emailCardLabel: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  emailCardValue: {
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  sentCard: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 28,
    alignItems: 'flex-start',
  },
  sentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentCopy: { flex: 1, gap: 4 },
  sentTitle: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  sentBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  sentEmail: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  otpBlock: { gap: 10 },
  otpLabel: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  fields: { gap: 16 },
  banner: { marginTop: Spacing.md },
  submit: { marginTop: 24 },
  resendWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resendText: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  resendDisabled: {
    color: Palette.muted3,
  },
  done: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  doneCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.md,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  doneTitle: {
    fontSize: 22,
    fontFamily: Typography.display,
    color: Palette.espresso,
    marginTop: 4,
  },
  doneCopy: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
    textAlign: 'center',
  },
  doneBtn: { alignSelf: 'stretch', marginTop: 10 },
});
