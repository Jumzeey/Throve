import {
  CreateChannelCommand,
  GetChannelCommand,
  IvsClient,
  ListStreamKeysCommand,
  GetStreamKeyCommand,
} from '@aws-sdk/client-ivs';
import { createServiceClient } from './supabase.js';

export function isIvsConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim() &&
      (process.env.AWS_REGION?.trim() || process.env.IVS_REGION?.trim()),
  );
}

function ivsClient() {
  const region = process.env.IVS_REGION?.trim() || process.env.AWS_REGION?.trim() || 'us-east-1';
  return new IvsClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
    },
  });
}

export type IvsChannelInfo = {
  channelArn: string;
  ingestEndpoint: string;
  playbackUrl: string;
  streamKey: string;
};

async function resolveStreamKey(client: IvsClient, channelArn: string): Promise<string> {
  const listed = await client.send(new ListStreamKeysCommand({ channelArn, maxResults: 1 }));
  const keyArn = listed.streamKeys?.[0]?.arn;
  if (!keyArn) {
    throw new Error('IVS channel has no stream key');
  }
  const key = await client.send(new GetStreamKeyCommand({ arn: keyArn }));
  const value = key.streamKey?.value;
  if (!value) throw new Error('IVS stream key value missing');
  return value;
}

/** Create an IVS channel for a live session (or return cached row fields). */
export async function ensureIvsChannelForSession(input: {
  sessionId: string;
  existing?: {
    ivs_channel_arn?: string | null;
    ivs_ingest_endpoint?: string | null;
    ivs_playback_url?: string | null;
    ivs_stream_key?: string | null;
  };
}): Promise<IvsChannelInfo> {
  if (!isIvsConfigured()) {
    const err = new Error('Amazon IVS is not configured');
    (err as Error & { code?: string }).code = 'IVS_UNAVAILABLE';
    throw err;
  }

  const existing = input.existing;
  if (
    existing?.ivs_channel_arn &&
    existing.ivs_ingest_endpoint &&
    existing.ivs_playback_url &&
    existing.ivs_stream_key
  ) {
    return {
      channelArn: existing.ivs_channel_arn,
      ingestEndpoint: existing.ivs_ingest_endpoint,
      playbackUrl: existing.ivs_playback_url,
      streamKey: existing.ivs_stream_key,
    };
  }

  const client = ivsClient();
  const admin = createServiceClient();

  if (existing?.ivs_channel_arn) {
    const channel = await client.send(new GetChannelCommand({ arn: existing.ivs_channel_arn }));
    const ingestEndpoint = channel.channel?.ingestEndpoint;
    const playbackUrl = channel.channel?.playbackUrl;
    if (!ingestEndpoint || !playbackUrl) throw new Error('IVS channel incomplete');
    const streamKey =
      existing.ivs_stream_key || (await resolveStreamKey(client, existing.ivs_channel_arn));
    await admin
      .from('live_sessions')
      .update({
        media_provider: 'ivs',
        ivs_ingest_endpoint: ingestEndpoint,
        ivs_playback_url: playbackUrl,
        ivs_stream_key: streamKey,
      })
      .eq('id', input.sessionId);
    return {
      channelArn: existing.ivs_channel_arn,
      ingestEndpoint,
      playbackUrl,
      streamKey,
    };
  }

  const created = await client.send(
    new CreateChannelCommand({
      name: `throve-${input.sessionId}`.slice(0, 128),
      latencyMode: 'LOW',
      type: 'STANDARD',
      tags: {
        app: 'throve',
        sessionId: input.sessionId,
      },
    }),
  );

  const channelArn = created.channel?.arn;
  const ingestEndpoint = created.channel?.ingestEndpoint;
  const playbackUrl = created.channel?.playbackUrl;
  const streamKey = created.streamKey?.value;
  if (!channelArn || !ingestEndpoint || !playbackUrl || !streamKey) {
    throw new Error('IVS CreateChannel returned incomplete data');
  }

  const { error } = await admin
    .from('live_sessions')
    .update({
      media_provider: 'ivs',
      ivs_channel_arn: channelArn,
      ivs_ingest_endpoint: ingestEndpoint,
      ivs_playback_url: playbackUrl,
      ivs_stream_key: streamKey,
    })
    .eq('id', input.sessionId);
  if (error) throw error;

  return { channelArn, ingestEndpoint, playbackUrl, streamKey };
}
