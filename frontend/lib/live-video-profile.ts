import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type LiveVideoProfileId = 'legacy' | 'test';

export type LiveVideoTier = 'legacy' | 'test' | 'test_low_end';

/** Subset of livekit-client RoomOptions — keep local so we never load livekit-client here. */
type LiveKitRoomOptionsLite = {
  adaptiveStream?: boolean | { pixelDensity?: 'screen' | number };
  dynacast?: boolean;
  videoCaptureDefaults?: {
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

/** Match livekit-client VideoPresets without importing the package (DOMException on RN). */
const CAPTURE_H720 = { width: 1280, height: 720, frameRate: 30 } as const;
const CAPTURE_H540 = { width: 960, height: 540, frameRate: 24 } as const;

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
  roomOptions: LiveKitRoomOptionsLite;
  summary: {
    codec: string;
    capture: string;
    maxBitrateMbps: number | null;
    maxFramerate: number | null;
    simulcast: boolean | 'sdk-default';
    dynacast: boolean;
    adaptiveStream: true;
  };
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

function testRoomOptions(lowEnd: boolean): LiveKitRoomOptionsLite {
  const capture = lowEnd ? CAPTURE_H540 : CAPTURE_H720;
  const maxBitrate = lowEnd ? 1_500_000 : 2_500_000;

  return {
    adaptiveStream: ADAPTIVE_STREAM,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: {
        width: capture.width,
        height: capture.height,
        frameRate: capture.frameRate,
      },
    },
    publishDefaults: {
      videoCodec: 'h264',
      videoEncoding: {
        maxBitrate,
        maxFramerate: capture.frameRate,
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

function describeTier(tier: LiveVideoTier): LiveVideoProfileResolution['summary'] {
  if (tier === 'legacy') {
    return {
      codec: 'vp8 (sdk-default)',
      capture: 'h720 (sdk-default)',
      maxBitrateMbps: null,
      maxFramerate: null,
      simulcast: 'sdk-default',
      dynacast: false,
      adaptiveStream: true,
    };
  }
  if (tier === 'test_low_end') {
    return {
      codec: 'h264',
      capture: 'h540 (960x540)',
      maxBitrateMbps: 1.5,
      maxFramerate: 24,
      simulcast: true,
      dynacast: true,
      adaptiveStream: true,
    };
  }
  return {
    codec: 'h264',
    capture: 'h720 (1280x720)',
    maxBitrateMbps: 2.5,
    maxFramerate: 30,
    simulcast: true,
    dynacast: true,
    adaptiveStream: true,
  };
}

/**
 * Resolve LiveKit RoomOptions for Android Live A/B.
 * Non-Android platforms always get the current adaptiveStream-only defaults.
 */
export function getLiveKitRoomOptions(input: {
  platform?: typeof Platform.OS;
  profile?: LiveVideoProfileId;
  totalMemoryBytes?: number | null;
}): LiveVideoProfileResolution {
  const platform = input.platform ?? Platform.OS;
  const profile = input.profile ?? resolveLiveVideoProfile();

  if (platform !== 'android' || profile === 'legacy') {
    return {
      profile: platform === 'android' ? profile : 'legacy',
      tier: 'legacy',
      lowEnd: false,
      roomOptions: legacyRoomOptions(),
      summary: describeTier('legacy'),
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
    roomOptions: testRoomOptions(lowEnd),
    summary: describeTier(tier),
  };
}

export function logLiveVideoProfile(resolution: LiveVideoProfileResolution, totalMemoryBytes?: number | null) {
  console.log('[live-video-profile]', {
    profile: resolution.profile,
    tier: resolution.tier,
    lowEnd: resolution.lowEnd,
    totalMemoryBytes: totalMemoryBytes ?? null,
    ...resolution.summary,
  });
}
