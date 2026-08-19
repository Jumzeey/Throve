import { Button } from '@/components/ui/button';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  if (session?.setupComplete) {
    return <Redirect href="/(tabs)" />;
  }
  if (session) {
    return <Redirect href="/(auth)/setup" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <View style={styles.mark}>
          <Text style={styles.markText}>T</Text>
        </View>
        <Text style={styles.title}>Throve</Text>
        <Text style={styles.tagline}>Buy and sell fashion & beauty finds — pre-owned, new, and live.</Text>
        <View style={styles.actions}>
          <Button label="Create account" onPress={() => router.push('/(auth)/signup')} />
          <Button label="Log in" variant="secondary" onPress={() => router.push('/(auth)/login')} />
          <Button label="Browse as guest" variant="ghost" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  mark: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: Palette.accent,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 24,
    fontFamily: Typography.headingBold,
    color: Palette.accent700,
  },
  title: {
    fontSize: 38,
    fontFamily: Typography.headingBold,
    color: Palette.text,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  actions: {
    width: '100%',
    maxWidth: 260,
    marginTop: 8,
    gap: 10,
  },
});
