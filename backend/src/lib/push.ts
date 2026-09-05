import { createServiceClient } from './supabase.js';

type ExpoPushTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

export async function sendExpoPush(input: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
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
  if (!tokens.length) return;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: input.title,
          body: input.body,
          sound: 'default',
          data: input.data ?? {},
        })),
      ),
    });
    const payload = (await response.json().catch(() => null)) as { data?: ExpoPushTicket[] } | null;
    const tickets = payload?.data ?? [];
    const stale = tokens.filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered');
    if (stale.length) {
      await admin.from('device_push_tokens').delete().in('expo_push_token', stale);
    }
  } catch (err) {
    console.warn('[push]', err instanceof Error ? err.message : err);
  }
}
