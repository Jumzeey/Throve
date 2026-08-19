import { AppImage } from '@/components/ui/app-image';
import { Palette, Typography, Radius } from '@/constants/theme';
import { getSellerAvatar } from '@/data/images';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/auth-context';
import { useCheckout } from '@/context/checkout-context';
import { useListings } from '@/context/listings-context';
import { starString } from '@/lib/format';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { listingsForSeller, savedListingsFor } = useListings();
  const { ratingInfo } = useCheckout();

  if (!session) return null;

  const soldCount = listingsForSeller(session.username).filter((item) => item.status === 'sold').length;
  const savedCount = savedListingsFor(session.username).length;
  const rating = ratingInfo(session.username);
  const ratingValue = rating.count > 0 ? starString(rating.avg) : '—';
  const locationLine = session.location ? `@${session.username} · ${session.location}` : `@${session.username}`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={() => router.push('/profile/settings')} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={Palette.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.identity}>
          {session.photoUri ? (
            <Image source={{ uri: session.photoUri }} style={styles.avatar} />
          ) : (
            <AppImage source={getSellerAvatar(session.username)} style={styles.avatar} />
          )}
          <Text style={styles.name}>{session.name}</Text>
          <Text style={styles.meta}>{locationLine}</Text>
          {session.bio ? <Text style={styles.bio}>{session.bio}</Text> : null}
          <Pressable onPress={() => router.push('/profile/edit')} style={styles.editBtn}>
            <Text style={styles.editLabel}>Edit profile</Text>
          </Pressable>
        </View>
        <View style={styles.stats}>
          <Stat value={String(soldCount)} label="Sold" />
          <Stat value={ratingValue} label={`${rating.count} reviews`} />
          <Stat value={String(savedCount)} label="Saved" />
        </View>
        <View style={styles.rows}>
          <Row label="My listings" onPress={() => router.push('/(tabs)/sell')} />
          <Row label="Saved items" hint={`${savedCount}`} onPress={() => router.push('/profile/saved')} />
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
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {hint ? <Text style={styles.rowHint}>{hint}</Text> : <Ionicons name="chevron-forward" size={16} color={Palette.muted2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  title: {
    fontSize: 22,
    fontFamily: Typography.headingBold,
    color: Palette.text,
  },
  body: {
    paddingBottom: 24,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  name: {
    fontSize: 18,
    fontFamily: Typography.headingBold,
    color: Palette.text,
  },
  meta: {
    fontSize: 13,
    color: Palette.muted2,
  },
  bio: {
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  editBtn: {
    height: 38,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Palette.accent,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: Palette.background,
  },
  editLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.accent700,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: Typography.headingBold,
    color: Palette.accent700,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: Palette.muted2,
  },
  rows: {
    paddingHorizontal: 20,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
    backgroundColor: Palette.background,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
  rowHint: {
    fontSize: 12,
    color: Palette.muted2,
  },
});
