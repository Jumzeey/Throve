import type { Bank, PaymentsProvider, ProviderOpResult } from './provider.js';

const FLW_BASE = process.env.FLW_BASE_URL ?? 'https://api.flutterwave.com/v3';

export type FlutterwaveInitInput = {
  txRef: string;
  amount: number;
  currency?: string;
  customer: { email: string; name: string; phonenumber?: string };
  redirectUrl: string;
  meta?: Record<string, string | number | boolean | null>;
  title?: string;
  description?: string;
};

export async function flutterwaveInitPayment(input: FlutterwaveInitInput) {
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret) throw new Error('FLW_SECRET_KEY is not configured');

  const response = await fetch(`${FLW_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency ?? 'NGN',
      redirect_url: input.redirectUrl,
      customer: input.customer,
      customizations: {
        title: input.title ?? 'Throve',
        description: input.description ?? 'Order payment',
      },
      meta: input.meta ?? {},
    }),
  });

  const payload = (await response.json()) as {
    status?: string;
    message?: string;
    data?: { link?: string; id?: number };
  };

  if (!response.ok || payload.status !== 'success' || !payload.data?.link) {
    throw new Error(payload.message ?? 'Flutterwave payment init failed');
  }

  return {
    checkoutUrl: payload.data.link,
    providerRef: payload.data.id != null ? String(payload.data.id) : null,
  };
}

export async function flutterwaveVerifyByRef(txRef: string) {
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret) throw new Error('FLW_SECRET_KEY is not configured');

  const response = await fetch(
    `${FLW_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    },
  );

  const payload = (await response.json()) as {
    status?: string;
    message?: string;
    data?: {
      id?: number;
      tx_ref?: string;
      status?: string;
      amount?: number;
      currency?: string;
    };
  };

  if (!response.ok || payload.status !== 'success' || !payload.data) {
    throw new Error(payload.message ?? 'Flutterwave verify failed');
  }

  return {
    providerRef: payload.data.id != null ? String(payload.data.id) : null,
    txRef: payload.data.tx_ref ?? txRef,
    status: String(payload.data.status ?? '').toLowerCase(),
    amount: Number(payload.data.amount ?? 0),
    currency: payload.data.currency ?? 'NGN',
  };
}

export function flutterwaveWebhookVerified(signature: string | undefined) {
  const secretHash = process.env.FLW_SECRET_HASH ?? process.env.FLW_WEBHOOK_HASH;
  if (!secretHash) return false;
  return Boolean(signature && signature === secretHash);
}

type FlwEnvelope<T> = { status?: string; message?: string; data?: T };

/** Authenticated call to the Flutterwave v3 API; throws with Flutterwave's message on failure. */
async function flw<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret) throw new Error('FLW_SECRET_KEY is not configured');
  const response = await fetch(`${FLW_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload: FlwEnvelope<T>;
  try {
    payload = (await response.json()) as FlwEnvelope<T>;
  } catch {
    throw new Error(`Flutterwave ${method} ${path} failed (${response.status})`);
  }
  if (!response.ok || payload.status !== 'success') {
    throw new Error(payload.message ?? `Flutterwave ${method} ${path} failed (${response.status})`);
  }
  return payload.data as T;
}

/** "test" when the configured secret key is a Flutterwave test key, else "live". */
export function flutterwaveEnvironment(): 'test' | 'live' {
  return (process.env.FLW_SECRET_KEY ?? '').includes('_TEST') ? 'test' : 'live';
}

function transferStatus(raw: string | undefined): ProviderOpResult['status'] {
  const status = String(raw ?? '').toUpperCase();
  if (status === 'SUCCESSFUL') return 'successful';
  if (status === 'FAILED') return 'failed';
  return 'pending'; // NEW, PENDING
}

function refundStatus(raw: string | undefined): ProviderOpResult['status'] {
  const status = String(raw ?? '').toLowerCase();
  if (status === 'completed' || status === 'successful') return 'successful';
  if (status === 'failed') return 'failed';
  return 'pending';
}

let bankCache: { at: number; banks: Bank[] } | null = null;
const BANK_CACHE_MS = 6 * 60 * 60_000;

/** Payouts, refunds and bank checks through Flutterwave v3 (test or live, per FLW_SECRET_KEY). */
export const flutterwaveProvider: PaymentsProvider = {
  name: 'flutterwave',
  async listBanks() {
    if (bankCache && Date.now() - bankCache.at < BANK_CACHE_MS) return bankCache.banks;
    const data = await flw<{ code: string; name: string }[]>('GET', '/banks/NG');
    const seen = new Set<string>();
    const banks = data
      .filter((bank) => bank.code && bank.name && !seen.has(bank.code) && seen.add(bank.code))
      .map((bank) => ({ code: String(bank.code), name: String(bank.name).trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
    bankCache = { at: Date.now(), banks };
    return banks;
  },
  async resolveAccount({ bankCode, accountNumber }) {
    const data = await flw<{ account_name?: string }>('POST', '/accounts/resolve', {
      account_number: accountNumber,
      account_bank: bankCode,
    });
    if (!data?.account_name) throw new Error('Could not confirm the account name with the bank');
    return { accountName: data.account_name };
  },
  async createRecipient(account) {
    try {
      const data = await flw<{ id?: number }>('POST', '/beneficiaries', {
        account_bank: account.bankCode,
        account_number: account.accountNumber,
        beneficiary_name: account.accountName,
        currency: 'NGN',
      });
      if (data?.id == null) throw new Error('Flutterwave did not return a beneficiary id');
      return { recipientId: String(data.id) };
    } catch (err) {
      // Transfers go by bank + account number, so an existing beneficiary is fine.
      if (err instanceof Error && /already/i.test(err.message)) {
        return { recipientId: `acct:${account.bankCode}:${account.accountNumber}` };
      }
      throw err;
    }
  },
  async transfer({ payoutId, amount, bankCode, accountNumber, narration }) {
    if (!bankCode || !accountNumber) {
      return { status: 'failed', providerRef: null, message: 'Seller has no verified payout account' };
    }
    // Flutterwave rejects reused references, so each attempt (incl. retries) gets its own.
    const reference = `${payoutId}-${Date.now().toString(36)}`;
    const data = await flw<{ id?: number; status?: string; complete_message?: string }>('POST', '/transfers', {
      account_bank: bankCode,
      account_number: accountNumber,
      amount,
      currency: 'NGN',
      debit_currency: 'NGN',
      narration,
      reference,
    });
    return {
      status: transferStatus(data?.status),
      providerRef: data?.id != null ? String(data.id) : null,
      message: data?.complete_message,
    };
  },
  async transferStatus(providerRef) {
    const data = await flw<{ id?: number; status?: string; complete_message?: string }>(
      'GET',
      `/transfers/${encodeURIComponent(providerRef)}`,
    );
    return { status: transferStatus(data?.status), providerRef, message: data?.complete_message };
  },
  async refund({ txProviderRef, amount }) {
    if (!txProviderRef) {
      return { status: 'failed', providerRef: null, message: 'Original Flutterwave transaction not found for this order' };
    }
    const data = await flw<{ id?: number; status?: string }>(
      'POST',
      `/transactions/${encodeURIComponent(txProviderRef)}/refund`,
      { amount },
    );
    return {
      status: refundStatus(data?.status),
      providerRef: data?.id != null ? String(data.id) : null,
    };
  },
  async refundStatus(providerRef) {
    const data = await flw<{ status?: string }>('GET', `/refunds/${encodeURIComponent(providerRef)}`);
    return { status: refundStatus(data?.status), providerRef };
  },
};
