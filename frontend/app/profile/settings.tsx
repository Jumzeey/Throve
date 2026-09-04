import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout, deactivateAccount, updateSettings } = useAuth();
  const inbox = useInbox();
  const { hideActiveForSeller } = useListings();
  const { isConnected } = useNetworkStatus();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const username = session.username;
  const blockedCount = inbox.blockedUsers.length;
  const notifOffers = session.notifOffers !== false;
  const notifMessages = session.notifMessages !== false;

  async function onLogout() {
    if (!isConnected) return;
    setError(null);
    try {
      await logout();
    } catch {
      setError('Could not log out. Check your connection and try again.');
    }
  }

  async function onTogglePref(key: 'notifOffers' | 'notifMessages', value: boolean) {
    if (!isConnected || prefsBusy) return;
    setPrefsBusy(true);
    setError(null);
    try {
      await updateSettings({ [key]: value });
    } catch {
      setError('Could not update notification preferences.');
    } finally {
      setPrefsBusy(false);
    }
  }

  async function onConfirmDeactivate() {
    if (!isConnected) return;
    setBusy(true);
    setError(null);
    try {
      await hideActiveForSeller(username);
      await deactivateAccount();
    } catch {
      setError('Could not deactivate account. Please try again.');
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        {!isConnected ? <OfflineBanner message="Reconnect to manage your account." /> : null}
        {error ? <AlertBanner variant="error" title="Something went wrong" message={error} /> : null}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.group}>
          <SettingsRow label="Edit profile" onPress={() => router.push('/profile/edit')} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email address</Text>
            <Text style={styles.rowValue}>{session.email}</Text>
          </View>
          <SettingsRow label="Login & security" onPress={() => router.push('/profile/login-security')} />
          <SettingsRow label={`Blocked users${blockedCount > 0 ? ` (${blockedCount})` : ''}`} />
        </View>
        <Text style={styles.sectionTitle}>Email notifications</Text>
        <View style={styles.group}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.toggleCopy}>
              <Text style={styles.rowLabel}>Offer updates</Text>
              <Text style={styles.rowHint}>New offers, accepts, and expiries</Text>
            </View>
            <Switch
              value={notifOffers}
              onValueChange={(value) => onTogglePref('notifOffers', value)}
              disabled={!isConnected || prefsBusy}
              trackColor={{ false: Palette.border, true: Palette.blush }}
              thumbColor={notifOffers ? Palette.plum : Palette.ivoryElevated}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.toggleCopy}>
              <Text style={styles.rowLabel}>Messages</Text>
              <Text style={styles.rowHint}>New chat messages from buyers and sellers</Text>
            </View>
            <Switch
              value={notifMessages}
              onValueChange={(value) => onTogglePref('notifMessages', value)}
              disabled={!isConnected || prefsBusy}
              trackColor={{ false: Palette.border, true: Palette.blush }}
              thumbColor={notifMessages ? Palette.plum : Palette.ivoryElevated}
            />
          </View>
        </View>
        <Text style={styles.sectionTitle}>Prototype</Text>
        <AlertBanner
          variant="info"
          title="Working prototype"
          message="Accounts are real, but purchases and payments are simulated. Order emails always send."
        />
        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.moreGroup}>
          <Button label="Log out" variant="secondary" onPress={onLogout} disabled={!isConnected} />
          <Button
            label="Delete account"
            variant="ghost"
            onPress={() => setConfirmDelete(true)}
            disabled={!isConnected || busy}
          />
        </View>
      </ScrollView>
      <Dialog
        visible={confirmDelete}
        title="Delete your account?"
        body="This deactivates your account — you'll be logged out and normal access disabled. Active listings are hidden. Records needed for order, transaction and review history may be retained."
        actions={[
          { label: 'Cancel', onPress: () => setConfirmDelete(false) },
          { label: 'Deactivate account', variant: 'primary', onPress: onConfirmDeactivate },
        ]}
        onClose={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function SettingsRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={Palette.muted2} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.xl,
    fontSize: 20,
    fontFamily: Typography.display,
    color: Palette.espresso,
    letterSpacing: -0.2,
  },
  group: {
    paddingHorizontal: Spacing.xl,
    backgroundColor: Palette.ivoryElevated,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    gap: Spacing.md,
  },
  rowLast: {
    borderBottomWidth: 1,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  rowHint: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.muted,
    maxWidth: '55%',
    textAlign: 'right',
  },
  moreGroup: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
});
