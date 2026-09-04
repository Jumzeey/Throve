import { AppImage } from '@/components/ui/app-image';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { CalendarIcon, EyeIcon, ImagePlaceholderIcon, UserIcon, VideoIcon } from '@/components/ui/icons';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { Palette, Radius, Typography } from '@/constants/theme';
import { getLiveImage } from '@/data/images';
import { useLive } from '@/context/live-context';
import type { LiveSession } from '@/data/types';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScreenInsets } from '@/hooks/use-screen-insets';

const IVORY_60 = 'rgba(255,247,240,0.6)';
const IVORY_55 = 'rgba(255,247,240,0.55)';
const IVORY_12 = 'rgba(255,247,240,0.12)';

export default function LiveDiscoveryScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const { liveNow, upcoming, loading, refresh } = useLive();
  const [error, setError] = useState<string | null>(null);

  const pullTask = useCallback(async () => {
    setError(null);
    try {
      await refresh();
    } catch {
      setError("We couldn't load live sessions");
    }
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  const featured = liveNow[0];
  const moreLive = liveNow.slice(1);

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Live</Text>
        <Text style={styles.subtitle}>Shop in real time with Throve sellers</Text>
      </View>

      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]}
      >
        {error ? (
          <AlertBanner variant="error" title={error} message="Please try again in a moment." style={styles.banner} />
        ) : null}

        {loading && !refreshing ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Palette.blush} />
            <View style={styles.loadingHero} />
            <View style={styles.loadingLine} />
            <View style={styles.loadingLineShort} />
          </View>
        ) : (
          <>
            <View style={styles.liveNowHeader}>
              <View style={styles.liveNowBadge}>
                <Text style={styles.liveNowBadgeText}>LIVE NOW</Text>
              </View>
              <Text style={styles.liveNowCount}>{liveNow.length} sessions</Text>
            </View>

            {liveNow.length === 0 ? (
              <View style={styles.emptyLive}>
                <VideoIcon size={24} color="rgba(255,247,240,0.4)" />
                <Text style={styles.emptyLiveTitle}>No one is live right now</Text>
                <Text style={styles.emptyLiveCopy}>See what's scheduled below.</Text>
              </View>
            ) : featured ? (
              <FeaturedLiveCard
                session={featured}
                onWatch={() => router.push(`/live/${featured.id}`)}
                onOpenHost={() =>
                  router.push({ pathname: '/seller/[username]', params: { username: featured.host } })
                }
              />
            ) : null}

            {moreLive.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
                {moreLive.map((session) => (
                  <CompactLiveCard
                    key={session.id}
                    session={session}
                    onPress={() => router.push(`/live/${session.id}`)}
                  />
                ))}
              </ScrollView>
            ) : null}

            <Text style={styles.upcomingTitle}>Upcoming lives</Text>
            {upcoming.length === 0 ? (
              <View style={styles.emptyUpcoming}>
                <Text style={styles.emptyUpcomingText}>Nothing scheduled yet. Check back soon.</Text>
              </View>
            ) : (
              upcoming.map((session) => (
                <UpcomingRow
                  key={session.id}
                  session={session}
                  onPress={() => router.push({ pathname: '/seller/[username]', params: { username: session.host } })}
                />
              ))
            )}
          </>
        )}

        {error ? (
          <Button label="Try again" variant="secondary" onPress={onRefresh} style={styles.retryBtn} />
        ) : null}
      </LiquidRefreshScrollView>
    </View>
  );
}

function FeaturedLiveCard({
  session,
  onWatch,
  onOpenHost,
}: {
  session: LiveSession;
  onWatch: () => void;
  onOpenHost: () => void;
}) {
  const pinned = session.products?.find((p) => p.isPinned) ?? session.products?.[0];
  return (
    <Pressable onPress={onWatch} style={styles.featuredCard}>
      <AppImage source={getLiveImage(session.id)} style={styles.featuredImage} />
      <View style={styles.featuredOverlay} />
      <View style={styles.featuredPlaceholder}>
        <VideoIcon size={30} color="rgba(255,247,240,0.3)" />
        <Text style={styles.featuredPlaceholderLabel}>Live video</Text>
      </View>
      <View style={styles.featuredTop}>
        <View style={styles.livePill}>
          <Text style={styles.livePillText}>LIVE</Text>
        </View>
        <View style={styles.viewerPill}>
          <EyeIcon size={11} />
          <Text style={styles.viewerPillText}>{session.viewers ?? 0}</Text>
        </View>
      </View>
      <View style={styles.featuredBottom}>
        <Text style={styles.featuredTitle}>{session.title}</Text>
        <View style={styles.hostRow}>
          <Pressable onPress={(e) => { e.stopPropagation(); onOpenHost(); }} style={styles.hostAvatar}>
            <UserIcon size={15} color={Palette.muted3} />
          </Pressable>
          <View style={styles.hostMeta}>
            <Text style={styles.hostName}>{session.host}</Text>
            <Text style={styles.hostDept}>
              {session.department ?? 'Live'}
              {pinned?.title ? ` · ${pinned.title.split(' ').slice(-1)[0]}` : ''}
            </Text>
          </View>
          <View style={styles.watchBtn}>
            <Text style={styles.watchBtnLabel}>Watch</Text>
          </View>
        </View>
        {pinned ? (
          <View style={styles.nowShowing}>
            <View style={styles.nowShowingThumb} />
            <View style={styles.nowShowingMeta}>
              <Text style={styles.nowShowingLabel} numberOfLines={1}>
                Now showing · {pinned.title ?? 'Featured item'}
              </Text>
              <Text style={styles.nowShowingPrice}>₦{Math.round(pinned.livePrice).toLocaleString('en-NG')}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function CompactLiveCard({ session, onPress }: { session: LiveSession; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.compactCard}>
      <View style={styles.compactThumbWrap}>
        <AppImage source={getLiveImage(session.id)} style={styles.compactThumb} />
        <View style={styles.compactLiveBadge}>
          <Text style={styles.compactLiveText}>LIVE</Text>
        </View>
        <Text style={styles.compactViewers}>{session.viewers ?? 0} watching</Text>
      </View>
      <Text style={styles.compactTitle} numberOfLines={2}>
        {session.title}
      </Text>
      <Text style={styles.compactSub}>
        {session.host} · {session.department ?? 'Live'}
      </Text>
    </Pressable>
  );
}

function UpcomingRow({ session, onPress }: { session: LiveSession; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.upcomingRow}>
      <View style={styles.upcomingThumb}>
        <ImagePlaceholderIcon size={16} color="rgba(255,247,240,0.3)" />
      </View>
      <View style={styles.upcomingMeta}>
        <Text style={styles.upcomingName}>{session.title}</Text>
        <Text style={styles.upcomingHost}>
          {session.host} · {session.department ?? 'Live'}
        </Text>
        {session.scheduledAt ? (
          <View style={styles.scheduleRow}>
            <CalendarIcon size={12} color={Palette.blush} />
            <Text style={styles.upcomingWhen}>{session.scheduledAt}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.liveDark,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontFamily: Typography.display,
    color: Palette.ivory,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: Typography.body,
    color: IVORY_60,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  banner: {
    marginBottom: 12,
  },
  loadingCard: {
    backgroundColor: Palette.liveDarkAlt,
    borderRadius: Radius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 10,
  },
  loadingHero: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.sm,
    backgroundColor: '#33232A',
  },
  loadingLine: {
    width: '100%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#33232A',
  },
  loadingLineShort: {
    width: '46%',
    height: 9,
    borderRadius: 4,
    backgroundColor: '#33232A',
  },
  liveNowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  liveNowBadge: {
    backgroundColor: Palette.liveRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  liveNowBadgeText: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 1,
    color: Palette.ivory,
  },
  liveNowCount: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: IVORY_60,
    fontVariant: ['tabular-nums'],
  },
  emptyLive: {
    backgroundColor: Palette.liveDarkAlt,
    borderRadius: Radius.lg,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyLiveTitle: {
    marginTop: 9,
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.ivory,
  },
  emptyLiveCopy: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: IVORY_60,
    textAlign: 'center',
  },
  featuredCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#463038',
    aspectRatio: 4 / 5,
    marginBottom: 14,
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // gradient simulated with layered views in RN - use dark overlays
  },
  featuredPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(27,17,19,0.35)',
  },
  featuredPlaceholderLabel: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,247,240,0.34)',
    fontFamily: Typography.bodySemiBold,
  },
  featuredTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 7,
  },
  livePill: {
    backgroundColor: Palette.liveRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  livePillText: {
    fontSize: 9.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 1,
    color: Palette.ivory,
  },
  viewerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(27,17,19,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  viewerPillText: {
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
    fontVariant: ['tabular-nums'],
  },
  featuredBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  featuredTitle: {
    fontSize: 24,
    lineHeight: 27,
    fontFamily: Typography.display,
    color: Palette.ivory,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 9,
  },
  hostAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Palette.border,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostMeta: {
    flex: 1,
    minWidth: 0,
  },
  hostName: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  hostDept: {
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.62)',
  },
  watchBtn: {
    backgroundColor: Palette.ivory,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  watchBtnLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.liveDark,
  },
  nowShowing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 11,
    backgroundColor: 'rgba(27,17,19,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.14)',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nowShowingThumb: {
    width: 34,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#5C4650',
  },
  nowShowingMeta: {
    flex: 1,
    minWidth: 0,
  },
  nowShowingLabel: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  nowShowingPrice: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
    fontVariant: ['tabular-nums'],
  },
  liveRow: {
    gap: 12,
    paddingBottom: 14,
  },
  compactCard: {
    width: 148,
  },
  compactThumbWrap: {
    aspectRatio: 3 / 4,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#463038',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactThumb: {
    ...StyleSheet.absoluteFillObject,
  },
  compactLiveBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: Palette.liveRed,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
  compactLiveText: {
    fontSize: 8.5,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.9,
    color: Palette.ivory,
  },
  compactViewers: {
    position: 'absolute',
    bottom: 9,
    left: 9,
    fontSize: 9.5,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.75)',
    fontVariant: ['tabular-nums'],
  },
  compactTitle: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  compactSub: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: Typography.body,
    color: IVORY_55,
  },
  upcomingTitle: {
    marginTop: 12,
    marginBottom: 12,
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.ivory,
  },
  emptyUpcoming: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyUpcomingText: {
    fontSize: 12,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: IVORY_12,
  },
  upcomingThumb: {
    width: 52,
    height: 62,
    borderRadius: 6,
    backgroundColor: '#463038',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingMeta: {
    flex: 1,
    minWidth: 0,
  },
  upcomingName: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  upcomingHost: {
    marginTop: 4,
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: IVORY_60,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  upcomingWhen: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.blush,
  },
  retryBtn: {
    marginTop: 12,
    minHeight: 44,
  },
});
