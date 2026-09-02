import { createServiceClient } from '../lib/supabase.js';
import { queueEmail } from '../lib/email/send.js';
import { orderReviewNudgeEmail } from '../lib/email/templates/orders.js';

const INTERVAL_MS = 15 * 60_000;
const NUDGE_AFTER_MS = 24 * 60 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | null = null;

export function startReviewNudgeWorker() {
  if (timer) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[review-nudge] SUPABASE_SERVICE_ROLE_KEY missing; worker disabled');
    return;
  }

  const tick = async () => {
    try {
      const supabase = createServiceClient();
      const cutoff = new Date(Date.now() - NUDGE_AFTER_MS).toISOString();
      const { data, error } = await supabase
        .from('orders')
        .select('id, listing_title, buyer_id, review_nudge_sent')
        .eq('status', 'completed')
        .eq('reviewed', false)
        .eq('review_nudge_sent', false)
        .lt('updated_at', cutoff)
        .limit(25);

      if (error) {
        // Column may not exist until migration is applied — fail soft.
        if (error.message.includes('review_nudge_sent')) {
          console.warn('[review-nudge] review_nudge_sent column missing; skip until migration');
          return;
        }
        console.warn('[review-nudge]', error.message);
        return;
      }
      if (!data?.length) return;

      for (const order of data) {
        const { data: claimed } = await supabase
          .from('orders')
          .update({ review_nudge_sent: true })
          .eq('id', order.id)
          .eq('review_nudge_sent', false)
          .eq('reviewed', false)
          .select('id')
          .maybeSingle();
        if (!claimed) continue;

        queueEmail({
          toUserId: String(order.buyer_id),
          content: orderReviewNudgeEmail({
            orderId: String(order.id),
            listingTitle: String(order.listing_title),
            total: 0,
          }),
        });
      }
    } catch (err) {
      console.warn('[review-nudge]', err instanceof Error ? err.message : err);
    }
  };

  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();
}

export function stopReviewNudgeWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
