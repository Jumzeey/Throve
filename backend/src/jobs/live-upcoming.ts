import { createServiceClient } from '../lib/supabase.js';
import {
  liveUpcomingEmail,
  savedLiveDayOfEmail,
  savedLiveTenMinEmail,
} from '../lib/email/templates/live.js';
import { notifyFollowersOfLive } from '../lib/follows.js';
import { notifyUser } from '../lib/notify.js';

const INTERVAL_MS = 60_000;
const WINDOW_MS = 30 * 60_000;
const TEN_MIN_MS = 10 * 60_000;
const DAY_OF_HOUR = 8;
const LAGOS = 'Africa/Lagos';
const reminded = new Set<string>();
let timer: ReturnType<typeof setInterval> | null = null;

function formatStart(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      timeZone: LAGOS,
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

function parseWhen(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function lagosDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LAGOS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function lagosHour(date: Date) {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: LAGOS,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour);
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
      } else {
        for (const session of data ?? []) {
          const id = String(session.id);
          if (reminded.has(id)) continue;
          reminded.add(id);

          const { data: host } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.host_id)
            .maybeSingle();
          const hostUsername = (host?.username as string) || 'host';
          const startLabel = formatStart(String(session.scheduled_at));

          await notifyUser({
            userId: String(session.host_id),
            category: 'live',
            type: 'live_upcoming_reminder',
            title: 'Going live soon',
            body: String(session.title),
            deepLink: `live/${id}`,
            data: { sessionId: id },
            email: liveUpcomingEmail({
              sessionId: id,
              hostUsername,
              title: String(session.title),
              startTimeLabel: startLabel,
            }),
          });

          void notifyFollowersOfLive({
            sellerId: String(session.host_id),
            sellerUsername: hostUsername,
            sessionId: id,
            title: String(session.title),
            kind: 'upcoming',
            startTimeLabel: startLabel,
          });
        }
      }

      await remindSavedLives(supabase, now);
    } catch (err) {
      console.warn('[live-upcoming]', err instanceof Error ? err.message : err);
    }
  };

  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();
}

type SavedLiveJoin = {
  user_id: string;
  session_id: string;
  reminded_day_of_at: string | null;
  reminded_ten_min_at: string | null;
  live_sessions:
    | {
        id: string;
        host_id: string;
        title: string;
        scheduled_at: string | null;
        status: string;
      }
    | {
        id: string;
        host_id: string;
        title: string;
        scheduled_at: string | null;
        status: string;
      }[]
    | null;
};

function joinedSession(value: SavedLiveJoin['live_sessions']) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function remindSavedLives(supabase: ReturnType<typeof createServiceClient>, now: number) {
  const { data, error } = await supabase
    .from('saved_lives')
    .select(
      'user_id, session_id, reminded_day_of_at, reminded_ten_min_at, live_sessions!inner(id, host_id, title, scheduled_at, status)',
    )
    .eq('live_sessions.status', 'upcoming')
    .limit(200);

  if (error) {
    console.warn('[saved-lives]', error.message);
    return;
  }

  const hostIds = [
    ...new Set(
      (data ?? [])
        .map((row) => joinedSession((row as SavedLiveJoin).live_sessions)?.host_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const hostNames = new Map<string, string>();
  if (hostIds.length) {
    const { data: hosts } = await supabase.from('profiles').select('id, username').in('id', hostIds);
    for (const host of hosts ?? []) hostNames.set(String(host.id), String(host.username));
  }

  const nowDate = new Date(now);
  const todayKey = lagosDateKey(nowDate);
  const hour = lagosHour(nowDate);

  for (const raw of data ?? []) {
    const row = raw as SavedLiveJoin;
    const session = joinedSession(row.live_sessions);
    if (!session) continue;
    if (row.user_id === session.host_id) continue;

    const start = parseWhen(session.scheduled_at);
    if (!start) continue;
    if (start.getTime() <= now) continue;

    const hostUsername = hostNames.get(session.host_id) || 'host';
    const startLabel = formatStart(start.toISOString());
    const title = String(session.title);
    const sessionId = String(session.id);

    const dueDayOf =
      !row.reminded_day_of_at && lagosDateKey(start) === todayKey && hour >= DAY_OF_HOUR;
    const dueTenMin =
      !row.reminded_ten_min_at && now >= start.getTime() - TEN_MIN_MS;

    if (!dueDayOf && !dueTenMin) continue;

    const patch: { reminded_day_of_at?: string; reminded_ten_min_at?: string } = {};

    if (dueDayOf) {
      patch.reminded_day_of_at = new Date(now).toISOString();
      await notifyUser({
        userId: row.user_id,
        category: 'live',
        type: 'saved_live_day_of',
        title: 'A saved live is today',
        body: `${title} with @${hostUsername} · ${startLabel}`,
        deepLink: `live/${sessionId}`,
        data: { sessionId },
        email: savedLiveDayOfEmail({
          sessionId,
          hostUsername,
          title,
          startTimeLabel: startLabel,
        }),
      });
    }

    if (dueTenMin) {
      patch.reminded_ten_min_at = new Date(now).toISOString();
      await notifyUser({
        userId: row.user_id,
        category: 'live',
        type: 'saved_live_ten_min',
        title: 'Starting in 10 minutes',
        body: `${title} with @${hostUsername}`,
        deepLink: `live/${sessionId}`,
        data: { sessionId },
        email: savedLiveTenMinEmail({ sessionId, hostUsername, title }),
      });
    }

    if (Object.keys(patch).length) {
      const { error: updateError } = await supabase
        .from('saved_lives')
        .update(patch)
        .eq('user_id', row.user_id)
        .eq('session_id', sessionId);
      if (updateError) console.warn('[saved-lives]', updateError.message);
    }
  }
}

export function stopLiveUpcomingWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
