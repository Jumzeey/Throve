import { queueEmail } from './email/send.js';
import type { EmailContent } from './email/layout.js';
import { sendExpoPush } from './push.js';
import { createServiceClient } from './supabase.js';

export type NotifyUserInput = {
  userId: string;
  category: 'message' | 'offer' | 'order' | 'live' | 'listing' | 'account';
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
  email?: EmailContent;
};

/** In-app row + optional email + Expo push. Never throws. */
export async function notifyUser(input: NotifyUserInput): Promise<void> {
  try {
    const admin = createServiceClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, notif_offers, notif_messages, notif_live, notif_push_enabled, deactivated')
      .eq('id', input.userId)
      .maybeSingle();
    if (profileError) {
      console.warn('[notify]', profileError.message);
      return;
    }
    if (!profile || profile.deactivated) return;

    if (input.category === 'offer' && profile.notif_offers === false) return;
    if (input.category === 'message' && profile.notif_messages === false) return;
    if (input.category === 'live' && profile.notif_live === false) return;

    const { error } = await admin.from('notifications').insert({
      user_id: input.userId,
      category: input.category,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      deep_link: input.deepLink ?? '',
    });
    if (error) console.warn('[notify]', error.message);

    if (input.email) {
      const preference =
        input.category === 'offer' ? 'offers' : input.category === 'message' ? 'messages' : input.category === 'live' ? 'live' : undefined;
      queueEmail({
        toUserId: input.userId,
        preference,
        content: input.email,
      });
    }

    if (profile.notif_push_enabled !== false) {
      await sendExpoPush({
        userId: input.userId,
        title: input.title,
        body: input.body,
        data: {
          type: input.type,
          deepLink: input.deepLink ?? '',
          ...(input.data ?? {}),
        },
      });
    }
  } catch (err) {
    console.warn('[notify]', err instanceof Error ? err.message : err);
  }
}
