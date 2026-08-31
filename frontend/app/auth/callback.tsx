import { SplashScreen } from '@/components/ui/splash-screen';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { completeAuthFromRedirectUrl } from '@/lib/auth-redirect';
import * as Linking from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Handles throveapp://auth/callback deep links from Supabase magic-link emails.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const { session, isReady } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!url?.includes('auth/callback')) return;

    let cancelled = false;
    (async () => {
      try {
        await completeAuthFromRedirectUrl(url);
        if (!cancelled) setDone(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not complete sign-in.');
          setDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url?.includes('auth/callback')) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!done || !isReady) {
    return <SplashScreen />;
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Sign-in link</Text>
        <AlertBanner variant="error" title="We couldn't sign you in" message={error} />
        <Text style={styles.link} onPress={() => router.replace('/(auth)/login')}>
          Back to log in
        </Text>
      </View>
    );
  }

  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;
  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 28,
    color: Palette.espresso,
  },
  link: {
    marginTop: 8,
    fontFamily: Typography.bodySemiBold,
    fontSize: 14,
    color: Palette.plum,
    textAlign: 'center',
  },
});
