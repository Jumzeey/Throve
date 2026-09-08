import Constants, { ExecutionEnvironment } from 'expo-constants';

type LiveKitModule = typeof import('@livekit/react-native');
type LivekitClient = typeof import('livekit-client');

export type LiveKitNative = { rn: LiveKitModule; client: LivekitClient };

let loadPromise: Promise<LiveKitNative | null> | null = null;
let registered = false;
let audioSessionStarted = false;

export function canLoadNativeLiveKit() {
  // Expo Go cannot load WebRTC native modules. Standalone / production builds can.
  // Prefer executionEnvironment — appOwnership is deprecated and unreliable.
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

function withSuppressedSuperExpression<T>(run: () => Promise<T>): Promise<T> {
  const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  const previous = errorUtils?.getGlobalHandler?.();
  let suppressed: unknown = null;

  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (/Super expression must either be null or a function/i.test(message)) {
      suppressed = error;
      return;
    }
    previous?.(error, isFatal);
  });

  return run()
    .catch((err) => {
      throw suppressed ?? err;
    })
    .finally(() => {
      if (previous) errorUtils?.setGlobalHandler?.(previous);
    });
}

/** Clear a failed load so the next live attempt can retry after a rebuild or fix. */
export function resetLiveKitNativeLoad() {
  loadPromise = null;
  registered = false;
  audioSessionStarted = false;
}

/**
 * Load LiveKit once. registerGlobals must not run on every live-screen mount.
 * Failures resolve to null — callers should show an explicit media error, not pretend LIVE.
 */
export function loadLiveKitNative() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (!canLoadNativeLiveKit()) {
      console.warn('[livekit] skipped — Expo Go / store client cannot load WebRTC');
      return null;
    }
    try {
      return await withSuppressedSuperExpression(async () => {
        await import('@livekit/react-native-webrtc');
        const rn = await import('@livekit/react-native');
        if (!rn?.registerGlobals || !rn?.LiveKitRoom || !rn?.AudioSession) {
          console.warn('[livekit] react-native module incomplete');
          loadPromise = null;
          return null;
        }
        const client = await import('livekit-client');
        if (!registered) {
          rn.registerGlobals();
          registered = true;
        }
        if (!audioSessionStarted) {
          await rn.AudioSession.startAudioSession();
          audioSessionStarted = true;
        }
        return { rn, client };
      });
    } catch (err) {
      console.warn('[livekit] native load failed', err);
      loadPromise = null;
      return null;
    }
  })();
  return loadPromise;
}

export async function stopLiveKitAudioSession() {
  if (!audioSessionStarted) return;
  try {
    const rn = await import('@livekit/react-native');
    await rn.AudioSession.stopAudioSession();
  } catch {
    /* ignore */
  } finally {
    audioSessionStarted = false;
  }
}
