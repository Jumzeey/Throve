import { Button } from '@/components/ui/button';
import { Palette, Radius, Typography } from '@/constants/theme';
import type { LiveSessionSummary } from '@/data/types';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function LiveSummaryScreen() {
  const router = useRouter();
  const { top, bottom } = useScreenInsets();
  const params = useLocalSearchParams<{
    title?: string;
    durationMinutes?: string;
    peakViewers?: string;
    productsShown?: string;
    productsSold?: string;
    reason?: string;
  }>();

  const summary: LiveSessionSummary = {
    sessionId: '',
    title: params.title ?? 'Your live',
    durationMinutes: Number(params.durationMinutes ?? 1),
    peakViewers: Number(params.peakViewers ?? 0),
    productsShown: Number(params.productsShown ?? 0),
    productsSold: Number(params.productsSold ?? 0),
    endedReason: params.reason === 'connection' ? 'connection' : 'host',
  };

  const connectionEnded = summary.endedReason === 'connection';

  return (
    <View style={[styles.screen, { paddingTop: top + 24, paddingBottom: bottom + 24 }]}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>Your live has ended</Text>
        {connectionEnded ? (
          <Text style={styles.copy}>
            We couldn't restore your connection, so the session was closed. You are no longer broadcasting.
          </Text>
        ) : (
          <View style={styles.stats}>
            <StatRow label="Duration" value={`${summary.durationMinutes} min`} />
            <StatRow label="Peak viewers" value={String(summary.peakViewers)} />
            <StatRow label="Products shown" value={String(summary.productsShown)} />
            <StatRow label="Products sold" value={String(summary.productsSold)} last />
          </View>
        )}
      </View>

      {connectionEnded ? (
        <Button
          label="See session summary"
          variant="dark"
          onPress={() =>
            router.replace({
              pathname: '/live/summary',
              params: {
                ...params,
                reason: 'host',
              },
            })
          }
          style={styles.primary}
        />
      ) : (
        <>
          <Button
            label="Go to Live discovery"
            variant="dark"
            onPress={() => router.replace('/(tabs)/live')}
            style={styles.primary}
          />
          <Pressable onPress={() => router.replace('/(tabs)/profile')} style={styles.secondary}>
            <Text style={styles.secondaryLabel}>My profile</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function StatRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.statRow, last && styles.statRowLast]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.liveDark,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 14,
  },
  card: {
    backgroundColor: Palette.liveDarkAlt,
    borderRadius: Radius.lg,
    padding: 20,
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: Typography.display,
    color: Palette.ivory,
    textAlign: 'center',
  },
  copy: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.65)',
    textAlign: 'center',
  },
  stats: {
    marginTop: 18,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,247,240,0.12)',
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.6)',
  },
  statValue: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
    fontVariant: ['tabular-nums'],
  },
  primary: {
    minHeight: 52,
  },
  secondary: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.32)',
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
});
