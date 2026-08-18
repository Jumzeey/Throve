import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { ScreenHeader } from '@/components/ui/screen-header';
import { listingStatusStyle } from '@/components/ui/simulated-stage';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import { formatNaira } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SavedItemsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { savedListingsFor, toggleSave } = useListings();

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const saved = savedListingsFor(session.username);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Saved" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        {saved.length === 0 ? (
          <Text style={styles.empty}>Nothing saved yet. Tap the heart on any item to save it here.</Text>
        ) : (
          <View style={styles.grid}>
            {saved.map((item) => {
              const status = listingStatusStyle(item.status);
              return (
                <View key={item.id} style={styles.card}>
                  <Pressable onPress={() => router.push(`/product/${item.id}`)}>
                    <View style={styles.photo}>
                      <PlaceholderImage style={styles.photoFill} />
                      <Pressable
                        onPress={() => toggleSave(item.id, session.username)}
                        style={styles.heart}
                        hitSlop={8}>
                        <Text style={styles.heartOn}>♥</Text>
                      </Pressable>
                      <View style={[styles.chip, { backgroundColor: status.backgroundColor }]}>
                        <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 50,
    fontSize: 13,
    color: Palette.muted3,
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
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoFill: {
    ...StyleSheet.absoluteFillObject,
  },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartOn: {
    fontSize: 13,
    color: Palette.live,
  },
  chip: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: Palette.text,
  },
  seller: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.muted2,
  },
  price: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
});
