import { createServiceClient } from '../lib/supabase.js';

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
      const { data, error } = await supabase.rpc('expire_stale_live_claims');
      if (error) {
        console.warn('[claim-expiry]', error.message);
        return;
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
