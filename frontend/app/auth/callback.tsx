import { SplashScreen } from '@/components/ui/splash-screen';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Handles throveapp://auth/callback deep links from Mailjet magic-link emails.
 * Keeps the Throve splash visible while verifying the link and loading the profile.
 */
export default function AuthCallbackScreen() {
  const toast = useToast();
  const inboundUrl = Linking.useURL();
  const { session, isReady, isAuthenticatingLink, finishAuthFromUrl } = useAuth();
  const [url, setUrl] = useState<string | null>(inboundUrl);
  const [failed, setFailed] = useState(false);
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
          toast.error("We couldn't sign you in", err instanceof Error ? err.message : 'Could not complete sign-in.');
          setFailed(true);
          setDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, finishAuthFromUrl]);

  // Keep splash up for cold start, profile hydrate, and in-flight deep link auth.
  if (url === null || !isReady || isAuthenticatingLink || (!done && url.includes('auth/callback'))) {
    return <SplashScreen />;
  }

  if (!url.includes('auth/callback')) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (failed) return <Redirect href="/(auth)/login" />;
  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;
  return <Redirect href="/(auth)/welcome" />;
}
