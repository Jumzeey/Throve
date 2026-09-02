import { createServiceClient } from '../lib/supabase.js';
import { queueEmail } from '../lib/email/send.js';
import { liveUpcomingEmail } from '../lib/email/templates/live.js';

const INTERVAL_MS = 60_000;
const WINDOW_MS = 30 * 60_000;
const reminded = new Set<string>();
let timer: ReturnType<typeof setInterval> | null = null;

function formatStart(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function startLiveUpcomingWorker() {
  if (timer) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[live-upcoming] SUPABASE_SERVICE_ROLE_KEY missing; worker disabled');
    return;
  }

  const tick = async () => {
    try {
      const supabase = createServiceClient();
      const now = Date.now();
      const from = new Date(now).toISOString();
      const to = new Date(now + WINDOW_MS).toISOString();

      const { data, error } = await supabase
        .from('live_sessions')
        .select('id, host_id, title, scheduled_at')
        .eq('status', 'upcoming')
        .gte('scheduled_at', from)
        .lte('scheduled_at', to)
        .limit(25);

      if (error) {
        console.warn('[live-upcoming]', error.message);
        return;
      }

      for (const session of data ?? []) {
        const id = String(session.id);
        if (reminded.has(id)) continue;
        reminded.add(id);

        const { data: host } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.host_id)
          .maybeSingle();

        queueEmail({
          toUserId: String(session.host_id),
          content: liveUpcomingEmail({
            sessionId: id,
            hostUsername: (host?.username as string) || 'host',
            title: String(session.title),
            startTimeLabel: formatStart(String(session.scheduled_at)),
          }),
        });
      }
    } catch (err) {
      console.warn('[live-upcoming]', err instanceof Error ? err.message : err);
    }
  };

  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();
}

export function stopLiveUpcomingWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
