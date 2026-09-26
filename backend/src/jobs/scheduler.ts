import { randomUUID } from 'crypto';
import { runAutoCompleteDueOrders } from '../lib/order-map.js';
import { reconcilePendingProviderOps } from '../lib/payments/settle.js';
import { createServiceClient } from '../lib/supabase.js';

const INTERVAL_MS = 5 * 60_000;
const LEASE_NAME = 'payments-scheduler';
const LEASE_TTL_SECONDS = 4 * 60;
const STALE_INTENT_MS = 60 * 60_000;
const owner = randomUUID();
let timer: ReturnType<typeof setInterval> | null = null;

async function expireStaleIntents(supabase: ReturnType<typeof createServiceClient>) {
  const cutoff = new Date(Date.now() - STALE_INTENT_MS).toISOString();
  const { data, error } = await supabase
    .from('payment_intents')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    console.warn(`[scheduler] ${name}`, err instanceof Error ? err.message : err);
  }
}

export function startScheduler() {
  if (timer) return;
  if (process.env.ENABLE_JOBS !== 'true') return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[scheduler] SUPABASE_SERVICE_ROLE_KEY missing; scheduler disabled');
    return;
  }

  const tick = async () => {
    const supabase = createServiceClient();
    const { data: claimed, error } = await supabase.rpc('claim_job_lease', {
      p_name: LEASE_NAME,
      p_owner: owner,
      p_ttl_seconds: LEASE_TTL_SECONDS,
    });
    if (error) {
      console.warn('[scheduler] lease', error.message);
      return;
    }
    if (!claimed) return;

    await step('auto-complete', () => runAutoCompleteDueOrders(supabase));
    await step('reconcile', () => reconcilePendingProviderOps(supabase));
    await step('expire-intents', async () => {
      const count = await expireStaleIntents(supabase);
      if (count > 0) console.log(`[scheduler] cancelled ${count} stale payment intent(s)`);
    });
  };

  console.log('[scheduler] enabled');
  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
