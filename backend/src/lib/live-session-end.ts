import { liveEndedWithClaimEmail } from './email/templates/live.js';
import { notifyUser } from './notify.js';
import { createServiceClient } from './supabase.js';

export type LiveEndedReason = 'host' | 'staff' | 'connection';

export type LiveSessionEndRow = {
  id: string;
  status: string;
  ended_at?: string | null;
  peak_viewers?: number | null;
  viewers?: number | null;
  products_shown?: number | null;
  started_at?: string | null;
  title?: string | null;
  host_id?: string;
};

/**
 * Finalize a live session as ended + fire claim notifications (best-effort).
 * Used by host end and staff admin end so behavior stays in sync.
 */
export async function finalizeLiveSessionEnd(input: {
  sessionId: string;
  session: LiveSessionEndRow;
  endedReason: LiveEndedReason;
  peakViewersClient?: number;
  /** When set, update is scoped to host (host end path). */
  hostId?: string;
}): Promise<{
  alreadyEnded: boolean;
  endedAt: string;
  peakViewers: number;
}> {
  const service = createServiceClient();
  const endedAt =
    input.session.status === 'ended' && input.session.ended_at
      ? String(input.session.ended_at)
      : new Date().toISOString();
  const peakViewers = Math.max(
    Number(input.session.peak_viewers ?? 0),
    Number(input.session.viewers ?? 0),
    input.peakViewersClient ?? 0,
  );

  if (input.session.status === 'ended') {
    return { alreadyEnded: true, endedAt, peakViewers };
  }

  let query = service
    .from('live_sessions')
    .update({
      status: 'ended',
      ended_at: endedAt,
      peak_viewers: peakViewers,
      viewers: 0,
      ended_reason: input.endedReason,
    })
    .eq('id', input.sessionId);

  if (input.hostId) {
    query = query.eq('host_id', input.hostId);
  }

  const { error } = await query;
  if (error) throw error;

  void notifyOpenClaimsOnEnd(input.sessionId);
  return { alreadyEnded: false, endedAt, peakViewers };
}

export async function notifyOpenClaimsOnEnd(sessionId: string) {
  try {
    const service = createServiceClient();
    const { data: openClaims } = await service
      .from('live_claims')
      .select('id, user_id, listing_id')
      .eq('live_session_id', sessionId)
      .eq('status', 'active')
      .limit(100);
    if (!openClaims?.length) return;

    const listingIds = [
      ...new Set(
        openClaims
          .map((claim) => (claim.listing_id ? String(claim.listing_id) : ''))
          .filter(Boolean),
      ),
    ];
    const titleByListingId = new Map<string, string>();
    if (listingIds.length) {
      const { data: listings } = await service
        .from('listings')
        .select('id, title')
        .in('id', listingIds);
      for (const listing of listings ?? []) {
        if (listing?.id && listing?.title) {
          titleByListingId.set(String(listing.id), String(listing.title));
        }
      }
    }

    for (const claim of openClaims) {
      const listingTitle = claim.listing_id
        ? titleByListingId.get(String(claim.listing_id)) ?? 'your item'
        : 'your item';
      void notifyUser({
        userId: String(claim.user_id),
        category: 'live',
        type: 'live_ended_with_claim',
        title: 'Live ended — finish checkout',
        body: listingTitle,
        deepLink: `live/${sessionId}`,
        data: { sessionId, claimId: String(claim.id) },
        email: liveEndedWithClaimEmail({
          sessionId,
          listingTitle,
        }),
      });
    }
  } catch (err) {
    console.warn('[live/end] claim notify failed', err);
  }
}
