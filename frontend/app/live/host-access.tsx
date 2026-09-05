import { OfflineBanner, AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ChevronBackIcon, SpinnerArcIcon, VideoIcon } from '@/components/ui/icons';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AccessState = 'checking' | 'denied' | 'error' | 'offline';

export default function HostAccessScreen() {
  const router = useRouter();
  const { top, bottom } = useScreenInsets();
  const { session, isReady } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>('checking');

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => setAccessState('denied'), 500);
    return () => clearTimeout(timer);
  }, [isReady]);

  if (!isReady || accessState === 'checking') {
    return (
      <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ChevronBackIcon color={Palette.ivory} />
        </Pressable>
        <View style={styles.center}>
          <SpinnerArcIcon size={22} color={Palette.blush} />
          <Text style={styles.checkingTitle}>Checking your live access…</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (session.canHostLive) {
    return <Redirect href="/live/prepare" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <ChevronBackIcon color={Palette.ivory} />
      </Pressable>

      <View style={styles.center}>
        {accessState === 'offline' ? (
          <View style={styles.banner}>
            <OfflineBanner title="No connection" message="Reconnect to check your live access." />
          </View>
        ) : null}
        {accessState === 'error' ? (
          <AlertBanner
            variant="error"
            title="We couldn't check your live access"
            message="Please try again in a moment."
            style={styles.banner}
          />
        ) : null}

        <View style={styles.iconCircle}>
          <VideoIcon size={26} color={Palette.blush} />
        </View>
        <Text style={styles.title}>Live hosting is{'\n'}invitation only</Text>
        <Text style={styles.copy}>
          While Throve Live is in its early phase, only invited sellers can host a live session. Keep listing and
          selling as usual. Hosting access may expand in the future.
        </Text>

        {accessState === 'error' ? (
          <Button
            label="Try again"
            variant="secondary"
            onPress={() => setAccessState('checking')}
            style={styles.primary}
          />
        ) : (
          <Button label="Back to selling" variant="dark" onPress={() => router.replace('/(tabs)/sell')} style={styles.primary} />
        )}
        <Button label="Go to Home" variant="ghost" onPress={() => router.replace('/(tabs)')} style={styles.secondary} />
        {accessState === 'error' ? (
          <Button label="Start live · unavailable" disabled style={styles.disabled} />
        ) : null}
        {accessState === 'error' ? (
          <Text style={styles.hint}>Live can't start until access is confirmed.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.liveDark,
    paddingHorizontal: 28,
  },
  back: {
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 14,
    paddingBottom: 36,
  },
  banner: {
    width: '100%',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkingTitle: {
    marginTop: 9,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  title: {
    fontSize: 34,
    lineHeight: 37,
    fontFamily: Typography.display,
    color: Palette.ivory,
    marginTop: 8,
  },
  copy: {
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.72)',
    maxWidth: 320,
  },
  primary: {
    marginTop: 14,
    width: '100%',
    minHeight: 50,
  },
  secondary: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.32)',
    borderRadius: Radius.button,
  },
  disabled: {
    width: '100%',
    minHeight: 44,
  },
  hint: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
});
