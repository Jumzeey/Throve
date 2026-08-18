import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout, updateSettings, deactivateAccount } = useAuth();
  const inbox = useInbox();
  const { hideActiveForSeller } = useListings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const username = session.username;
  const offersOn = session.notifOffers !== false;
  const messagesOn = session.notifMessages !== false;

  async function onLogout() {
    await logout();
  }

  async function onConfirmDeactivate() {
    setBusy(true);
    try {
      hideActiveForSeller(username);
      await deactivateAccount();
    } catch {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings and account" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          <InfoRow label="Email" value={session.email} />
          <InfoRow label="Phone number" value={session.phone || 'Not set'} />
          <Pressable onPress={() => router.push('/profile/edit')} style={styles.navRow}>
            <Text style={styles.rowLabel}>Edit profile</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
        <Text style={styles.section}>Login / security</Text>
        <Text style={styles.note}>Sign-in uses a simulated magic link sent to your email.</Text>
        <Text style={styles.section}>Notifications</Text>
        <View style={styles.group}>
          <ToggleRow
            label="Offer alerts"
            on={offersOn}
            onToggle={() => updateSettings({ notifOffers: !offersOn })}
          />
          <ToggleRow
            label="New messages"
            on={messagesOn}
            onToggle={() => updateSettings({ notifMessages: !messagesOn })}
          />
        </View>
        <Text style={styles.section}>Blocked users</Text>
        <View style={styles.group}>
          {inbox.blockedUsers.length === 0 ? (
            <Text style={styles.empty}>No blocked users.</Text>
          ) : (
            inbox.blockedUsers.map((username) => (
              <View key={username} style={styles.blockRow}>
                <Text style={styles.rowLabel}>@{username}</Text>
                <Pressable onPress={() => inbox.toggleBlock(username)} hitSlop={8}>
                  <Text style={styles.unblock}>Unblock</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
        <View style={styles.actions}>
          <Button label="Log out" variant="secondary" onPress={onLogout} style={styles.logout} />
          {confirmDelete ? (
            <View style={styles.confirm}>
              <Text style={styles.confirmText}>
                This deactivates your account: you'll be logged out, your active listings will be hidden, and normal
                account access will be disabled. Order and review records remain for marketplace integrity.
              </Text>
              <View style={styles.confirmBtns}>
                <Button label="Cancel" variant="danger" onPress={() => setConfirmDelete(false)} style={styles.confirmBtn} />
                <Pressable
                  disabled={busy}
                  onPress={onConfirmDeactivate}
                  style={[styles.deactivateBtn, busy ? styles.busy : null]}>
                  <Text style={styles.deactivateLabel}>Deactivate</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          <Button label="Delete account" variant="danger" onPress={() => setConfirmDelete(true)} />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Pressable onPress={onToggle} style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.knob, on ? styles.knobOn : null]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  group: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hatch,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hatch,
  },
  rowLabel: {
    fontSize: 14,
    color: Palette.text,
  },
  infoValue: {
    fontSize: 13,
    color: Palette.muted2,
  },
  chevron: {
    fontSize: 16,
    color: Palette.muted2,
  },
  note: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted,
  },
  empty: {
    paddingVertical: 12,
    fontSize: 13,
    color: Palette.muted3,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hatch,
  },
  unblock: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.live,
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  logout: {
    height: 48,
    marginBottom: 10,
  },
  confirm: {
    padding: 14,
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: 8,
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 13,
    lineHeight: 20,
    color: Palette.errorText,
    marginBottom: 10,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    height: 40,
  },
  deactivateBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: Palette.live,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.background,
  },
  busy: {
    opacity: 0.55,
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: Palette.text,
  },
  trackOff: {
    backgroundColor: Palette.border,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.background,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
});
