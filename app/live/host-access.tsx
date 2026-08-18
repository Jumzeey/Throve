import { Button } from '@/components/ui/button';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HostAccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.lock}>🔒</Text>
      <Text style={styles.title}>Live hosting is invite-only</Text>
      <Text style={styles.copy}>
        Throve is currently rolling out live-shopping hosting to a small group of approved sellers. There's no application to fill
        out — approved sellers are notified directly.
      </Text>
      <Button label="Back to Sell" onPress={() => router.replace('/(tabs)/sell')} style={styles.primary} />
      <Button label="Back to Home" variant="secondary" onPress={() => router.replace('/(tabs)')} style={styles.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  lock: {
    fontSize: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
    textAlign: 'center',
  },
  copy: {
    fontSize: 13,
    lineHeight: 21,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  primary: {
    marginTop: 6,
    width: '100%',
    height: 46,
  },
  secondary: {
    width: '100%',
    height: 44,
  },
});
