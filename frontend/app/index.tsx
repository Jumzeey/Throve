import { useAuth } from '@/context/auth-context';
import { SplashScreen } from '@/components/ui/splash-screen';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isReady, isAuthenticatingLink, session } = useAuth();

  if (!isReady || isAuthenticatingLink) {
    return <SplashScreen />;
  }
  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (!session.setupComplete) {
    return <Redirect href="/(auth)/setup" />;
  }
  return <Redirect href="/(tabs)" />;
}
