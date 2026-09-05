import { SearchIcon, UserIcon, WifiOffIcon } from '@/components/ui/icons';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { MAX_LIVE_MODERATORS } from '@/context/live-context';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { searchProfiles, type ProfileSearchHit } from '@/lib/profile-search';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type SearchHit = ProfileSearchHit;

type Props = {
  visible: boolean;
  title: string;
  copy?: string;
  roleLabel?: string;
  hostUsername: string;
  moderators: string[];
  suggestions?: string[];
  onClose: () => void;
  onAdd: (username: string) => void;
  onRemove: (username: string) => void;
};

function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, '');
}

function ResultsStatus({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusIcon}>{icon}</View>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.retryBtn} accessibilityRole="button">
          <Text style={styles.retryLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ModeratorsSheet({
  visible,
  title,
  copy,
  roleLabel = 'Moderator',
  hostUsername,
  moderators,
  suggestions = [],
  onClose,
  onAdd,
  onRemove,
}: Props) {
  const { sheetBottom } = useScreenInsets();
  const { session } = useAuth();
  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const atLimit = moderators.length >= MAX_LIVE_MODERATORS;
  const slotsLeft = Math.max(0, MAX_LIVE_MODERATORS - moderators.length);
  const query = normalizeUsername(draft);

  function isHostUser(username: string) {
    return username.toLowerCase() === hostUsername.toLowerCase();
  }

  const withHostHit = useCallback(
    (rows: SearchHit[]) => {
      const withoutMods = rows.filter(
        (row) => !moderators.some((mod) => mod.toLowerCase() === row.username.toLowerCase()),
      );
      const needle = query.toLowerCase();
      const hostMatch =
        Boolean(needle) &&
        (hostUsername.toLowerCase().includes(needle) ||
          Boolean(session?.name && session.name.toLowerCase().includes(needle)));
      if (!hostMatch) return withoutMods;
      if (withoutMods.some((row) => row.username.toLowerCase() === hostUsername.toLowerCase())) {
        return withoutMods;
      }
      return [
        {
          username: hostUsername,
          name: session?.name || hostUsername,
          photoUri: session?.photoUri,
        },
        ...withoutMods,
      ];
    },
    [hostUsername, moderators, query, session?.name, session?.photoUri],
  );

  const suggestionHits = useMemo<SearchHit[]>(
    () =>
      suggestions
        .filter((name) => !moderators.some((mod) => mod.toLowerCase() === name.toLowerCase()))
        .map((username) => ({ username })),
    [moderators, suggestions],
  );

  const list = query.length > 0 ? hits : suggestionHits;

  useEffect(() => {
    if (!visible) {
      setDraft('');
      setFormError('');
      setHits([]);
      setSelected([]);
      setSearching(false);
      setSearchFailed(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || atLimit) return;
    if (query.length < 1) {
      setHits([]);
      setSearching(false);
      setSearchFailed(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchFailed(false);
    const timer = setTimeout(() => {
      void searchProfiles(query)
        .then((rows) => {
          if (cancelled) return;
          setSearchFailed(false);
          setHits(withHostHit(rows));
        })
        .catch(() => {
          if (cancelled) return;
          setHits(withHostHit([]));
          setSearchFailed(true);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [atLimit, query, retryTick, visible, withHostHit]);

  function toggleSelect(username: string) {
    if (isHostUser(username)) return;
    setFormError('');
    setSelected((current) => {
      if (current.some((item) => item.toLowerCase() === username.toLowerCase())) {
        return current.filter((item) => item.toLowerCase() !== username.toLowerCase());
      }
      if (current.length >= slotsLeft) {
        return [...current.slice(0, slotsLeft - 1), username];
      }
      return [...current, username];
    });
  }

  function addSelected() {
    if (adding) return;
    if (!selected.length) {
      setFormError('Tap a person in the list, then Add.');
      return;
    }
    if (selected.length > slotsLeft) {
      setFormError(`You can appoint up to ${MAX_LIVE_MODERATORS} moderators.`);
      return;
    }

    setAdding(true);
    setFormError('');
    for (const username of selected) {
      if (username.toLowerCase() === hostUsername.toLowerCase()) continue;
      if (moderators.some((mod) => mod.toLowerCase() === username.toLowerCase())) continue;
      onAdd(username);
    }
    setDraft('');
    setSelected([]);
    setHits([]);
    setAdding(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.card, { paddingBottom: sheetBottom }]} onPress={() => undefined}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            {copy ? <Text style={styles.copy}>{copy}</Text> : null}

            {moderators.map((mod, index) => (
              <View key={mod} style={styles.modRow}>
                <ProfileAvatar username={mod} style={styles.avatar} />
                <View style={styles.meta}>
                  <Text style={styles.modName}>@{mod}</Text>
                  <Text style={styles.modSub}>
                    {roleLabel} {index + 1}
                  </Text>
                </View>
                <Pressable onPress={() => onRemove(mod)} hitSlop={8}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}

            {atLimit ? (
              <Text style={styles.limit}>Add moderator · limit reached</Text>
            ) : (
              <View style={styles.addBlock}>
                <View style={styles.inputRow}>
                  <View style={styles.searchField}>
                    <SearchIcon size={16} color={Palette.muted3} />
                    <TextInput
                      value={draft}
                      onChangeText={(value) => {
                        setDraft(value);
                        setFormError('');
                        setSearchFailed(false);
                      }}
                      placeholder="Search a username"
                      placeholderTextColor={Palette.disabled}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      style={styles.input}
                    />
                  </View>
                  <Pressable
                    onPress={addSelected}
                    disabled={adding || selected.length === 0}
                    style={[styles.addBtn, selected.length === 0 ? styles.addBtnOff : null]}
                  >
                    {adding ? (
                      <ActivityIndicator color={Palette.ivory} size="small" />
                    ) : (
                      <Text style={[styles.addBtnLabel, selected.length === 0 ? styles.addBtnLabelOff : null]}>Add</Text>
                    )}
                  </Pressable>
                </View>
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <View style={styles.results}>
                  {searching ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color={Palette.plum} size="small" />
                      <Text style={styles.loadingText}>Looking up @{query}…</Text>
                    </View>
                  ) : null}
                  {!searching && searchFailed && list.length === 0 ? (
                    <ResultsStatus
                      icon={<WifiOffIcon size={20} color={Palette.warning} />}
                      title="Couldn't look people up"
                      message="User search didn't come back. Try again in a moment."
                      actionLabel="Try again"
                      onAction={() => setRetryTick((tick) => tick + 1)}
                    />
                  ) : null}
                  {!searching && !searchFailed && query.length > 0 && list.length === 0 ? (
                    <ResultsStatus
                      icon={<SearchIcon size={20} color={Palette.plum} />}
                      title={`No matches for “${query}”`}
                      message="Try their exact username, without the @."
                    />
                  ) : null}
                  {!searching && query.length < 1 && list.length === 0 ? (
                    <ResultsStatus
                      icon={<UserIcon size={20} color={Palette.plum} />}
                      title="Search someone"
                      message="Type a Throve username to appoint them as a moderator."
                    />
                  ) : null}
                  {!searching && query.length < 1 && list.length > 0 ? (
                    <Text style={styles.suggestLabel}>People you've messaged</Text>
                  ) : null}
                  <ScrollView keyboardShouldPersistTaps="handled" style={styles.resultList}>
                    {list.map((hit) => {
                      const isOn = selected.some((item) => item.toLowerCase() === hit.username.toLowerCase());
                      const isHost = isHostUser(hit.username);
                      return (
                        <Pressable
                          key={hit.username}
                          disabled={isHost}
                          onPress={() => toggleSelect(hit.username)}
                          style={[styles.hitRow, isOn && styles.hitRowOn, isHost && styles.hitRowHost]}
                        >
                          <ProfileAvatar uri={hit.photoUri} username={hit.username} style={styles.avatar} />
                          <View style={styles.meta}>
                            <Text style={[styles.hitName, isHost && styles.hitNameHost]}>
                              {hit.name || hit.username}
                            </Text>
                            <Text style={styles.hitUsername}>@{hit.username}</Text>
                          </View>
                          {isHost ? (
                            <View style={styles.hostTag}>
                              <Text style={styles.hostTagLabel}>Host</Text>
                            </View>
                          ) : (
                            <View style={[styles.check, isOn && styles.checkOn]}>
                              {isOn ? <Text style={styles.checkMark}>✓</Text> : null}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}

            <Text style={styles.footnote}>
              A moderator is not a co-host: no video, no product control, no orders, no finance, and they can't end the
              live.
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    maxHeight: '88%',
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
    fontSize: 11.5,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  modRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    marginTop: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  meta: { flex: 1 },
  modName: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  modSub: {
    marginTop: 2,
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  remove: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.error,
  },
  addBlock: {
    marginTop: 12,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchField: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 23,
    paddingHorizontal: 14,
    backgroundColor: Palette.ivoryElevated,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
    paddingVertical: 0,
  },
  addBtn: {
    minHeight: 46,
    minWidth: 72,
    borderRadius: 23,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  addBtnOff: {
    backgroundColor: Palette.disabledBg,
  },
  addBtnLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  addBtnLabelOff: {
    color: Palette.disabled,
  },
  formError: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.errorText,
  },
  results: {
    minHeight: 48,
    maxHeight: 280,
  },
  resultList: {
    maxHeight: 220,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  loadingText: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  statusCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.border,
    borderRadius: Radius.md,
    backgroundColor: Palette.ivoryElevated,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontFamily: Typography.display,
    fontSize: 16,
    color: Palette.espresso,
    textAlign: 'center',
  },
  statusMessage: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  suggestLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
    marginBottom: 4,
  },
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hitRowOn: {
    backgroundColor: Palette.sand,
    borderColor: Palette.plum,
  },
  hitRowHost: {
    opacity: 0.72,
  },
  hitName: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  hitNameHost: {
    color: Palette.muted,
  },
  hostTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
    backgroundColor: Palette.plum,
  },
  hostTagLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  hitUsername: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: Palette.plum,
    borderColor: Palette.plum,
  },
  checkMark: {
    color: Palette.ivory,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
  },
  limit: {
    marginTop: 11,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.disabled,
  },
  footnote: {
    marginTop: 11,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
});
