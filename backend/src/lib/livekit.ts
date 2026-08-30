import { AccessToken } from 'livekit-server-sdk';

const livekitUrl = process.env.LIVEKIT_URL ?? '';
const apiKey = process.env.LIVEKIT_API_KEY ?? '';
const apiSecret = process.env.LIVEKIT_API_SECRET ?? '';

export function isLiveKitConfigured() {
  return Boolean(livekitUrl && apiKey && apiSecret);
}

export function getLiveKitUrl() {
  return livekitUrl;
}

export async function createLiveKitToken(input: {
  roomName: string;
  identity: string;
  name?: string;
  canPublish: boolean;
  canSubscribe?: boolean;
}) {
  if (!isLiveKitConfigured()) {
    throw new Error('LiveKit is not configured');
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: input.identity,
    name: input.name,
    ttl: '2h',
  });

  token.addGrant({
    roomJoin: true,
    room: input.roomName,
    canPublish: input.canPublish,
    canSubscribe: input.canSubscribe ?? true,
    canPublishData: true,
  });

  return token.toJwt();
}
