import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type LiveVideoProfileId = 'legacy' | 'test';

export type LiveVideoTier = 'legacy' | 'test' | 'test_low_end';

export type LiveCameraFacing = 'user' | 'environment';

/** Subset of livekit-client RoomOptions — keep local so we never load livekit-client here. */
type LiveKitRoomOptionsLite = {
  adaptiveStream?: boolean | { pixelDensity?: 'screen' | number };
  dynacast?: boolean;
  videoCaptureDefaults?: {
    facingMode?: LiveCameraFacing;
    resolution?: { width: number; height: number; frameRate?: number };
  };
  publishDefaults?: {
    videoCodec?: 'vp8' | 'h264' | 'vp9' | 'av1';
    videoEncoding?: { maxBitrate?: number; maxFramerate?: number };
    simulcast?: boolean;
  };
};

const LOW_END_RAM_BYTES = 3 * 1024 * 1024 * 1024;
const PROFILE_OVERRIDE_KEY = 'throve.live_video_profile_override';

const ADAPTIVE_STREAM = { pixelDensity: 'screen' as const };

/**
 * Test · H.264 encode matrix (Android only).
 * Front: same spatial size as rear for the tier, lower fps + slightly lower bitrate (cooler, denser bits/frame).
 */
const TEST_ENCODE = {
  rear: {
    mid: { width: 1280, height: 720, frameRate: 30, maxBitrate: 2_500_000 },
    low: { width: 960, height: 540, frameRate: 24, maxBitrate: 1_500_000 },
  },
  front: {
    mid: { width: 1280, height: 720, frameRate: 24, maxBitrate: 2_200_000 },
    low: { width: 960, height: 540, frameRate: 20, maxBitrate: 1_300_000 },
  },
} as const;

const canUseAsyncStorage = Platform.OS !== 'web' || typeof window !== 'undefined';
const memoryStore = new Map<string, string>();

/** In-memory override set from the temporary prepare-form tester toggle. */
let profileOverride: LiveVideoProfileId | null = null;
let overrideHydrated = false;
let warnedMissingMemory = false;

export type LiveVideoProfileResolution = {
  profile: LiveVideoProfileId;
  tier: LiveVideoTier;
  lowEnd: boolean;
  facingMode: LiveCameraFacing;
  roomOptions: LiveKitRoomOptionsLite;
  summary: {
    facing: LiveCameraFacing;
    codec: string;
    capture: string;
    maxBitrateMbps: number | null;
    maxFramerate: number | null;
    simulcast: boolean | 'sdk-default';
    dynacast: boolean;
    adaptiveStream: true;
  };
};

export type LiveCaptureOptions = {
  facingMode: LiveCameraFacing;
  resolution: { width: number; height: number; frameRate: number };
};

export type LivePublishEncoding = {
  maxBitrate: number;
  maxFramerate: number;
};

function parseProfileId(raw: string | null | undefined): LiveVideoProfileId | null {
  const value = raw?.trim().toLowerCase();
  if (value === 'test' || value === 'legacy') return value;
  return null;
}

function envLiveVideoProfile(): LiveVideoProfileId {
  return parseProfileId(process.env.EXPO_PUBLIC_LIVE_VIDEO_PROFILE) ?? 'legacy';
}

/**
 * Temporary closed-tester override wins over build env.
 * Remove prepare-form toggle + this storage when A/B ends.
 */
export function resolveLiveVideoProfile(): LiveVideoProfileId {
  return profileOverride ?? envLiveVideoProfile();
}

export function getLiveVideoProfileOverride(): LiveVideoProfileId | null {
  return profileOverride;
}

export async function loadLiveVideoProfileOverride(): Promise<LiveVideoProfileId> {
  if (overrideHydrated) {
    return resolveLiveVideoProfile();
  }
  try {
    const raw = canUseAsyncStorage
      ? await AsyncStorage.getItem(PROFILE_OVERRIDE_KEY)
      : (memoryStore.get(PROFILE_OVERRIDE_KEY) ?? null);
    profileOverride = parseProfileId(raw);
  } catch {
    profileOverride = null;
  }
  overrideHydrated = true;
  return resolveLiveVideoProfile();
}

export async function setLiveVideoProfileOverride(profile: LiveVideoProfileId): Promise<void> {
  profileOverride = profile;
  overrideHydrated = true;
  try {
    if (canUseAsyncStorage) {
      await AsyncStorage.setItem(PROFILE_OVERRIDE_KEY, profile);
    } else {
      memoryStore.set(PROFILE_OVERRIDE_KEY, profile);
    }
  } catch {
    // Keep in-memory override even if persistence fails.
  }
}

export function isLowEndAndroidDevice(totalMemoryBytes: number | null | undefined): boolean {
  if (totalMemoryBytes == null || !Number.isFinite(totalMemoryBytes) || totalMemoryBytes <= 0) {
    return false;
  }
  return totalMemoryBytes <= LOW_END_RAM_BYTES;
}

function encodeFor(facing: LiveCameraFacing, lowEnd: boolean) {
  const cam = facing === 'user' ? TEST_ENCODE.front : TEST_ENCODE.rear;
  return lowEnd ? cam.low : cam.mid;
}

/**
 * Capture constraints for host publish / camera switch under Test · H.264.
 * Legacy callers should not use this for quality changes (facingMode only is fine).
 */
export function getLiveCaptureOptions(
  facing: LiveCameraFacing,
  tier: LiveVideoTier,
): LiveCaptureOptions {
  if (tier === 'legacy') {
    return {
      facingMode: facing,
      resolution: { width: 1280, height: 720, frameRate: 30 },
    };
  }
  const enc = encodeFor(facing, tier === 'test_low_end');
  return {
    facingMode: facing,
    resolution: {
      width: enc.width,
      height: enc.height,
      frameRate: enc.frameRate,
    },
  };
}

export function getLivePublishEncoding(
  facing: LiveCameraFacing,
  tier: LiveVideoTier,
): LivePublishEncoding | null {
  if (tier === 'legacy') return null;
  const enc = encodeFor(facing, tier === 'test_low_end');
  return {
    maxBitrate: enc.maxBitrate,
    maxFramerate: enc.frameRate,
  };
}

function testRoomOptions(facing: LiveCameraFacing, lowEnd: boolean): LiveKitRoomOptionsLite {
  const capture = getLiveCaptureOptions(facing, lowEnd ? 'test_low_end' : 'test');
  const encoding = getLivePublishEncoding(facing, lowEnd ? 'test_low_end' : 'test')!;

  return {
    adaptiveStream: ADAPTIVE_STREAM,
    dynacast: true,
    videoCaptureDefaults: {
      facingMode: capture.facingMode,
      resolution: capture.resolution,
    },
    publishDefaults: {
      videoCodec: 'h264',
      videoEncoding: {
        maxBitrate: encoding.maxBitrate,
        maxFramerate: encoding.maxFramerate,
      },
      simulcast: true,
    },
  };
}

function legacyRoomOptions(): LiveKitRoomOptionsLite {
  return {
    adaptiveStream: ADAPTIVE_STREAM,
  };
}

function describeSummary(
  tier: LiveVideoTier,
  facing: LiveCameraFacing,
): LiveVideoProfileResolution['summary'] {
  if (tier === 'legacy') {
    return {
      facing,
      codec: 'vp8 (sdk-default)',
      capture: 'h720 (sdk-default)',
      maxBitrateMbps: null,
      maxFramerate: null,
      simulcast: 'sdk-default',
      dynacast: false,
      adaptiveStream: true,
    };
  }
  const enc = encodeFor(facing, tier === 'test_low_end');
  return {
    facing,
    codec: 'h264',
    capture: `${enc.width}x${enc.height}`,
    maxBitrateMbps: enc.maxBitrate / 1_000_000,
    maxFramerate: enc.frameRate,
    simulcast: true,
    dynacast: true,
    adaptiveStream: true,
  };
}

/**
 * Resolve LiveKit RoomOptions for Android Live A/B.
 * Non-Android platforms always get the current adaptiveStream-only defaults.
 * Hosts start on front (`user`); pass that so join defaults match the first publish.
 */
export function getLiveKitRoomOptions(input: {
  platform?: typeof Platform.OS;
  profile?: LiveVideoProfileId;
  totalMemoryBytes?: number | null;
  facingMode?: LiveCameraFacing;
}): LiveVideoProfileResolution {
  const platform = input.platform ?? Platform.OS;
  const profile = input.profile ?? resolveLiveVideoProfile();
  const facingMode = input.facingMode ?? 'user';

  if (platform !== 'android' || profile === 'legacy') {
    return {
      profile: platform === 'android' ? profile : 'legacy',
      tier: 'legacy',
      lowEnd: false,
      facingMode,
      roomOptions: legacyRoomOptions(),
      summary: describeSummary('legacy', facingMode),
    };
  }

  const memory = input.totalMemoryBytes;
  const memoryKnown = memory != null && Number.isFinite(memory) && memory > 0;
  if (!memoryKnown && !warnedMissingMemory) {
    warnedMissingMemory = true;
    console.warn(
      '[live-video-profile] Device.totalMemory unavailable; using mid/high test tier (not low-end).',
    );
  }

  const lowEnd = isLowEndAndroidDevice(memoryKnown ? memory : null);
  const tier: LiveVideoTier = lowEnd ? 'test_low_end' : 'test';

  return {
    profile: 'test',
    tier,
    lowEnd,
    facingMode,
    roomOptions: testRoomOptions(facingMode, lowEnd),
    summary: describeSummary(tier, facingMode),
  };
}

/**
 * Best-effort update of RTCRtpSender maxBitrate / maxFramerate after a camera flip.
 * Safe no-op when the track has no sender or setParameters fails.
 */
export async function applyLivePublishEncoding(
  track: {
    sender?: {
      getParameters: () => { encodings?: Array<{ maxBitrate?: number; maxFramerate?: number }> };
      setParameters: (params: {
        encodings?: Array<{ maxBitrate?: number; maxFramerate?: number }>;
      }) => Promise<void>;
    };
  } | null | undefined,
  encoding: LivePublishEncoding | null,
): Promise<void> {
  if (!encoding || !track?.sender?.getParameters || !track.sender.setParameters) return;
  try {
    const params = track.sender.getParameters();
    if (!params.encodings?.length) return;
    const peak = Math.max(...params.encodings.map((enc) => enc.maxBitrate ?? 0), 0);
    const next = {
      ...params,
      encodings: params.encodings.map((enc) => {
        const scaled =
          peak > 0 && enc.maxBitrate != null
            ? Math.max(80_000, Math.round((enc.maxBitrate / peak) * encoding.maxBitrate))
            : encoding.maxBitrate;
        return {
          ...enc,
          maxBitrate: scaled,
          maxFramerate: encoding.maxFramerate,
        };
      }),
    };
    await track.sender.setParameters(next);
  } catch (err) {
    console.warn('[live-video-profile] applyLivePublishEncoding failed', err);
  }
}

export function logLiveVideoProfile(
  resolution: LiveVideoProfileResolution,
  totalMemoryBytes?: number | null,
) {
  console.log('[live-video-profile]', {
    profile: resolution.profile,
    tier: resolution.tier,
    lowEnd: resolution.lowEnd,
    facing: resolution.facingMode,
    totalMemoryBytes: totalMemoryBytes ?? null,
    ...resolution.summary,
  });
}
