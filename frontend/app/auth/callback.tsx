import { SplashScreen } from '@/components/ui/splash-screen';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import * as Linking from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Handles throveapp://auth/callback deep links from Mailjet magic-link emails.
 * Keeps the Throve splash visible while verifying the link and loading the profile.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const inboundUrl = Linking.useURL();
  const { session, isReady, isAuthenticatingLink, finishAuthFromUrl } = useAuth();
  const [url, setUrl] = useState<string | null>(inboundUrl);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (inboundUrl) {
      setUrl(inboundUrl);
      return;
    }
    let cancelled = false;
    void Linking.getInitialURL().then((initial) => {
      if (!cancelled && initial) setUrl(initial);
      if (!cancelled && !initial) setUrl('');
    });
    return () => {
      cancelled = true;
    };
  }, [inboundUrl]);

  useEffect(() => {
    if (!url || !url.includes('auth/callback')) return;

    let cancelled = false;
    (async () => {
      try {
        await finishAuthFromUrl(url);
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
  }, [url, finishAuthFromUrl]);

  // Keep splash up for cold start, profile hydrate, and in-flight deep link auth.
  if (url === null || !isReady || isAuthenticatingLink || (!done && url.includes('auth/callback'))) {
    return <SplashScreen />;
  }

  if (!url.includes('auth/callback')) {
    return <Redirect href="/(auth)/welcome" />;
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
