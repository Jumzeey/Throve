import { EmptyState } from '@/components/ui/empty-state';
import { HeartIcon } from '@/components/ui/icons';
import { LiquidRefreshScrollView, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { ListingGridSkeleton } from '@/components/ui/loading-skeleton';
import { OfflineBanner } from '@/components/ui/alert-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip, type ListingChipVariant } from '@/components/ui/status-chip';
import { AppImage } from '@/components/ui/app-image';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { getListingImageSource } from '@/data/images';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import type { Listing } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SavedItemsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { savedListingsFor, toggleSave, loading } = useListings();
  const { isConnected } = useNetworkStatus();
  const [saved, setSaved] = useState<Listing[]>([]);
  const [fetching, setFetching] = useState(true);

  const loadSaved = useCallback(async () => {
    if (!session?.username) {
      setSaved([]);
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const next = await savedListingsFor(session.username);
      setSaved(next);
    } finally {
      setFetching(false);
    }
  }, [savedListingsFor, session?.username]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const pullTask = useCallback(async () => {
    if (!session?.username) return;
    const next = await savedListingsFor(session.username);
    setSaved(next);
  }, [savedListingsFor, session?.username]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const isLoading = (loading || fetching) && !refreshing;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Saved" onBack={() => router.back()} />
      <LiquidRefreshScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        contentContainerStyle={styles.body}
      >
        {!isConnected ? (
          <View style={styles.offline}>
            <OfflineBanner message="Reconnect to refresh your saved items." />
          </View>
        ) : null}

        {isLoading ? (
          <ListingGridSkeleton count={4} />
        ) : saved.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            message="Tap the heart on any item to save it here for later."
            actionLabel="Browse listings"
            onAction={() => router.push('/(tabs)')}
            style={styles.empty}
          />
        ) : (
          <View style={styles.grid}>
            {saved.map((item) => {
              const chipVariant: ListingChipVariant =
                item.status === 'reserved' ? 'reserved' : (item.status as ListingChipVariant);
              return (
                <View key={item.id} style={styles.card}>
                  <Pressable onPress={() => router.push(`/product/${item.id}`)}>
                    <View style={styles.photo}>
                      <AppImage source={getListingImageSource(item)} style={styles.photoFill} />
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          void toggleSave(item.id, session.username).then(() => {
                            setSaved((current) => current.filter((listing) => listing.id !== item.id));
                          });
                        }}
                        style={styles.heart}
                        hitSlop={8}>
                        <HeartIcon size={15} filled color={Palette.plum} />
                      </Pressable>
                      <View style={styles.chipWrap}>
                        <StatusChip kind="listing" variant={chipVariant} />
                      </View>
                    </View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.seller}>@{item.seller}</Text>
                    <Text style={styles.price}>{formatNaira(item.price)}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </LiquidRefreshScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  offline: {
    marginBottom: Spacing.md,
  },
  empty: {
    marginTop: Spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  photo: {
    aspectRatio: 0.82,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Palette.sand,
  },
  photoFill: {
    ...StyleSheet.absoluteFillObject,
  },
  heart: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,247,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWrap: {
    position: 'absolute',
    top: 9,
    left: 9,
  },
  title: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  seller: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  price: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
});
