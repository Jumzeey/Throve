import { AlertBanner, OfflineBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { CheckIcon, SpinnerArcIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiFetch, ApiError } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Bank = { code: string; name: string };

type PayoutAccount = {
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
  status: 'pending' | 'verified' | 'failed';
  provider: 'simulate' | 'flutterwave';
  needsReverify: boolean;
  verifiedAt: string | null;
};

type AccountResponse = { mode: 'simulate' | 'flutterwave'; account: PayoutAccount | null };

type Phase = 'loading' | 'idle' | 'editing' | 'verifying' | 'error';

export default function PayoutAccountScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [phase, setPhase] = useState<Phase>('loading');
  const [mode, setMode] = useState<'simulate' | 'flutterwave'>('simulate');
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bank, setBank] = useState<Bank | null>(null);
  const [bankQuery, setBankQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const [accountRes, banksRes] = await Promise.all([
        apiFetch<AccountResponse>('/payout-account'),
        apiFetch<{ banks: Bank[] }>('/payout-account/banks'),
      ]);
      setMode(accountRes.mode);
      setAccount(accountRes.account);
      setBanks(banksRes.banks);
      setPhase(accountRes.account && !accountRes.account.needsReverify ? 'idle' : 'editing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payout details.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    return q ? banks.filter((b) => b.name.toLowerCase().includes(q)) : banks;
  }, [banks, bankQuery]);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  const numberValid = /^\d{10}$/.test(accountNumber);
  const canSubmit = isConnected && Boolean(bank) && numberValid && phase !== 'verifying';

  function startEditing() {
    setSavedMessage(null);
    setError(null);
    setBank(account ? banks.find((b) => b.code === account.bankCode) ?? null : null);
    setAccountNumber('');
    setPhase('editing');
  }

  async function submit() {
    if (!canSubmit || !bank) return;
    setPhase('verifying');
    setError(null);
    try {
      const res = await apiFetch<AccountResponse & { releasedPayouts: number }>('/payout-account', {
        method: 'PUT',
        body: JSON.stringify({ bankCode: bank.code, accountNumber }),
      });
      setMode(res.mode);
      setAccount(res.account);
      setAccountNumber('');
      setSavedMessage(
        res.releasedPayouts > 0
          ? `Account verified. ${res.releasedPayouts} payout${res.releasedPayouts === 1 ? '' : 's'} can now be released.`
          : 'Account verified. Future payouts will go to this account.',
      );
      setPhase('idle');
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not verify this account.');
      setPhase('editing');
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Payout account" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!isConnected ? <OfflineBanner message="Reconnect to update your payout account." /> : null}

        {mode === 'simulate' ? (
          <AlertBanner
            variant="info"
            title="Test mode"
            message="Bank details are checked in test mode. No real money is sent until live payouts are switched on."
          />
        ) : null}

        {account?.needsReverify ? (
          <AlertBanner
            variant="warning"
            title="Re-verify your account"
            message="Live payouts are now on. Confirm your bank details again so we can pay you."
          />
        ) : null}

        {savedMessage ? <AlertBanner variant="success" title={savedMessage} /> : null}
        {error && phase !== 'error' ? <AlertBanner variant="error" title="Couldn't verify account" message={error} /> : null}

        <Text style={styles.lead}>
          Payouts for completed orders are sent to this Nigerian bank account. Only the last four digits are shown.
        </Text>

        {phase === 'loading' ? (
          <View style={styles.working}>
            <SpinnerArcIcon size={16} color={Palette.plum} />
            <Text style={styles.workingText}>Loading payout details…</Text>
          </View>
        ) : null}

        {phase === 'error' ? (
          <>
            <AlertBanner variant="error" title="Couldn't load payout details" message={error ?? undefined} />
            <Button label="Try again" variant="secondary" onPress={() => void load()} disabled={!isConnected} />
          </>
        ) : null}

        {phase === 'idle' && account ? (
          <>
            <View style={styles.card}>
              <View style={styles.accountRow}>
                <CheckIcon color={Palette.success} />
                <View style={styles.flex}>
                  <Text style={styles.accountName}>{account.accountName}</Text>
                  <Text style={styles.accountMeta}>
                    {account.bankName} · {account.accountNumberMasked}
                  </Text>
                </View>
              </View>
            </View>
            <Button label="Change account" variant="secondary" onPress={startEditing} disabled={!isConnected} />
          </>
        ) : null}

        {phase === 'editing' || phase === 'verifying' ? (
          <>
            <Text style={styles.sectionLabel}>Bank</Text>
            <View style={styles.card}>
              <Pressable
                style={styles.pickerRow}
                onPress={() => setPickerOpen((open) => !open)}
                disabled={phase === 'verifying'}
              >
                <Text style={[styles.pickerValue, !bank && styles.placeholder]}>{bank?.name ?? 'Select your bank'}</Text>
                <Ionicons name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={15} color={Palette.muted2} />
              </Pressable>
              {pickerOpen ? (
                <View style={styles.pickerList}>
                  <TextField
                    placeholder="Search banks"
                    value={bankQuery}
                    onChangeText={setBankQuery}
                    autoCorrect={false}
                    containerStyle={styles.search}
                  />
                  {filteredBanks.map((item) => (
                    <Pressable
                      key={item.code}
                      style={styles.bankOption}
                      onPress={() => {
                        setBank(item);
                        setPickerOpen(false);
                        setBankQuery('');
                      }}
                    >
                      <Text style={styles.bankName}>{item.name}</Text>
                      {bank?.code === item.code ? <CheckIcon color={Palette.plum} /> : null}
                    </Pressable>
                  ))}
                  {filteredBanks.length === 0 ? <Text style={styles.empty}>No banks match your search.</Text> : null}
                </View>
              ) : null}
            </View>

            <TextField
              label="Account number"
              placeholder="10-digit NUBAN"
              value={accountNumber}
              onChangeText={(text) => setAccountNumber(text.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              editable={phase !== 'verifying'}
              error={accountNumber.length > 0 && !numberValid ? 'Enter all 10 digits' : null}
            />

            <Button
              label={phase === 'verifying' ? 'Verifying account…' : 'Verify account'}
              loading={phase === 'verifying'}
              onPress={() => void submit()}
              disabled={!canSubmit}
            />
            {account && !account.needsReverify ? (
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setPhase('idle')}
                disabled={phase === 'verifying'}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  flex: { flex: 1, gap: 2 },
  lead: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    marginBottom: -Spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  accountRow: { flexDirection: 'row', gap: 11, padding: 15, alignItems: 'center' },
  accountName: { fontSize: 14, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  accountMeta: { fontSize: 12, fontFamily: Typography.body, color: Palette.muted },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  pickerValue: { fontSize: 14, fontFamily: Typography.body, color: Palette.espresso },
  placeholder: { color: Palette.muted },
  pickerList: { borderTopWidth: 1, borderTopColor: Palette.divider, maxHeight: 360 },
  search: { margin: 12 },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  bankName: { fontSize: 14, fontFamily: Typography.body, color: Palette.espresso },
  empty: { padding: 15, fontSize: 12.5, fontFamily: Typography.body, color: Palette.muted },
  working: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  workingText: { fontSize: 12.5, fontFamily: Typography.bodySemiBold, color: Palette.plum },
});
