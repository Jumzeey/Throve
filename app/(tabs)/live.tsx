import { AppImage } from '@/components/ui/app-image';
import { Palette, Typography, Radius } from '@/constants/theme';
import { getLiveImage } from '@/data/images';
import { useLive } from '@/context/live-context';
import type { LiveSession } from '@/data/types';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LiveDiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { liveNow, upcoming } = useLive();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Live shopping</Text>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Live now</Text>
        {liveNow.length === 0 ? (
          <Text style={styles.empty}>No one is live right now.</Text>
        ) : (
          liveNow.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              live
              onPress={() => router.push(`/live/${session.id}`)}
              onOpenHost={() => router.push({ pathname: '/seller/[username]', params: { username: session.host } })}
            />
          ))
        )}
        <Text style={[styles.section, styles.upcomingLabel]}>Upcoming lives</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.empty}>Nothing scheduled yet.</Text>
        ) : (
          upcoming.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onPress={() => router.push({ pathname: '/seller/[username]', params: { username: session.host } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function SessionRow({
  session,
  live,
  onPress,
  onOpenHost,
}: {
  session: LiveSession;
  live?: boolean;
  onPress?: () => void;
  onOpenHost?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={styles.thumbWrap}>
        <AppImage source={getLiveImage(session.id)} style={styles.thumb} />
        {live ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LIVE</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={styles.rowTitle}>{session.title}</Text>
        <Text
          onPress={
            onOpenHost
              ? (event) => {
                  event.stopPropagation();
                  onOpenHost();
                }
              : undefined
          }
          style={styles.rowSub}>
          @{session.host}
          {live ? ` · ${session.viewers ?? 0} watching` : session.scheduledAt ? ` · ${session.scheduledAt}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  title: {
    fontSize: 22,
    fontFamily: Typography.headingBold,
    color: Palette.text,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  section: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  upcomingLabel: {
    marginTop: 16,
  },
  empty: {
    fontSize: 13,
    color: Palette.muted3,
    paddingVertical: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  thumb: {
    width: 64,
    height: 64,
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: Palette.live,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Typography.bodySemiBold,
    color: Palette.background,
  },
  meta: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
});
