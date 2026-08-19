import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Typography, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout, deactivateAccount } = useAuth();
  const inbox = useInbox();
  const { hideActiveForSeller } = useListings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const username = session.username;
  const blockedCount = inbox.blockedUsers.length;

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
      <ScreenHeader title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          <Pressable onPress={() => router.push('/profile/edit')} style={styles.row}>
            <Text style={styles.rowLabel}>Edit profile</Text>
          </Pressable>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email address</Text>
            <Text style={styles.rowValue}>{session.email}</Text>
          </View>
          <Pressable style={styles.row}>
            <Text style={styles.rowLabel}>Login &amp; security</Text>
          </Pressable>
          <Pressable style={styles.row}>
            <Text style={styles.rowLabel}>Blocked users{blockedCount > 0 ? ` (${blockedCount})` : ''}</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Prototype</Text>
        <View style={styles.protoBox}>
          <Text style={styles.protoText}>
            This is a working prototype — accounts are real, but purchases and payments are simulated.
          </Text>
        </View>

        <Text style={styles.section}>More</Text>
        <View style={styles.moreGroup}>
          <Button label="Log out" variant="secondary" onPress={onLogout} style={styles.logoutBtn} />
          <Pressable onPress={() => setConfirmDelete(true)} style={styles.deleteBtn}>
            <Text style={styles.deleteLabel}>Delete account</Text>
          </Pressable>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 18,
    marginTop: 16,
    marginBottom: 6,
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  group: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.text,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  protoBox: {
    marginHorizontal: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.divider,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
  protoText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    lineHeight: 18,
  },
  moreGroup: {
    paddingHorizontal: 18,
    gap: 16,
  },
  logoutBtn: {
    minHeight: 44,
  },
  deleteBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: Palette.accent700,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.accent800,
  },
});
