import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { AppImage } from '@/components/ui/app-image';
import { ChevronBackIcon, SpinnerArcIcon, VideoIcon } from '@/components/ui/icons';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useLive } from '@/context/live-context';
import { getLiveImage } from '@/data/images';
import type { LiveSession } from '@/data/types';
import { formatLiveSchedule } from '@/lib/format';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { apiFetch } from '@/lib/api';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const IVORY_70 = 'rgba(255,247,240,0.7)';
const IVORY_55 = 'rgba(255,247,240,0.55)';

function sessionMedia(session: LiveSession) {
  if (session.thumbnailUrl?.startsWith('http')) return session.thumbnailUrl;
  return getLiveImage(session.id);
}

export default function MyLiveSessionsScreen() {
  const router = useRouter();
  const { top, bottom } = useScreenInsets();
  const { session, isReady, refreshSession } = useAuth();
  const { isConnected } = useNetworkStatus();
  const live = useLive();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking');
  const [busyId, setBusyId] = useState<string | null>(null);

  const username = session?.username ?? '';

  const mineLive = useMemo(
    () => live.liveNow.filter((item) => item.host === username),
    [live.liveNow, username],
  );
  const mineUpcoming = useMemo(
    () => live.upcoming.filter((item) => item.host === username),
    [live.upcoming, username],
  );
  const mineEnded = useMemo(
    () => live.recentlyEnded.filter((item) => item.host === username),
    [live.recentlyEnded, username],
  );

  const checkAccess = useCallback(async () => {
    if (!isReady || !session) return;
    if (!isConnected) {
      setAccess('error');
      return;
    }
    if (session.canHostLive) {
      setAccess('allowed');
      return;
    }
    setAccess('checking');
    try {
      const data = await apiFetch<{ canHostLive: boolean }>('/live/host-access');
      if (data.canHostLive) {
        await refreshSession();
        setAccess('allowed');
        return;
      }
      setAccess('denied');
    } catch {
      setAccess('error');
    }
  }, [isConnected, isReady, refreshSession, session]);

  useFocusEffect(
    useCallback(() => {
      void checkAccess();
      void live.refresh();
    }, [checkAccess, live.refresh]),
  );

  const pullTask = useCallback(async () => {
    await Promise.all([checkAccess(), live.refresh()]);
  }, [checkAccess, live.refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  const enterLive = useCallback(
    async (item: LiveSession) => {
      setBusyId(item.id);
      try {
        if (item.status === 'upcoming') {
          await live.goLiveNow(item.id);
        } else {
          live.resumeBroadcast(item.id);
        }
        router.push('/live/broadcast');
      } catch {
        Alert.alert('Couldn’t open live', 'Please try again in a moment.');
      } finally {
        setBusyId(null);
      }
    },
    [live, router],
  );

  const endSession = useCallback(
    (item: LiveSession) => {
      Alert.alert('End this live?', 'Viewers will be disconnected and the session will close.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End live',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyId(item.id);
              try {
                const summary = await live.endLive(item.id, { reason: 'host' });
                await live.refresh();
                router.push({
                  pathname: '/live/summary',
                  params: {
                    title: summary.title,
                    durationMinutes: String(summary.durationMinutes),
                    peakViewers: String(summary.peakViewers),
                    productsShown: String(summary.productsShown),
                    productsSold: String(summary.productsSold),
                    reason: 'host',
                  },
                });
              } catch {
                Alert.alert('Couldn’t end live', 'Please try again.');
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ]);
    },
    [live, router],
  );

  if (!isReady) {
    return (
      <View style={[styles.screen, { paddingTop: top }]}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <SpinnerArcIcon size={22} color={Palette.blush} />
        </View>
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;

  if (access === 'denied') {
    return <Redirect href="/live/host-access" />;
  }

  const empty = mineLive.length === 0 && mineUpcoming.length === 0 && mineEnded.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <ChevronBackIcon color={Palette.ivory} />
        </Pressable>
        <Text style={styles.title}>My live sessions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={[styles.body, { paddingBottom: bottom + 28 }]}
      >
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to manage your lives." style={styles.banner} />
        ) : null}

        {access === 'error' ? (
          <AlertBanner
            variant="error"
            title="We couldn’t check live access"
            message="Pull to refresh, or try again."
            style={styles.banner}
          />
        ) : null}

        {access === 'checking' || (live.loading && empty && !refreshing) ? (
          <View style={styles.loadingBox}>
            <SpinnerArcIcon size={22} color={Palette.blush} />
            <Text style={styles.loadingText}>Loading your sessions…</Text>
          </View>
        ) : (
          <>
            <Button
              label="Create new live"
              variant="dark"
              onPress={() => router.push('/live/prepare')}
              style={styles.createBtn}
            />

            {empty ? (
              <View style={styles.empty}>
                <VideoIcon size={28} color={IVORY_55} />
                <Text style={styles.emptyTitle}>No lives yet</Text>
                <Text style={styles.emptyCopy}>
                  Start a live now, or schedule one. Ongoing sessions will show here so you can re-enter or end them.
                </Text>
              </View>
            ) : null}

            {mineLive.length > 0 ? (
              <Section title="Live now">
                {mineLive.map((item) => (
                  <HostSessionCard
                    key={item.id}
                    session={item}
                    busy={busyId === item.id}
                    primaryLabel="Enter live"
                    onPrimary={() => void enterLive(item)}
                    secondaryLabel="End live"
                    onSecondary={() => endSession(item)}
                  />
                ))}
              </Section>
            ) : null}

            {mineUpcoming.length > 0 ? (
              <Section title="Upcoming">
                {mineUpcoming.map((item) => (
                  <HostSessionCard
                    key={item.id}
                    session={item}
                    busy={busyId === item.id}
                    primaryLabel="Go live now"
                    onPrimary={() => void enterLive(item)}
                  />
                ))}
              </Section>
            ) : null}

            {mineEnded.length > 0 ? (
              <Section title="Recently ended">
                {mineEnded.map((item) => (
                  <HostSessionCard
                    key={item.id}
                    session={item}
                    busy={false}
                    primaryLabel="View"
                    onPrimary={() =>
                      router.push({
                        pathname: '/live/summary',
                        params: {
                          title: item.title,
                          durationMinutes: '1',
                          peakViewers: String(item.peakViewers ?? item.viewers ?? 0),
                          productsShown: String(item.productsShown ?? item.products?.length ?? 0),
                          productsSold: '0',
                          reason: 'host',
                        },
                      })
                    }
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </LiquidRefreshScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionList}>{children}</View>
    </View>
  );
}

function HostSessionCard({
  session,
  busy,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  session: LiveSession;
  busy: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const meta =
    session.status === 'live'
      ? `${session.viewers ?? 0} watching`
      : session.status === 'upcoming'
        ? formatLiveSchedule(session.scheduledAt) || 'Scheduled'
        : session.endedAt
          ? `Ended · ${formatLiveSchedule(session.endedAt)}`
          : 'Ended';

  return (
    <View style={styles.card}>
      <AppImage source={sessionMedia(session)} style={styles.thumb} />
      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              session.status === 'live'
                ? styles.badgeLive
                : session.status === 'upcoming'
                  ? styles.badgeUpcoming
                  : styles.badgeEnded,
            ]}
          >
            <Text style={styles.badgeText}>
              {session.status === 'live' ? 'LIVE' : session.status === 'upcoming' ? 'UPCOMING' : 'ENDED'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {session.title}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {meta}
        </Text>
        <View style={styles.actions}>
          <Button
            label={busy ? '…' : primaryLabel}
            variant="dark"
            disabled={busy}
            onPress={onPrimary}
            style={styles.actionBtn}
          />
          {secondaryLabel && onSecondary ? (
            <Button
              label={secondaryLabel}
              variant="secondary"
              disabled={busy}
              onPress={onSecondary}
              style={styles.actionBtn}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.liveDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 40 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.display,
    fontSize: 22,
    color: Palette.ivory,
  },
  body: { paddingHorizontal: 16, gap: 18 },
  banner: { marginBottom: 4 },
  createBtn: { minHeight: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingBox: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 },
  loadingText: { fontFamily: Typography.body, fontSize: 13, color: IVORY_70 },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,247,240,0.2)',
    borderRadius: Radius.lg,
  },
  emptyTitle: { fontFamily: Typography.bodySemiBold, fontSize: 16, color: Palette.ivory },
  emptyCopy: {
    fontFamily: Typography.body,
    fontSize: 13,
    lineHeight: 20,
    color: IVORY_55,
    textAlign: 'center',
  },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: Typography.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: IVORY_55,
  },
  sectionList: { gap: 12 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,247,240,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.1)',
  },
  thumb: {
    width: 84,
    height: 106,
    borderRadius: Radius.sm,
    backgroundColor: Palette.liveDarkAlt,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 6 },
  badgeRow: { flexDirection: 'row' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeLive: { backgroundColor: Palette.liveRed },
  badgeUpcoming: { backgroundColor: 'rgba(255,247,240,0.16)' },
  badgeEnded: { backgroundColor: 'rgba(255,247,240,0.1)' },
  badgeText: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    color: Palette.ivory,
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontFamily: Typography.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: Palette.ivory,
  },
  cardMeta: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: IVORY_55,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, minHeight: 40 },
});
