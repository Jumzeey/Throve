import { createServiceClient } from '../lib/supabase.js';
import { offerExpiredEmail } from '../lib/email/templates/offers.js';
import { notifyUser } from '../lib/notify.js';

const INTERVAL_MS = 60_000;
let timer: ReturnType<typeof setInterval> | null = null;

async function listingTitle(listingId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase.from('listings').select('title').eq('id', listingId).maybeSingle();
  return (data?.title as string) || 'your listing';
}

export function startOfferExpiryWorker() {
  if (timer) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[offer-expiry] SUPABASE_SERVICE_ROLE_KEY missing; worker disabled');
    return;
  }

  const tick = async () => {
    try {
      const supabase = createServiceClient();
      const now = new Date().toISOString();
      const { data: stale, error } = await supabase
        .from('offers')
        .select('id, listing_id, buyer_id, seller_id, amount')
        .eq('status', 'pending')
        .lt('expires_at', now)
        .limit(50);

      if (error) {
        console.warn('[offer-expiry]', error.message);
        return;
      }
      if (!stale?.length) return;

      for (const offer of stale) {
        const { data: updated, error: updateError } = await supabase
          .from('offers')
          .update({ status: 'expired' })
          .eq('id', offer.id)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();

        if (updateError || !updated) continue;

        const title = await listingTitle(String(offer.listing_id));
        const content = offerExpiredEmail({
          offerId: String(offer.id),
          listingTitle: title,
          amount: Number(offer.amount),
          otherUsername: '',
        });

        await Promise.all([
          notifyUser({
            userId: String(offer.buyer_id),
            category: 'offer',
            type: 'offer_expired',
            title: 'Offer expired',
            body: title,
            deepLink: `inbox/offer/${offer.id}`,
            data: { offerId: String(offer.id) },
            email: content,
          }),
          notifyUser({
            userId: String(offer.seller_id),
            category: 'offer',
            type: 'offer_expired',
            title: 'Offer expired',
            body: title,
            deepLink: `inbox/offer/${offer.id}`,
            data: { offerId: String(offer.id) },
            email: content,
          }),
        ]);
      }

      console.log(`[offer-expiry] expired ${stale.length} offer(s)`);
    } catch (err) {
      console.warn('[offer-expiry]', err instanceof Error ? err.message : err);
    }
  };

  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();
}

export function stopOfferExpiryWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
