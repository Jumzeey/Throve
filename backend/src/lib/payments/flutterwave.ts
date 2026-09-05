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
