import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from './livekit.js';

export type LiveMediaProvider = 'livekit' | 'ivs' | 'simulated';

export type LiveMediaCredentials = {
  provider: LiveMediaProvider;
  role: 'host' | 'viewer';
  canPublish: boolean;
  /** LiveKit */
  token?: string;
  url?: string;
  roomName?: string;
  /** Amazon IVS (future) */
  ingestEndpoint?: string;
  streamKey?: string;
  playbackUrl?: string;
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
    const err = new Error('IVS media provider is not configured yet');
    (err as Error & { code?: string }).code = 'MEDIA_PROVIDER_UNAVAILABLE';
    throw err;
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
