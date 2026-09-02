import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SplashScreen } from '@/components/ui/splash-screen';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, isReady, isAuthenticatingLink } = useAuth();
  const { isConnected } = useNetworkStatus();

  if (!isReady || isAuthenticatingLink) {
    return <SplashScreen />;
  }
  if (session?.setupComplete) {
    return <Redirect href="/(tabs)" />;
  }
  if (session) {
    return <Redirect href="/(auth)/setup" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <Text style={styles.wordmark}>throve</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.headline}>Curated{'\n'}secondhand{'\n'}fashion.</Text>
        <Text style={styles.sub}>
          Buy and sell pre-loved fashion and beauty — browse listings, make offers, and shop live.
        </Text>
      </View>
      <View style={styles.actions}>
        {!isConnected ? (
          <OfflineBanner
            title="No connection"
            message="You're offline. Create account and Log in will work again once you reconnect."
          />
        ) : null}
        <Button
          label="Create account"
          onPress={() => router.push('/(auth)/signup')}
          disabled={!isConnected}
        />
        <Button
          label="Log in"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
          disabled={!isConnected}
        />
        <Text style={styles.legal}>
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
    paddingHorizontal: 28,
  },
  top: { paddingTop: 48, paddingBottom: 32 },
  wordmark: {
    fontFamily: Typography.display,
    fontSize: 44,
    lineHeight: 44,
    color: Palette.plum,
    letterSpacing: -0.3,
  },
  hero: { flex: 1, justifyContent: 'center', gap: 16 },
  headline: {
    fontFamily: Typography.display,
    fontSize: 38,
    lineHeight: 42,
    color: Palette.espresso,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Typography.body,
    color: Palette.body,
    maxWidth: 300,
  },
  actions: { gap: 11 },
  legal: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: Palette.muted,
    fontFamily: Typography.body,
    marginTop: 6,
  },
});
