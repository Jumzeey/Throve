import { OfflineBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { LiquidRefreshFlatList, usePullRefresh } from '@/components/ui/liquid-pull-refresh';
import { ListingCard } from '@/components/ui/listing-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { FOLLOWING_PREVIEW_PER_SELLER, latestPerSeller } from '@/lib/following-feed';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function FollowingFeedScreen() {
  const router = useRouter();
  const { bottom } = useScreenInsets();
  const { session } = useAuth();
  const { followingListings, toggleSave, refresh, loading } = useListings();
  const { isConnected } = useNetworkStatus();

  const pullTask = useCallback(async () => {
    await refresh();
  }, [refresh]);
  const { refreshing, onRefresh } = usePullRefresh(pullTask);

  // Same rule as home: latest N per followed seller.
  const items = useMemo(
    () => latestPerSeller(followingListings, FOLLOWING_PREVIEW_PER_SELLER),
    [followingListings],
  );

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const username = session.username;
  const empty = !loading && items.length === 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="From sellers you follow" onBack={() => router.back()} />
      <LiquidRefreshFlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        refreshing={refreshing}
        onRefresh={onRefresh}
        disabled={!isConnected}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.body, { paddingBottom: bottom + 24 }]}
        ListHeaderComponent={
          !isConnected ? (
            <OfflineBanner message="Reconnect to refresh listings from sellers you follow." />
          ) : (
            <Text style={styles.sub}>Latest from sellers you follow.</Text>
          )
        }
        ListEmptyComponent={
          empty ? (
            <EmptyState
              title="Your feed is empty"
              message="Follow sellers you love — their new listings will show up here."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <ListingCard
              listing={item}
              meta="condition"
              showSave
              saved={item.savedBy.includes(username)}
              onSave={() => {
                void toggleSave(item.id, username);
              }}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  body: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  sub: {
    marginBottom: 14,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  row: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    maxWidth: '50%',
  },
});
