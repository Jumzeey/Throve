import { createServiceClient } from '../lib/supabase.js';
import { liveClaimExpiredEmail } from '../lib/email/templates/live.js';
import { notifyUser } from '../lib/notify.js';

const INTERVAL_MS = 30_000;
let timer: ReturnType<typeof setInterval> | null = null;

export function startClaimExpiryWorker() {
  if (timer) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[claim-expiry] SUPABASE_SERVICE_ROLE_KEY missing; worker disabled');
    return;
  }

  const tick = async () => {
    try {
      const supabase = createServiceClient();
      const nowIso = new Date().toISOString();
      const { data: expiring } = await supabase
        .from('live_claims')
        .select('id, user_id, live_session_id, listing_id')
        .eq('status', 'active')
        .lt('expires_at', nowIso)
        .limit(50);

      const { data, error } = await supabase.rpc('expire_stale_live_claims');
      if (error) {
        console.warn('[claim-expiry]', error.message);
        return;
      }

      const sessionIds = [
        ...new Set((expiring ?? []).map((claim) => String(claim.live_session_id)).filter(Boolean)),
      ];
      const hostBySession = new Map<string, string>();
      if (sessionIds.length) {
        const { data: sessions } = await supabase
          .from('live_sessions')
          .select('id, host_id')
          .in('id', sessionIds);
        for (const session of sessions ?? []) {
          hostBySession.set(String(session.id), String(session.host_id));
        }
      }

      for (const claim of expiring ?? []) {
        let listingTitle = 'your item';
        if (claim.listing_id) {
          const { data: listing } = await supabase
            .from('listings')
            .select('title')
            .eq('id', claim.listing_id)
            .maybeSingle();
          if (listing?.title) listingTitle = String(listing.title);
        }
        const sessionId = String(claim.live_session_id);
        void notifyUser({
          userId: String(claim.user_id),
          category: 'live',
          type: 'live_claim_expired',
          title: 'Your claim expired',
          body: listingTitle,
          deepLink: `live/${sessionId}`,
          data: {
            sessionId,
            claimId: String(claim.id),
          },
          email: liveClaimExpiredEmail({
            sessionId,
            listingTitle,
          }),
        });

        const hostId = hostBySession.get(sessionId);
        if (hostId && hostId !== String(claim.user_id)) {
          void notifyUser({
            userId: hostId,
            category: 'live',
            type: 'live_claim_expired_host',
            title: 'Claim expired — stock freed',
            body: listingTitle,
            deepLink: `live/${sessionId}`,
            data: {
              sessionId,
              claimId: String(claim.id),
            },
          });
        }
      }

      if (typeof data === 'number' && data > 0) {
        console.log(`[claim-expiry] expired ${data} claim(s)`);
      }
    } catch (err) {
      console.warn('[claim-expiry]', err instanceof Error ? err.message : err);
    }
  };

  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();
}

export function stopClaimExpiryWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
