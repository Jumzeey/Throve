import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from './livekit.js';
import { ensureIvsChannelForSession, isIvsConfigured } from './ivs.js';
import { createServiceClient } from './supabase.js';

export type LiveMediaProvider = 'livekit' | 'ivs' | 'simulated';

export type LiveMediaCredentials = {
  provider: LiveMediaProvider;
  role: 'host' | 'viewer';
  canPublish: boolean;
  /** LiveKit */
  token?: string;
  url?: string;
  roomName?: string;
  /** Amazon IVS */
  ingestEndpoint?: string;
  streamKey?: string;
  playbackUrl?: string;
  rtmpsUrl?: string;
};

export function configuredMediaProvider(): LiveMediaProvider {
  const raw = (process.env.LIVE_MEDIA_PROVIDER ?? 'livekit').trim().toLowerCase();
  if (raw === 'ivs') return 'ivs';
  if (raw === 'simulated') return 'simulated';
  return 'livekit';
}

export async function createSessionMediaCredentials(input: {
  sessionId: string;
  userId: string;
  username?: string;
  isHost: boolean;
  roomName: string;
}): Promise<LiveMediaCredentials> {
  const provider = configuredMediaProvider();
  const role = input.isHost ? 'host' : 'viewer';

  if (provider === 'simulated') {
    return { provider, role, canPublish: input.isHost };
  }

  if (provider === 'ivs') {
    if (!isIvsConfigured()) {
      const err = new Error('Amazon IVS is not configured');
      (err as Error & { code?: string }).code = 'IVS_UNAVAILABLE';
      throw err;
    }

    const admin = createServiceClient();
    const { data: session } = await admin
      .from('live_sessions')
      .select('ivs_channel_arn, ivs_ingest_endpoint, ivs_playback_url, ivs_stream_key')
      .eq('id', input.sessionId)
      .maybeSingle();

    const channel = await ensureIvsChannelForSession({
      sessionId: input.sessionId,
      existing: session ?? undefined,
    });

    const base: LiveMediaCredentials = {
      provider: 'ivs',
      role,
      canPublish: input.isHost,
      playbackUrl: channel.playbackUrl,
      ingestEndpoint: channel.ingestEndpoint,
    };

    if (input.isHost) {
      base.streamKey = channel.streamKey;
      base.rtmpsUrl = `rtmps://${channel.ingestEndpoint}:443/app/`;
    }

    return base;
  }

  if (!isLiveKitConfigured()) {
    const err = new Error('LiveKit is not configured');
    (err as Error & { code?: string }).code = 'LIVEKIT_UNAVAILABLE';
    throw err;
  }

  const token = await createLiveKitToken({
    roomName: input.roomName,
    identity: input.userId,
    name: input.username ?? input.userId,
    canPublish: input.isHost,
    canSubscribe: true,
  });

  return {
    provider: 'livekit',
    role,
    canPublish: input.isHost,
    token,
    url: getLiveKitUrl(),
    roomName: input.roomName,
  };
}
