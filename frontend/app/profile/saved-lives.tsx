import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { AppImage } from '@/components/ui/app-image';
import { EmptyState } from '@/components/ui/empty-state';
import { BookmarkIcon, ImagePlaceholderIcon } from '@/components/ui/icons';
import { LiquidRefreshFlatList, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useLive } from '@/context/live-context';
import { getLiveImage } from '@/data/images';
import type { LiveSession } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { formatLiveSchedule } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function sessionCover(session: LiveSession) {
  if (session.thumbnailUrl?.startsWith('http')) return session.thumbnailUrl;
  return getLiveImage(session.id);
}

function statusLabel(status: LiveSession['status']) {
  if (status === 'live') return 'LIVE';
  if (status === 'upcoming') return 'UPCOMING';
  return 'ENDED';
}

export default function SavedLivesScreen() {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const { savedLives, toggleSaveLive, refreshSavedLives } = useLive();
  const { isConnected } = useNetworkStatus();
  const [loadError, setLoadError] = useState(false);

  const pullTask = useCallback(async () => {
    setLoadError(false);
    try {
      await refreshSavedLives();
    } catch {
      setLoadError(true);
    }
  }, [refreshSavedLives]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  const listHeader = useMemo(
    () => (
      <>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to see your bookmarked lives." />
        ) : null}
        {loadError ? (
          <AlertBanner
            variant="error"
            title="We couldn't load your saved lives"
            message="Please try again in a moment."
          />
        ) : null}
      </>
    ),
    [isConnected, loadError],
  );

  const listEmpty = useMemo(
    () =>
      savedLives.length === 0 && !loadError ? (
        <EmptyState
          title="No bookmarked lives yet"
          message="Tap the bookmark on an upcoming live to keep it here. We'll remind you the morning of and 10 minutes before it starts."
          actionLabel="Browse upcoming lives"
          onAction={() => router.push('/(tabs)/live')}
          style={styles.empty}
        />
      ) : null,
    [loadError, router, savedLives.length],
  );

  const renderItem = useCallback(
    ({ item }: { item: LiveSession }) => (
      <SavedLiveRow
        session={item}
        onOpen={() => {
          if (item.status === 'live') {
            router.push(`/live/${item.id}`);
            return;
          }
          router.push({ pathname: '/seller/[username]', params: { username: item.host } });
        }}
        onUnsave={() => void toggleSaveLive(item.id)}
      />
    ),
    [router, toggleSaveLive],
  );

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Saved lives" onBack={() => router.back()} large />
      <Text style={styles.subtitle}>
        {savedLives.length} live{savedLives.length === 1 ? '' : 's'}
      </Text>

      <LiquidRefreshFlatList
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        data={savedLives}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[styles.body, { paddingBottom: sheetBottom + 24, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function SavedLiveRow({
  session,
  onOpen,
  onUnsave,
}: {
  session: LiveSession;
  onOpen: () => void;
  onUnsave: () => void;
}) {
  const when = formatLiveSchedule(session.scheduledAt);
  const cover = sessionCover(session);

  return (
    <Pressable onPress={onOpen} style={styles.row}>
      {cover ? (
        <AppImage source={cover} style={styles.thumb} />
      ) : (
        <View style={styles.placeholderThumb}>
          <ImagePlaceholderIcon size={22} color={Palette.muted3} />
        </View>
      )}
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {session.title}
          </Text>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onUnsave();
            }}
            hitSlop={8}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Remove bookmark"
          >
            <BookmarkIcon size={16} filled color={Palette.plum} />
          </Pressable>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {session.host}
          {when ? ` · ${when}` : ''}
        </Text>
        <Text style={[styles.status, session.status === 'live' && styles.statusLive]}>
          {statusLabel(session.status)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  subtitle: {
    paddingHorizontal: Spacing.xl,
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  empty: {
    marginTop: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
    backgroundColor: Palette.sand,
  },
  placeholderThumb: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  status: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    letterSpacing: 0.6,
    color: Palette.plum,
  },
  statusLive: {
    color: Palette.liveRed,
  },
});
