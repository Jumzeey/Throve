import { Router } from 'express';
import { z } from 'zod';
import { ensurePayoutForOrder } from '../lib/admin-payouts.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { getProfileById } from '../lib/mappers.js';
import { getPaymentsProvider } from '../lib/payments/provider.js';
import { createServiceClient } from '../lib/supabase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

type AccountRow = {
  bank_code: string;
  bank_name: string;
  account_number_last4: string;
  account_name: string;
  status: string;
  provider: string;
  verified_at: string | null;
  updated_at: string;
};

function mapAccount(row: AccountRow | null) {
  const provider = getPaymentsProvider();
  if (!row) return null;
  return {
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountNumberMasked: `******${row.account_number_last4}`,
    accountName: row.account_name,
    status: row.status,
    provider: row.provider,
    // Accounts verified under simulate must be re-verified once live payouts are on.
    needsReverify: row.status === 'verified' && row.provider !== provider.name,
    verifiedAt: row.verified_at,
    updatedAt: row.updated_at,
  };
}

async function releaseVerificationHolds(sellerId: string) {
  const service = createServiceClient();
  const { data: waiting, error } = await service
    .from('payouts')
    .select('order_id')
    .eq('seller_id', sellerId)
    .eq('status', 'verification_required');
  if (error) {
    console.warn('[payout-account] load verification_required failed', error.message);
    return 0;
  }
  for (const row of waiting ?? []) {
    await ensurePayoutForOrder(service, {
      orderId: String(row.order_id),
      intent: 'eligible',
      actorId: sellerId,
      reason: 'Seller payout account verified',
    });
  }
  return waiting?.length ?? 0;
}

router.get('/banks', requireAuth, async (_req, res) => {
  try {
    const banks = await getPaymentsProvider().listBanks();
    return res.json({ mode: getPaymentsProvider().name, banks });
  } catch (err) {
    return sendError(res, 502, err instanceof Error ? err.message : 'Could not load banks');
  }
});

router.get('/', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const service = createServiceClient();
  const { data, error } = await service
    .from('seller_payout_accounts')
    .select('bank_code, bank_name, account_number_last4, account_name, status, provider, verified_at, updated_at')
    .eq('seller_id', userId)
    .maybeSingle();
  if (error) return handleSupabaseError(res, error);
  return res.json({ mode: getPaymentsProvider().name, account: mapAccount(data as AccountRow | null) });
});

router.put('/', requireAuth, async (req, res) => {
  const { supabase, userId } = req as AuthedRequest;
  const parsed = z
    .object({
      bankCode: z.string().min(2).max(10),
      accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, parsed.error.issues[0]?.message ?? 'Invalid bank details', 'VALIDATION');
  }

  const provider = getPaymentsProvider();
  let bankName: string;
  let accountName: string;
  let recipientId: string;
  try {
    const banks = await provider.listBanks();
    const bank = banks.find((b) => b.code === parsed.data.bankCode);
    if (!bank) return sendError(res, 400, 'Unknown bank', 'UNKNOWN_BANK');
    bankName = bank.name;

    const profile = await getProfileById(supabase, userId);
    const resolved = await provider.resolveAccount({
      bankCode: bank.code,
      accountNumber: parsed.data.accountNumber,
      fallbackName: profile?.name ?? profile?.username ?? '',
    });
    accountName = resolved.accountName;

    const recipient = await provider.createRecipient({
      sellerId: userId,
      bankCode: bank.code,
      bankName,
      accountNumber: parsed.data.accountNumber,
      accountName,
    });
    recipientId = recipient.recipientId;
  } catch (err) {
    return sendError(res, 502, err instanceof Error ? err.message : 'Could not verify bank account', 'VERIFY_FAILED');
  }

  const service = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await service
    .from('seller_payout_accounts')
    .upsert(
      {
        seller_id: userId,
        bank_code: parsed.data.bankCode,
        bank_name: bankName,
        account_number: parsed.data.accountNumber,
        account_number_last4: parsed.data.accountNumber.slice(-4),
        account_name: accountName,
        status: 'verified',
        provider: provider.name,
        provider_recipient_id: recipientId,
        failure_reason: null,
        verified_at: now,
      },
      { onConflict: 'seller_id' },
    )
    .select('bank_code, bank_name, account_number_last4, account_name, status, provider, verified_at, updated_at')
    .single();
  if (error) return handleSupabaseError(res, error);

  const { error: profileError } = await service.from('profiles').update({ payout_verified: true }).eq('id', userId);
  if (profileError) return handleSupabaseError(res, profileError);

  const released = await releaseVerificationHolds(userId);

  return res.json({ mode: provider.name, account: mapAccount(data as AccountRow), releasedPayouts: released });
});

export default router;
