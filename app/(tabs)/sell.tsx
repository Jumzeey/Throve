import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();

  function goLive() {
    router.push(session?.canHostLive ? '/live/prepare' : '/live/host-access');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Sell</Text>
      <View style={styles.body}>
        <Text style={styles.copy}>Create listing will land here next. Approved hosts can go live from this tab.</Text>
        <Pressable onPress={goLive} style={styles.goLive}>
          <Text style={styles.goLiveLabel}>● Go Live</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 16,
  },
  copy: {
    fontSize: 14,
    lineHeight: 22,
    color: Palette.muted,
  },
  goLive: {
    height: 44,
    borderWidth: 1,
    borderColor: Palette.live,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  goLiveLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.live,
  },
});
