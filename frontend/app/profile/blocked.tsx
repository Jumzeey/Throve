import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { UserIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { getSellerAvatar } from '@/data/images';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { AppImage } from '@/components/ui/app-image';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const inbox = useInbox();
  const { isConnected } = useNetworkStatus();
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const blocked = inbox.blockedUsers;

  async function onUnblock(username: string) {
    if (!isConnected || busyUser) return;
    setBusyUser(username);
    setError(null);
    try {
      await inbox.toggleBlock(username);
    } catch {
      setError(`Could not unblock @${username}. Try again.`);
    } finally {
      setBusyUser(null);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Blocked users" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        {!isConnected ? <OfflineBanner message="Reconnect to manage blocked users." /> : null}
        {error ? <AlertBanner variant="error" title="Something went wrong" message={error} /> : null}

        {blocked.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyCopy}>Anyone you block from a conversation will be listed here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {blocked.map((username) => {
              const avatar = getSellerAvatar(username);
              const busy = busyUser === username;
              return (
                <View key={username} style={styles.row}>
                  <View style={styles.avatar}>
                    {avatar ? (
                      <AppImage source={avatar} style={styles.avatarImage} />
                    ) : (
                      <UserIcon size={16} color={Palette.muted3} />
                    )}
                  </View>
                  <Text style={styles.username} numberOfLines={1}>
                    {username}
                  </Text>
                  <Pressable
                    onPress={() => onUnblock(username)}
                    disabled={!isConnected || busy}
                    hitSlop={8}
                  >
                    <Text style={[styles.unblock, (!isConnected || busy) && styles.unblockDisabled]}>
                      {busy ? '…' : 'Unblock'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            <Text style={styles.footnote}>
              Only the username is shown. Nothing else about a blocked user appears here.
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  emptyCopy: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  list: {
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.skeleton,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 34,
    height: 34,
  },
  username: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  unblock: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  unblockDisabled: {
    opacity: 0.45,
  },
  footnote: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
});
