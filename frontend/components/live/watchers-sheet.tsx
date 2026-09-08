import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useLive, type LiveWatcher } from '@/context/live-context';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  sessionId: string;
  onClose: () => void;
};

function roleLabel(role: LiveWatcher['role']) {
  if (role === 'host') return 'Host';
  if (role === 'moderator') return 'Mod';
  return null;
}

export function LiveWatchersSheet({ visible, sessionId, onClose }: Props) {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const live = useLive();
  const watchers = live.getWatchers(sessionId);
  const guestCount = watchers.filter((watcher) => watcher.role !== 'host').length;
  const subtitle =
    watchers.length === 0
      ? 'People in this live will show up here.'
      : guestCount === 0
        ? 'No viewers yet — you are the only one here.'
        : guestCount === 1
          ? '1 viewer in this live.'
          : `${guestCount} viewers in this live.`;

  function openProfile(username: string) {
    if (!username || username === 'Viewer') {
      onClose();
      return;
    }
    onClose();
    router.push({ pathname: '/seller/[username]', params: { username } });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.card, { paddingBottom: sheetBottom }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>Watching</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.copy}>{subtitle}</Text>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listBody}
            keyboardShouldPersistTaps="handled"
          >
            {watchers.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No one here yet</Text>
                <Text style={styles.emptyCopy}>Viewers will appear as they join the live.</Text>
              </View>
            ) : (
              watchers.map((watcher) => {
                const isYou =
                  Boolean(session?.username) &&
                  watcher.username.toLowerCase() === session?.username.toLowerCase();
                const chip = roleLabel(watcher.role);
                return (
                  <Pressable
                    key={watcher.key}
                    onPress={() => openProfile(watcher.username)}
                    style={styles.row}
                    accessibilityRole="button"
                    accessibilityLabel={`@${watcher.username}`}
                  >
                    <ProfileAvatar uri={watcher.photoUrl} username={watcher.username} style={styles.avatar} />
                    <View style={styles.meta}>
                      <Text style={styles.name} numberOfLines={1}>
                        @{watcher.username}
                      </Text>
                      {isYou ? <Text style={styles.you}>You</Text> : null}
                    </View>
                    {chip ? (
                      <View style={[styles.chip, watcher.role === 'host' ? styles.hostChip : styles.modChip]}>
                        <Text style={styles.chipLabel}>{chip}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,17,19,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '78%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  close: {
    fontSize: 22,
    lineHeight: 24,
    color: Palette.muted2,
    paddingHorizontal: 4,
  },
  copy: {
    marginTop: 5,
    marginBottom: 8,
    fontSize: 11.5,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  list: {
    maxHeight: 420,
  },
  listBody: {
    paddingBottom: 8,
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  emptyCopy: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  you: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
  },
  hostChip: {
    backgroundColor: Palette.plum,
  },
  modChip: {
    backgroundColor: Palette.espresso,
  },
  chipLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
});
