import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { OfflineBanner } from '@/components/ui/alert-banner';
import { Palette, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { getSellerAvatar } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useListings } from '@/context/listings-context';
import { starString } from '@/lib/format';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScreenInsets } from '@/hooks/use-screen-insets';

export default function ProfileScreen() {
  const { top, tabScrollBottom } = useScreenInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { listingsForSeller, savedListingsFor } = useListings();
  const { ratingInfo } = useCheckout();
  const { isConnected } = useNetworkStatus();

  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingSaved(true);
    savedListingsFor(session?.username ?? '')
      .then((items) => {
        if (active) setSavedCount(items.length);
      })
      .finally(() => {
        if (active) setLoadingSaved(false);
      });
    return () => {
      active = false;
    };
  }, [savedListingsFor, session?.username]);

  if (!session) return null;

  const soldCount = listingsForSeller(session.username).filter((item) => item.status === 'sold').length;
  const rating = ratingInfo(session.username);
  const ratingValue = rating.count > 0 ? starString(rating.avg) : '—';
  const locationLine = session.location ? `@${session.username} · ${session.location}` : `@${session.username}`;

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.top}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={() => router.push('/profile/settings')} hitSlop={12} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={Palette.espresso} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabScrollBottom }]}>
        {!isConnected ? (
          <View style={styles.banner}>
            <OfflineBanner message="Some profile details may be out of date." />
          </View>
        ) : null}
        <View style={styles.identity}>
          {session.photoUri ? (
            <Image source={{ uri: session.photoUri }} style={styles.avatar} />
          ) : (
            <AppImage source={getSellerAvatar(session.username)} style={styles.avatar} />
          )}
          <Text style={styles.name}>{session.name}</Text>
          <Text style={styles.meta}>{locationLine}</Text>
          {session.bio ? <Text style={styles.bio}>{session.bio}</Text> : null}
          <Button label="Edit profile" variant="secondary" onPress={() => router.push('/profile/edit')} style={styles.editBtn} />
        </View>
        {loadingSaved ? (
          <LoadingSkeleton style={styles.statsSkeleton} rows={1} />
        ) : (
          <View style={styles.stats}>
            <Stat value={String(soldCount)} label="Sold" />
            <Stat value={ratingValue} label={`${rating.count} reviews`} />
            <Stat value={String(savedCount ?? 0)} label="Saved" />
          </View>
        )}
        <Text style={styles.sectionTitle}>Your activity</Text>
        <View style={styles.rows}>
          <Row label="My listings" onPress={() => router.push('/(tabs)/sell')} />
          <Row label="Saved items" hint={`${savedCount ?? 0}`} onPress={() => router.push('/profile/saved')} />
          <Row label="Orders" onPress={() => router.push('/profile/orders')} />
          <Row label="Settings and account" onPress={() => router.push('/profile/settings')} />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {hint ? <Text style={styles.rowHint}>{hint}</Text> : <Ionicons name="chevron-forward" size={16} color={Palette.muted2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.3,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  banner: {
    marginHorizontal: Spacing.xl,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  name: {
    fontSize: 22,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  bio: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  editBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'center',
    minWidth: 148,
  },
  statsSkeleton: {
    paddingHorizontal: Spacing.xl,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Palette.ivoryElevated,
    ...Shadows.sm,
  },
  statValue: {
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.plum,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  sectionTitle: {
    paddingHorizontal: Spacing.xl,
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  rows: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    backgroundColor: Palette.ivoryElevated,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  rowHint: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
});
