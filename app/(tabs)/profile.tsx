import { Button } from '@/components/ui/button';
import { PlaceholderImage } from '@/components/ui/placeholder-image';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, logout } = useAuth();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.body}>
        {session?.photoUri ? (
          <Image source={{ uri: session.photoUri }} style={styles.avatar} />
        ) : (
          <PlaceholderImage style={styles.avatar} />
        )}
        <Text style={styles.name}>{session?.name}</Text>
        <Text style={styles.meta}>
          @{session?.username}
          {session?.location ? ` · ${session.location}` : ''}
        </Text>
        {session?.bio ? <Text style={styles.bio}>{session.bio}</Text> : null}
        <Text style={styles.note}>Listings, saved items, orders and settings will land here next.</Text>
        <Button label="Log out" variant="secondary" onPress={logout} style={styles.logout} />
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
    fontSize: 16,
    fontWeight: '700',
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
  note: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted3,
    textAlign: 'center',
  },
  logout: {
    marginTop: 20,
    width: '100%',
  },
});
