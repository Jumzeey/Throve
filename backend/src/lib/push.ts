import { createServiceClient } from './supabase.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createSign } from 'node:crypto';

type ExpoPushTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function loadServiceAccount(): ServiceAccount | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    try {
      return JSON.parse(inline) as ServiceAccount;
    } catch {
      console.warn('[push] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }
  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    join(process.cwd(), 'firebase-service-account.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount;
    } catch (err) {
      console.warn('[push] failed reading service account', err instanceof Error ? err.message : err);
    }
  }
  return null;
}

function isExpoToken(token: string) {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

async function googleAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const unsigned = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, 'base64url');
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string; error?: string } | null;
  if (!response.ok || !payload?.access_token) {
    console.warn('[push] google token', payload?.error || response.status);
    return null;
  }
  return payload.access_token;
}

async function sendFcm(input: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
  sound?: string | null;
  sa: ServiceAccount;
}): Promise<'ok' | 'stale' | 'error'> {
  const access = await googleAccessToken(input.sa);
  if (!access) return 'error';

  const androidSound = input.sound === null ? undefined : input.sound ?? 'default';
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${input.sa.project_id}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: input.token,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: Object.fromEntries(
          Object.entries(input.data ?? {}).map(([key, value]) => [key, String(value)]),
        ),
        android: {
          priority: 'HIGH',
          notification: {
            channelId: input.channelId ?? 'default',
            sound: androidSound,
            // Matches expo-notifications plugin drawable (@drawable/notification_icon)
            icon: 'notification_icon',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: androidSound === undefined ? undefined : androidSound === 'default' ? 'default' : androidSound,
            },
          },
        },
      },
    }),
  });

  if (response.ok) return 'ok';
  const payload = (await response.json().catch(() => null)) as {
    error?: { details?: Array<{ errorCode?: string }>; message?: string };
  } | null;
  const code = payload?.error?.details?.find((item) => item.errorCode)?.errorCode;
  if (code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') return 'stale';
  console.warn('[push] fcm', payload?.error?.message || response.status);
  return 'error';
}

async function sendExpo(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
  sound?: string | null;
}): Promise<string[]> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      input.tokens.map((to) => ({
        to,
        title: input.title,
        body: input.body,
        sound: input.sound === null ? null : input.sound ?? 'default',
        priority: 'high',
        channelId: input.channelId ?? 'default',
        data: input.data ?? {},
      })),
    ),
  });
  const payload = (await response.json().catch(() => null)) as { data?: ExpoPushTicket[] } | null;
  const tickets = payload?.data ?? [];
  return input.tokens.filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered');
}

export async function sendExpoPush(input: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
  sound?: string | null;
}): Promise<void> {
  const admin = createServiceClient();
  const { data: rows, error } = await admin
    .from('device_push_tokens')
    .select('expo_push_token')
    .eq('user_id', input.userId);

  if (error) {
    console.warn('[push]', error.message);
    return;
  }

  const tokens = [...new Set((rows ?? []).map((row) => String(row.expo_push_token || '')).filter(Boolean))];
  if (!tokens.length) {
    console.warn(`[push] no device tokens for user ${input.userId}`);
    return;
  }

  const expoTokens = tokens.filter(isExpoToken);
  const deviceTokens = tokens.filter((token) => !isExpoToken(token));
  const stale: string[] = [];

  if (expoTokens.length) {
    try {
      stale.push(
        ...(await sendExpo({
          tokens: expoTokens,
          title: input.title,
          body: input.body,
          data: input.data,
          channelId: input.channelId,
          sound: input.sound,
        })),
      );
    } catch (err) {
      console.warn('[push] expo', err instanceof Error ? err.message : err);
    }
  }

  if (deviceTokens.length) {
    const sa = loadServiceAccount();
    if (!sa) {
      console.warn(
        '[push] native FCM/APNs tokens present but FIREBASE_SERVICE_ACCOUNT_JSON/PATH is missing — cannot deliver',
      );
    } else {
      for (const token of deviceTokens) {
        try {
          const result = await sendFcm({
            token,
            title: input.title,
            body: input.body,
            data: input.data,
            channelId: input.channelId,
            sound: input.sound,
            sa,
          });
          if (result === 'stale') stale.push(token);
        } catch (err) {
          console.warn('[push] fcm send', err instanceof Error ? err.message : err);
        }
      }
    }
  }

  if (stale.length) {
    await admin.from('device_push_tokens').delete().in('expo_push_token', stale);
  }
}
