import { useAuth } from '@/context/auth-context';
import { SplashScreen } from '@/components/ui/splash-screen';
import { authResumeHref } from '@/lib/session-persistence';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isReady, isAuthenticatingLink, session, authResume } = useAuth();

  if (!isReady || isAuthenticatingLink) {
    return <SplashScreen />;
  }
  if (session?.setupComplete) {
    return <Redirect href="/(tabs)" />;
  }
  if (session) {
    return <Redirect href="/(auth)/setup" />;
  }
  if (authResume) {
    return <Redirect href={authResumeHref(authResume)} />;
  }
  return <Redirect href="/(auth)/welcome" />;
}
