import { createServiceClient } from '../supabase.js';

export type NotificationPreference = 'offers' | 'messages';

export type Recipient = {
  userId: string;
  email: string;
  username: string;
  name: string;
  notifOffers: boolean;
  notifMessages: boolean;
};

/** Resolve profile email + notification prefs for a user id. */
export async function resolveRecipient(userId: string): Promise<Recipient | null> {
  const admin = createServiceClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, email, username, name, notif_offers, notif_messages, deactivated')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[email/recipients]', error.message);
    return null;
  }
  if (!profile || profile.deactivated) return null;

  let email = (profile.email as string | null)?.trim() || '';
  if (!email) {
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data.user?.email?.trim() || '';
    } catch (err) {
      console.warn('[email/recipients] auth lookup failed', err instanceof Error ? err.message : err);
    }
  }
  if (!email) return null;

  return {
    userId: profile.id as string,
    email,
    username: (profile.username as string) || 'user',
    name: (profile.name as string) || '',
    notifOffers: profile.notif_offers !== false,
    notifMessages: profile.notif_messages !== false,
  };
}

export function preferenceAllows(recipient: Recipient, preference?: NotificationPreference) {
  if (!preference) return true;
  if (preference === 'offers') return recipient.notifOffers;
  if (preference === 'messages') return recipient.notifMessages;
  return true;
}
