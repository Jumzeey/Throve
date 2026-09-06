import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { LockIcon, MailIcon, SpinnerArcIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useListings } from '@/context/listings-context';
import type { PreferredLoginMethod } from '@/data/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { getDeviceLoginPreference } from '@/lib/login-preference';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

type ConfirmKind = 'logout' | 'delete' | 'switch' | null;
type ActionPhase = 'idle' | 'working' | 'done' | 'error';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout, deactivateAccount, updatePreferredLoginMethod, updateSettings } = useAuth();
  const inbox = useInbox();
  const { hideActiveForSeller } = useListings();
  const { isConnected } = useNetworkStatus();

  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pendingMethod, setPendingMethod] = useState<PreferredLoginMethod | null>(null);
  const [method, setMethod] = useState<PreferredLoginMethod>('password');
  const [logoutPhase, setLogoutPhase] = useState<ActionPhase>('idle');
  const [deletePhase, setDeletePhase] = useState<ActionPhase>('idle');
  const [switchPhase, setSwitchPhase] = useState<ActionPhase>('idle');
  const [notifPhase, setNotifPhase] = useState<ActionPhase>('idle');
  const [farewell, setFarewell] = useState<'logout' | 'delete' | null>(null);
  const [notifOffers, setNotifOffers] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifLive, setNotifLive] = useState(true);
  const [notifListings, setNotifListings] = useState(true);
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifPushEnabled, setNotifPushEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const preferred = await getDeviceLoginPreference();
      if (!cancelled) setMethod(preferred);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.preferredLoginMethod]);

  useEffect(() => {
    if (session?.preferredLoginMethod) setMethod(session.preferredLoginMethod);
  }, [session?.preferredLoginMethod]);

  useEffect(() => {
    if (!session) return;
    setNotifOffers(session.notifOffers !== false);
    setNotifMessages(session.notifMessages !== false);
    setNotifLive(session.notifLive !== false);
    setNotifListings(session.notifListings !== false);
    setNotifOrders(session.notifOrders !== false);
    setNotifPushEnabled(session.notifPushEnabled !== false);
  }, [session]);

  useEffect(() => {
    if (!farewell || session) return;
    const timer = setTimeout(() => {
      router.replace('/(auth)/welcome');
    }, 1100);
    return () => clearTimeout(timer);
  }, [farewell, router, session]);

  if (farewell === 'logout') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Settings and account" />
        <View style={styles.farewell}>
          {session ? (
            <Button label="Logging out…" loading disabled />
          ) : (
            <AlertBanner variant="success" title="Logged out" message="Returning to Welcome." />
          )}
        </View>
      </View>
    );
  }

  if (farewell === 'delete') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Settings and account" />
        <View style={styles.farewell}>
          {session ? (
            <Pressable style={[styles.deleteSolid, styles.deleteWorking]} disabled>
              <SpinnerArcIcon size={16} color={Palette.ivory} />
              <Text style={styles.deleteSolidLabel}>Deactivating account…</Text>
            </Pressable>
          ) : (
            <View style={styles.deactivatedBox}>
              <Text style={styles.deactivatedTitle}>Your account has been deactivated</Text>
              <Text style={styles.deactivatedBody}>
                You've been signed out and your listings are hidden. Returning to Welcome.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const blockedCount = inbox.blockedUsers.length;
  const hasPassword = Boolean(session.hasPassword);
  const isMagic = method === 'magic_link';
  const busy =
    logoutPhase === 'working' ||
    deletePhase === 'working' ||
    switchPhase === 'working' ||
    notifPhase === 'working';

  function openSwitch(next: PreferredLoginMethod) {
    if (!isConnected || busy || next === method) return;
    if (next === 'password' && !hasPassword) {
      router.push({
        pathname: '/(auth)/set-password',
        params: { email: session!.email, purpose: 'setup' },
      });
      return;
    }
    setPendingMethod(next);
    setConfirm('switch');
    setSwitchPhase('idle');
  }

  async function onConfirmLogout() {
    if (!isConnected || busy) return;
    setConfirm(null);
    setLogoutPhase('working');
    setFarewell('logout');
    try {
      await logout();
      setLogoutPhase('done');
    } catch {
      setFarewell(null);
      setLogoutPhase('error');
    }
  }

  async function onConfirmDelete() {
    if (!isConnected || busy) return;
    setConfirm(null);
    setDeletePhase('working');
    setFarewell('delete');
    try {
      await hideActiveForSeller(session!.username);
      await deactivateAccount();
      setDeletePhase('done');
    } catch {
      setFarewell(null);
      setDeletePhase('error');
    }
  }

  async function onConfirmSwitch() {
    if (!isConnected || busy || !pendingMethod) return;
    setConfirm(null);
    setSwitchPhase('working');
    try {
      await updatePreferredLoginMethod(pendingMethod);
      setMethod(pendingMethod);
      setSwitchPhase('done');
      setPendingMethod(null);
    } catch {
      setSwitchPhase('error');
    }
  }

  async function toggleNotif(
    key:
      | 'notifOffers'
      | 'notifMessages'
      | 'notifLive'
      | 'notifListings'
      | 'notifOrders'
      | 'notifPushEnabled',
    next: boolean,
  ) {
    if (!isConnected || busy) return;
    const prev = {
      notifOffers,
      notifMessages,
      notifLive,
      notifListings,
      notifOrders,
      notifPushEnabled,
    };
    const setters = {
      notifOffers: setNotifOffers,
      notifMessages: setNotifMessages,
      notifLive: setNotifLive,
      notifListings: setNotifListings,
      notifOrders: setNotifOrders,
      notifPushEnabled: setNotifPushEnabled,
    };
    setters[key](next);
    setNotifPhase('working');
    try {
      await updateSettings({ [key]: next });
      setNotifPhase('done');
    } catch {
      setters[key](prev[key]);
      setNotifPhase('error');
    }
  }

  const switchTarget = pendingMethod ?? (isMagic ? 'password' : 'magic_link');
  const switchConfirmCopy =
    switchTarget === 'password'
      ? {
          title: 'Switch to password sign-in?',
          body: `Next time you log in, you'll use your email and password for ${session.email}.`,
          confirm: 'Use password',
        }
      : {
          title: 'Switch to email link sign-in?',
          body: `Next time you log in, Throve will send a sign-in link to ${session.email}. You can still use your password later if you switch back.`,
          confirm: 'Use email link',
        };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings and account" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <OfflineBanner title="No connection" message="Reconnect to change your account settings." />
        ) : null}

        {logoutPhase === 'error' ? (
          <AlertBanner
            variant="error"
            title="We couldn't log you out"
            message="Please try again in a moment."
          />
        ) : null}

        {deletePhase === 'error' ? (
          <AlertBanner
            variant="error"
            title="We couldn't complete that"
            message="Your account is unchanged. Please try again in a moment."
          />
        ) : null}

        {switchPhase === 'error' ? (
          <AlertBanner
            variant="error"
            title="We couldn't update sign-in"
            message="Your preference is unchanged. Please try again in a moment."
          />
        ) : null}

        {switchPhase === 'done' ? (
          <AlertBanner
            variant="success"
            title="Sign-in preference updated"
            message={
              isMagic
                ? 'Next time, Throve will send you an email link.'
                : 'Next time, you can sign in with your email and password.'
            }
          />
        ) : null}

        {notifPhase === 'error' ? (
          <AlertBanner
            variant="error"
            title="Couldn't update notifications"
            message="Your email preferences are unchanged. Please try again."
          />
        ) : null}

        {notifPhase === 'done' ? (
          <AlertBanner variant="success" title="Notification preferences updated" />
        ) : null}

        <Section label="Profile">
          <Pressable style={styles.linkRow} onPress={() => router.push('/profile/edit')}>
            <Text style={styles.linkLabel}>Edit profile</Text>
            <Ionicons name="chevron-forward" size={15} color={Palette.muted2} />
          </Pressable>
        </Section>

        <Section label="Notifications">
          <NotifToggle
            title="Offers"
            body="When someone sends, accepts, or updates an offer."
            value={notifOffers}
            disabled={!isConnected || busy}
            onValueChange={(next) => void toggleNotif('notifOffers', next)}
          />
          <View style={styles.toggleDivider} />
          <NotifToggle
            title="Messages"
            body="When you get a new chat message."
            value={notifMessages}
            disabled={!isConnected || busy}
            onValueChange={(next) => void toggleNotif('notifMessages', next)}
          />
          <View style={styles.toggleDivider} />
          <NotifToggle
            title="Live"
            body="When sellers you follow go live, claim holds, and moderator invites."
            value={notifLive}
            disabled={!isConnected || busy}
            onValueChange={(next) => void toggleNotif('notifLive', next)}
          />
          <View style={styles.toggleDivider} />
          <NotifToggle
            title="Followed sellers"
            body="When sellers you follow publish a new listing."
            value={notifListings}
            disabled={!isConnected || busy}
            onValueChange={(next) => void toggleNotif('notifListings', next)}
          />
          <View style={styles.toggleDivider} />
          <NotifToggle
            title="Orders"
            body="Order updates, tracking, delivery, disputes, and payouts."
            value={notifOrders}
            disabled={!isConnected || busy}
            onValueChange={(next) => void toggleNotif('notifOrders', next)}
          />
          <View style={styles.toggleDivider} />
          <NotifToggle
            title="Push notifications"
            body="Master switch for device push. In-app alerts and email still follow the categories above."
            value={notifPushEnabled}
            disabled={!isConnected || busy}
            onValueChange={(next) => void toggleNotif('notifPushEnabled', next)}
          />
        </Section>

        <Section label="Account details">
          <View style={styles.detailCard}>
            <View style={[styles.detailRow, styles.detailDivider]}>
              <Text style={styles.detailKey}>Name</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {session.name}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Email</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {session.email}
              </Text>
            </View>
          </View>
        </Section>

        <Section label="Sign-in and security">
          <View style={styles.signInCard}>
            <View style={styles.signInTop}>
              {isMagic ? (
                <MailIcon size={18} color={Palette.plum} />
              ) : (
                <LockIcon size={18} color={Palette.plum} />
              )}
              <View style={styles.signInCopy}>
                <Text style={styles.signInTitle}>
                  {isMagic ? 'You sign in with an email link' : 'You sign in with a password'}
                </Text>
                <Text style={styles.signInBody}>
                  {isMagic
                    ? `Throve sends a sign-in link to ${session.email}. There's no password to manage on this device.`
                    : `You use your email and password for ${session.email}. Magic link is available if you switch.`}
                </Text>
              </View>
            </View>

            {switchPhase === 'working' ? (
              <View style={styles.workingRow}>
                <SpinnerArcIcon size={16} color={Palette.plum} />
                <Text style={styles.workingText}>Updating sign-in…</Text>
              </View>
            ) : (
              <View style={styles.signInActions}>
                {hasPassword ? (
                  <Pressable
                    disabled={!isConnected || busy}
                    onPress={() =>
                      router.push({
                        pathname: '/(auth)/set-password',
                        params: { email: session.email, purpose: 'change' },
                      })
                    }
                  >
                    <Text style={styles.signInAction}>Change password</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={!isConnected || busy}
                    onPress={() =>
                      router.push({
                        pathname: '/(auth)/set-password',
                        params: { email: session.email, purpose: 'setup' },
                      })
                    }
                  >
                    <Text style={styles.signInAction}>Set up password</Text>
                  </Pressable>
                )}
                <Text style={styles.signInDot}>·</Text>
                <Pressable
                  disabled={!isConnected || busy}
                  onPress={() => openSwitch(isMagic ? 'password' : 'magic_link')}
                >
                  <Text style={styles.signInAction}>
                    {isMagic ? 'Switch to password' : 'Switch to email link'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Section>

        <Section label="Safety">
          <Pressable style={styles.linkRow} onPress={() => router.push('/profile/blocked')}>
            <Text style={styles.linkLabel}>Blocked users</Text>
            <View style={styles.linkMeta}>
              {blockedCount > 0 ? <Text style={styles.count}>{blockedCount}</Text> : null}
              <Ionicons name="chevron-forward" size={15} color={Palette.muted2} />
            </View>
          </Pressable>
        </Section>

        <View style={styles.footer}>
          {logoutPhase === 'working' ? (
            <Button label="Logging out…" loading disabled />
          ) : (
            <Button
              label="Log out"
              variant="secondary"
              disabled={!isConnected || busy}
              onPress={() => {
                setLogoutPhase('idle');
                setPendingMethod(null);
                setConfirm('logout');
              }}
            />
          )}

          {confirm === 'delete' ? (
            <View style={[styles.confirmCard, styles.deleteConfirm]}>
              <Text style={[styles.confirmTitle, styles.deleteTitle]}>Delete your account?</Text>
              <Text style={styles.confirmBody}>
                This deactivates your Throve account. You'll be signed out, normal account access will be disabled, and
                your active listings will be hidden. Records needed for transactions, orders, reviews, disputes and audit
                may be retained.
              </Text>
              <View style={styles.confirmActionsCol}>
                <Button label="Keep my account" variant="secondary" onPress={() => setConfirm(null)} />
                <Pressable
                  style={[styles.deleteSolid, !isConnected && styles.deleteDisabled]}
                  disabled={!isConnected}
                  onPress={() => void onConfirmDelete()}
                >
                  <Text style={styles.deleteSolidLabel}>Delete account</Text>
                </Pressable>
              </View>
            </View>
          ) : deletePhase === 'working' ? (
            <Pressable style={[styles.deleteSolid, styles.deleteWorking]} disabled>
              <SpinnerArcIcon size={16} color={Palette.ivory} />
              <Text style={styles.deleteSolidLabel}>Deactivating account…</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.deleteOutline, (!isConnected || busy) && styles.deleteDisabled]}
              disabled={!isConnected || busy}
              onPress={() => {
                setDeletePhase('idle');
                setPendingMethod(null);
                setConfirm('delete');
              }}
            >
              <Text style={styles.deleteOutlineLabel}>Delete account</Text>
            </Pressable>
          )}

          <Text style={styles.footnote}>
            Deleting your account deactivates it — you'll be signed out and your listings will be hidden.
          </Text>
        </View>
      </ScrollView>

      <Dialog
        visible={confirm === 'logout'}
        title="Log out of Throve?"
        body={
          isMagic
            ? "Your account stays exactly as it is. You'll sign back in with an email link."
            : "Your account stays exactly as it is. You'll sign back in with your email and password."
        }
        onClose={() => setConfirm(null)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onPress: () => setConfirm(null) },
          { label: 'Log out', variant: 'primary', onPress: () => void onConfirmLogout() },
        ]}
      />

      <Dialog
        visible={confirm === 'switch'}
        title={switchConfirmCopy.title}
        body={switchConfirmCopy.body}
        onClose={() => {
          setConfirm(null);
          setPendingMethod(null);
        }}
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => {
              setConfirm(null);
              setPendingMethod(null);
            },
          },
          {
            label: switchConfirmCopy.confirm,
            variant: 'primary',
            onPress: () => void onConfirmSwitch(),
          },
        ]}
      />
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function NotifToggle({
  title,
  body,
  value,
  disabled,
  onValueChange,
}: {
  title: string;
  body: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleBody}>{body}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: Palette.border, true: Palette.plum }}
        thumbColor={Palette.ivory}
        ios_backgroundColor={Palette.border}
      />
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
    gap: Spacing.xl,
  },
  farewell: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  section: {
    gap: 9,
  },
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
  },
  card: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  toggleTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  toggleBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginLeft: 15,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 15,
    gap: 12,
  },
  linkLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  linkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted2,
    fontVariant: ['tabular-nums'],
  },
  detailCard: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailDivider: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  detailKey: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  detailValue: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.espresso,
    textAlign: 'right',
  },
  signInCard: {
    padding: 15,
    gap: 14,
  },
  signInTop: {
    flexDirection: 'row',
    gap: 11,
  },
  signInCopy: {
    flex: 1,
  },
  signInTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    marginBottom: 3,
  },
  signInBody: {
    fontSize: 11.5,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  signInActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  signInAction: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  signInDot: {
    fontSize: 12.5,
    color: Palette.muted2,
  },
  workingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  workingText: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  footer: {
    gap: 10,
    paddingTop: 4,
  },
  confirmCard: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
    borderRadius: 10,
    padding: 16,
    gap: 6,
  },
  deleteConfirm: {
    borderColor: Palette.errorBorder,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  deleteTitle: {
    color: Palette.errorText,
  },
  confirmBody: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
    marginTop: 2,
  },
  confirmActionsCol: {
    gap: 9,
    marginTop: 14,
  },
  deleteOutline: {
    minHeight: 50,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Palette.errorText,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  deleteOutlineLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.errorText,
  },
  deleteSolid: {
    minHeight: 50,
    borderRadius: Radius.button,
    backgroundColor: Palette.errorText,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  deleteSolidLabel: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  deleteWorking: {
    opacity: 0.72,
  },
  deleteDisabled: {
    opacity: 0.45,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  deactivatedBox: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  deactivatedTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  deactivatedBody: {
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
  },
});
