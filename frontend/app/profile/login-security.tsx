import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Dialog } from '@/components/ui/dialog';
import { LockIcon, MailIcon, SpinnerArcIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { PreferredLoginMethod } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { getDeviceLoginPreference } from '@/lib/login-preference';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Phase = 'idle' | 'confirm' | 'working' | 'done' | 'error';

export default function LoginSecurityScreen() {
  const router = useRouter();
  const { session, updatePreferredLoginMethod } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [method, setMethod] = useState<PreferredLoginMethod>('password');
  const [pending, setPending] = useState<PreferredLoginMethod | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const preferred = await getDeviceLoginPreference();
      if (!cancelled) setMethod(preferred);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session?.preferredLoginMethod) setMethod(session.preferredLoginMethod);
  }, [session?.preferredLoginMethod]);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const hasPassword = Boolean(session.hasPassword);
  const isMagic = method === 'magic_link';

  function requestSwitch(next: PreferredLoginMethod) {
    if (!isConnected || phase === 'working' || next === method) return;
    if (next === 'password' && !hasPassword) {
      router.push({
        pathname: '/(auth)/set-password',
        params: { email: session.email, purpose: 'setup' },
      });
      return;
    }
    setPending(next);
    setPhase('confirm');
  }

  async function onConfirm() {
    if (!isConnected || !pending || phase === 'working') return;
    setPhase('working');
    try {
      await updatePreferredLoginMethod(pending);
      setMethod(pending);
      setPending(null);
      setPhase('done');
    } catch {
      setPhase('error');
    }
  }

  const target = pending ?? (isMagic ? 'password' : 'magic_link');
  const confirmCopy =
    target === 'password'
      ? {
          title: 'Switch to password sign-in?',
          body: `Next time you log in, you'll use your email and password for ${session.email}.`,
          confirm: 'Use password',
        }
      : {
          title: 'Switch to email link sign-in?',
          body: `Next time you log in, Throve will send a sign-in link to ${session.email}.`,
          confirm: 'Use email link',
        };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Sign-in and security" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to change your account settings." />
        ) : null}

        {phase === 'error' ? (
          <AlertBanner
            variant="error"
            title="We couldn't update sign-in"
            message="Your preference is unchanged. Please try again in a moment."
          />
        ) : null}

        {phase === 'done' ? (
          <AlertBanner
            variant="success"
            title="Sign-in preference updated"
            message={
              isMagic
                ? 'Next time, Throve will send you an email link.'
                : 'Next time, you can sign in with your email and password.'
            }
          />
        ) : null}

        <Text style={styles.lead}>
          Choose how you usually sign in on this device. This is saved for the next time you log in.
        </Text>

        <View style={styles.card}>
          <View style={styles.current}>
            {isMagic ? <MailIcon size={18} color={Palette.plum} /> : <LockIcon size={18} color={Palette.plum} />}
            <View style={styles.currentCopy}>
              <Text style={styles.currentTitle}>
                {isMagic ? 'You sign in with an email link' : 'You sign in with a password'}
              </Text>
              <Text style={styles.currentBody}>
                {isMagic
                  ? `Throve sends a sign-in link to ${session.email}.`
                  : `You use your email and password for ${session.email}.`}
              </Text>
            </View>
          </View>

          <MethodOption
            title="Email & password"
            hint="Sign in with your email and a password"
            selected={!isMagic}
            icon={<LockIcon size={16} color={Palette.plum} />}
            disabled={!isConnected || phase === 'working'}
            onPress={() => requestSwitch('password')}
          />
          <MethodOption
            title="Email link"
            hint="We’ll email you a one-tap sign-in link"
            selected={isMagic}
            icon={<MailIcon size={16} color={Palette.plum} />}
            disabled={!isConnected || phase === 'working'}
            onPress={() => requestSwitch('magic_link')}
            last
          />
        </View>

        {phase === 'working' ? (
          <View style={styles.working}>
            <SpinnerArcIcon size={16} color={Palette.plum} />
            <Text style={styles.workingText}>Updating sign-in…</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Password</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.passwordRow}
            disabled={!isConnected || phase === 'working'}
            onPress={() =>
              router.push({
                pathname: '/(auth)/set-password',
                params: { email: session.email, purpose: hasPassword ? 'change' : 'setup' },
              })
            }
          >
            <View style={styles.currentCopy}>
              <Text style={styles.rowLabel}>{hasPassword ? 'Change password' : 'Set up password'}</Text>
              <Text style={styles.rowHint}>
                {hasPassword
                  ? 'Verify with a code, then choose a new password'
                  : 'Required before you can switch to password sign-in'}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Dialog
        visible={phase === 'confirm'}
        title={confirmCopy.title}
        body={confirmCopy.body}
        onClose={() => {
          setPending(null);
          setPhase('idle');
        }}
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => {
              setPending(null);
              setPhase('idle');
            },
          },
          {
            label: confirmCopy.confirm,
            variant: 'primary',
            onPress: () => void onConfirm(),
          },
        ]}
      />
    </View>
  );
}

function MethodOption({
  title,
  hint,
  selected,
  icon,
  onPress,
  disabled,
  last,
}: {
  title: string;
  hint: string;
  selected: boolean;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || selected}
      style={[styles.option, last ? styles.optionLast : null, selected ? styles.optionSelected : null]}
    >
      {icon}
      <View style={styles.currentCopy}>
        <Text style={styles.rowLabel}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <View style={[styles.radio, selected ? styles.radioSelected : null]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  lead: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  card: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  current: {
    flexDirection: 'row',
    gap: 11,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  currentCopy: { flex: 1, gap: 2 },
  currentTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  currentBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  optionLast: { borderBottomWidth: 0 },
  optionSelected: {
    backgroundColor: Palette.ivory,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  rowHint: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    lineHeight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Palette.plum,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
    backgroundColor: Palette.plum,
  },
  working: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  workingText: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    marginTop: 4,
  },
  passwordRow: {
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
});
