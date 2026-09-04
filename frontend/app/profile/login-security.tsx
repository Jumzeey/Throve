import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { PreferredLoginMethod } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { getDeviceLoginPreference } from '@/lib/login-preference';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LoginSecurityScreen() {
  const router = useRouter();
  const { session, updatePreferredLoginMethod } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [method, setMethod] = useState<PreferredLoginMethod>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const hasPassword = Boolean(session.hasPassword);

  async function onSelectMethod(next: PreferredLoginMethod) {
    if (!isConnected || busy || next === method) return;

    if (next === 'password' && !hasPassword) {
      router.push({
        pathname: '/(auth)/set-password',
        params: { email: session!.email, purpose: 'setup' },
      });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updatePreferredLoginMethod(next);
      setMethod(next);
    } catch {
      setError('Could not update your sign-in preference.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Login & security" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        {!isConnected ? <OfflineBanner message="Reconnect to manage sign-in settings." /> : null}
        {error ? <AlertBanner variant="error" title="Something went wrong" message={error} /> : null}

        <Text style={styles.sectionTitle}>Preferred sign-in</Text>
        <Text style={styles.lead}>
          Choose how you usually sign in on this device. Email and password is the default. This is saved on your phone
          for next time you log in.
        </Text>

        <View style={styles.group}>
          <MethodRow
            title="Email & password"
            hint="Sign in with your email and a password"
            selected={method === 'password'}
            onPress={() => onSelectMethod('password')}
            disabled={!isConnected || busy}
          />
          <MethodRow
            title="Magic link"
            hint="We’ll email you a one-tap sign-in link"
            selected={method === 'magic_link'}
            onPress={() => onSelectMethod('magic_link')}
            disabled={!isConnected || busy}
            last
          />
        </View>

        <Text style={styles.sectionTitle}>Password</Text>
        <View style={styles.group}>
          {hasPassword ? (
            <Pressable
              style={[styles.row, styles.rowLast]}
              disabled={!isConnected}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/set-password',
                  params: { email: session.email, purpose: 'change' },
                })
              }
            >
              <View style={styles.copy}>
                <Text style={styles.rowLabel}>Change password</Text>
                <Text style={styles.rowHint}>Verify with a code, then choose a new password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.muted2} />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.row, styles.rowLast]}
              disabled={!isConnected}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/set-password',
                  params: { email: session.email, purpose: 'setup' },
                })
              }
            >
              <View style={styles.copy}>
                <Text style={styles.rowLabel}>Set up password</Text>
                <Text style={styles.rowHint}>Required to use email and password sign-in</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.muted2} />
            </Pressable>
          )}
        </View>

        {!hasPassword ? (
          <AlertBanner
            variant="info"
            title="Password not set yet"
            message="This account was created with a magic link. Set a password to use email and password as your default."
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function MethodRow({
  title,
  hint,
  selected,
  onPress,
  disabled,
  last,
}: {
  title: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.row, last ? styles.rowLast : null]}>
      <View style={styles.copy}>
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
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.xl,
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  lead: {
    paddingHorizontal: Spacing.xl,
    marginTop: -8,
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  group: {
    paddingHorizontal: Spacing.xl,
    backgroundColor: Palette.ivoryElevated,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    gap: Spacing.md,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
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
});
