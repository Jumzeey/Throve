import { OfflineBanner, AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ChevronBackIcon, SpinnerArcIcon, VideoIcon } from '@/components/ui/icons';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { apiFetch } from '@/lib/api';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AccessState = 'checking' | 'denied' | 'allowed' | 'error' | 'offline';

export default function HostAccessScreen() {
  const router = useRouter();
  const { top, bottom } = useScreenInsets();
  const { session, isReady, refreshSession } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [checkKey, setCheckKey] = useState(0);

  const checkAccess = useCallback(async () => {
    if (!isReady) return;
    if (!isConnected) {
      setAccessState('offline');
      return;
    }
    setAccessState('checking');
    try {
      const data = await apiFetch<{ canHostLive: boolean }>('/live/host-access');
      if (data.canHostLive) {
        await refreshSession();
        setAccessState('allowed');
        return;
      }
      setAccessState('denied');
    } catch {
      setAccessState('error');
    }
  }, [isConnected, isReady, refreshSession]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess, checkKey]);

  useEffect(() => {
    if (!isConnected && accessState !== 'checking') {
      setAccessState('offline');
    }
  }, [accessState, isConnected]);

  if (!isReady) {
    return (
      <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
        <StatusBar style="light" />
        <View style={styles.checkingBox}>
          <SpinnerArcIcon size={22} color={Palette.blush} />
          <Text style={styles.checkingTitle}>Checking your live access...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (accessState === 'allowed') {
    return <Redirect href="/live/my-sessions" />;
  }

  if (accessState === 'checking') {
    return (
      <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
        <StatusBar style="light" />
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ChevronBackIcon color={Palette.ivory} />
        </Pressable>
        <View style={styles.checkingBox}>
          <SpinnerArcIcon size={22} color={Palette.blush} />
          <Text style={styles.checkingTitle}>Checking your live access...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
      <StatusBar style="light" />
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <ChevronBackIcon color={Palette.ivory} />
      </Pressable>

      <View style={styles.center}>
        {accessState === 'offline' ? (
          <OfflineBanner
            title="No connection"
            message="Reconnect to check your live access."
            style={styles.banner}
          />
        ) : null}

        {accessState === 'error' ? (
          <AlertBanner
            variant="error"
            title="We couldn't check your live access"
            message="Please try again in a moment."
            style={styles.banner}
          />
        ) : null}

        {accessState === 'denied' ? (
          <>
            <View style={styles.iconCircle}>
              <VideoIcon size={26} color={Palette.blush} />
            </View>
            <Text style={styles.title}>Live hosting is{'\n'}invitation only</Text>
            <Text style={styles.copy}>
              While Throve Live is in its early phase, only invited sellers can host a live session. Keep listing and
              selling as usual. Hosting access may expand in the future.
            </Text>
            <Button
              label="Back to selling"
              variant="dark"
              onPress={() => router.replace('/(tabs)/sell')}
              style={styles.primary}
            />
            <Pressable onPress={() => router.replace('/(tabs)')} style={styles.homeBtn}>
              <Text style={styles.homeBtnLabel}>Go to Home</Text>
            </Pressable>
          </>
        ) : null}

        {accessState === 'error' ? (
          <>
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => setCheckKey((n) => n + 1)}
              style={styles.primary}
            />
            <Button label="Start live · unavailable" disabled style={styles.disabled} />
            <Text style={styles.hint}>Live can't start until access is confirmed.</Text>
          </>
        ) : null}

        {accessState === 'offline' ? (
          <>
            <View style={styles.iconCircle}>
              <VideoIcon size={26} color={Palette.blush} />
            </View>
            <Text style={styles.title}>Live hosting is{'\n'}invitation only</Text>
            <Text style={styles.copy}>
              While Throve Live is in its early phase, only invited sellers can host a live session. Keep listing and
              selling as usual. Hosting access may expand in the future.
            </Text>
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => setCheckKey((n) => n + 1)}
              style={styles.primary}
            />
            <Button label="Start live · unavailable" disabled style={styles.disabled} />
            <Text style={styles.hint}>Live can't start until access is confirmed.</Text>
          </>
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
  checkingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
    marginBottom: 4,
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
  homeBtn: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.32)',
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnLabel: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  disabled: {
    width: '100%',
    minHeight: 50,
  },
  hint: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.5)',
  },
});
