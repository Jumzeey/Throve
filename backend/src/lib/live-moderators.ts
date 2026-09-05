import { getProfileById, getProfileByUsername } from './mappers.js';
import { notifyUser } from './notify.js';
import { liveModeratorAppointedEmail } from './email/templates/live.js';
import { createServiceClient } from './supabase.js';

export const MAX_LIVE_MODERATORS = 2;

type AppointInput = {
  hostId: string;
  usernames: string[];
  sessionId?: string;
  sessionTitle?: string;
};

export async function countHostModerators(hostId: string, sessionId?: string) {
  const admin = createServiceClient();
  let query = admin.from('live_moderators').select('id', { count: 'exact', head: true }).eq('host_id', hostId);
  query = sessionId ? query.or(`live_session_id.is.null,live_session_id.eq.${sessionId}`) : query.is('live_session_id', null);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function listModeratorUsernames(sessionId: string) {
  const admin = createServiceClient();
  const { data, error } = await admin.from('live_moderators').select('moderator_id').eq('live_session_id', sessionId);
  if (error) throw error;
  const ids = (data ?? []).map((row) => String(row.moderator_id));
  if (!ids.length) return [] as string[];
  const { data: profiles } = await admin.from('profiles').select('id, username').in('id', ids);
  const byId = new Map((profiles ?? []).map((row) => [String(row.id), String(row.username)]));
  return ids.map((id) => byId.get(id)).filter((name): name is string => Boolean(name));
}

export async function attachPendingModerators(hostId: string, sessionId: string) {
  const admin = createServiceClient();
  await admin.from('live_moderators').update({ live_session_id: sessionId }).eq('host_id', hostId).is('live_session_id', null);
}

export async function appointModerators(input: AppointInput) {
  const admin = createServiceClient();
  const host = await getProfileById(admin, input.hostId);
  if (!host) throw new Error('Host profile not found');

  const unique = [...new Set(input.usernames.map((name) => name.trim().replace(/^@/, '')).filter(Boolean))];
  const currentCount = await countHostModerators(input.hostId, input.sessionId);
  if (currentCount + unique.length > MAX_LIVE_MODERATORS) {
    const error = new Error(`You can appoint up to ${MAX_LIVE_MODERATORS} moderators.`);
    (error as Error & { code?: string }).code = 'LIMIT';
    throw error;
  }

  const appointed: string[] = [];
  for (const username of unique) {
    if (username.toLowerCase() === host.username.toLowerCase()) continue;
    const profile = await getProfileByUsername(admin, username);
    if (!profile || profile.deactivated) {
      const error = new Error(`@${username} was not found.`);
      (error as Error & { code?: string }).code = 'NOT_FOUND';
      throw error;
    }

    const { error } = await admin.from('live_moderators').insert({
      host_id: input.hostId,
      moderator_id: profile.id,
      live_session_id: input.sessionId ?? null,
    });
    if (error) {
      if (error.code === '23505') continue;
      throw error;
    }

    appointed.push(profile.username);
    const deepLink = input.sessionId ? `live/${input.sessionId}` : '(tabs)/live';
    await notifyUser({
      userId: profile.id,
      category: 'live',
      type: 'live_moderator_appointed',
      title: 'You’re a live moderator',
      body: `@${host.username} appointed you as a moderator${input.sessionTitle ? ` for ${input.sessionTitle}` : ''}.`,
      data: {
        hostUsername: host.username,
        sessionId: input.sessionId ?? '',
      },
      deepLink,
      email: liveModeratorAppointedEmail({
        hostUsername: host.username,
        sessionId: input.sessionId,
        liveTitle: input.sessionTitle,
      }),
    });
  }

  return appointed;
}

export async function removeModerator(hostId: string, username: string, sessionId?: string) {
  const admin = createServiceClient();
  const profile = await getProfileByUsername(admin, username);
  if (!profile) return;
  let query = admin.from('live_moderators').delete().eq('host_id', hostId).eq('moderator_id', profile.id);
  query = sessionId ? query.eq('live_session_id', sessionId) : query.is('live_session_id', null);
  await query;
}
