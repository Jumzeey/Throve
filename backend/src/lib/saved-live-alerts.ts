import { listFollowerIds } from './follows.js';
import { createServiceClient } from './supabase.js';
import { notifyUser } from './notify.js';

/** Notify savers when a live starts, skipping followers already covered by follower fan-out. */
export async function notifySaversOfLiveStarted(input: {
  hostId: string;
  hostUsername: string;
  sessionId: string;
  title: string;
}): Promise<void> {
  try {
    const admin = createServiceClient();
    const [{ data, error }, followerIds] = await Promise.all([
      admin.from('saved_lives').select('user_id').eq('session_id', input.sessionId),
      listFollowerIds(input.hostId),
    ]);
    if (error) {
      console.warn('[saved-live-alerts]', error.message);
      return;
    }

    const followers = new Set(followerIds);
    const saverIds = [
      ...new Set(
        (data ?? [])
          .map((row) => String(row.user_id))
          .filter((id) => id && id !== input.hostId && !followers.has(id)),
      ),
    ];
    if (!saverIds.length) return;

    await Promise.all(
      saverIds.map((userId) =>
        notifyUser({
          userId,
          category: 'live',
          type: 'saved_live_started',
          title: `@${input.hostUsername} is live now`,
          body: input.title,
          deepLink: `live/${input.sessionId}`,
          data: {
            sessionId: input.sessionId,
            sellerUsername: input.hostUsername,
          },
        }),
      ),
    );
  } catch (err) {
    console.warn('[saved-live-alerts]', err instanceof Error ? err.message : err);
  }
}
