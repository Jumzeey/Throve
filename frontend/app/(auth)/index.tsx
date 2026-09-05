import { useAuth } from '@/context/auth-context';
import { authResumeHref } from '@/lib/session-persistence';
import { Redirect } from 'expo-router';

export default function AuthIndex() {
  const { session, authResume } = useAuth();
  if (session?.setupComplete) return <Redirect href="/(tabs)" />;
  if (session) return <Redirect href="/(auth)/setup" />;
  if (authResume) return <Redirect href={authResumeHref(authResume)} />;
  return <Redirect href="/(auth)/welcome" />;
}
