import Constants, { ExecutionEnvironment } from 'expo-constants';

type LiveKitModule = typeof import('@livekit/react-native');
type LivekitClient = typeof import('livekit-client');

export type LiveKitNative = { rn: LiveKitModule; client: LivekitClient };
export type LiveKitLoadFailure = 'expo_go' | 'failed';

let loadPromise: Promise<LiveKitNative | null> | null = null;
let registered = false;
let audioSessionStarted = false;
let lastFailure: LiveKitLoadFailure | null = null;
let lastFailureDetail: string | null = null;

export function canLoadNativeLiveKit() {
  // Expo Go cannot load WebRTC native modules. Standalone / production / local debug builds can.
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export function getLiveKitLoadFailure(): LiveKitLoadFailure | null {
  return lastFailure;
}

export function getLiveKitLoadFailureDetail(): string | null {
  return lastFailureDetail;
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err ?? 'Unknown error');
}

const LOAD_TIMEOUT_MS = 15_000;

function withTimeout<T>(run: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    run.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Clear a failed load so the next live attempt can retry after a rebuild or fix. */
export function resetLiveKitNativeLoad() {
  loadPromise = null;
  registered = false;
  audioSessionStarted = false;
  lastFailure = null;
  lastFailureDetail = null;
}

/**
 * Load LiveKit once. Failures resolve to null — callers show an explicit media error.
 * AudioSession is best-effort: a mic-session failure must not block camera module load.
 */
export function loadLiveKitNative() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (!canLoadNativeLiveKit()) {
      lastFailure = 'expo_go';
      lastFailureDetail = 'Expo Go cannot load WebRTC. Use a Throve development or release build.';
      console.warn('[livekit] skipped — Expo Go / store client cannot load WebRTC');
      return null;
    }
    try {
      return await withTimeout(
        (async () => {
          console.log('[livekit] loading native impl');
          // Named static imports live in a dedicated module so Metro binds exports correctly.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const impl = require('./livekit-native-impl') as typeof import('./livekit-native-impl') | undefined;
          if (!impl || typeof impl.createLiveKitNative !== 'function') {
            throw new Error(
              'LiveKit native module failed to evaluate (WebRTC EventTarget shim). Try again after a reload.',
            );
          }
          const { rn, client } = impl.createLiveKitNative();
          console.log('[livekit] native impl ready', {
            registerGlobals: typeof rn.registerGlobals,
            LiveKitRoom: typeof rn.LiveKitRoom,
            AudioSession: typeof rn.AudioSession,
            Track: typeof client?.Track,
          });

          if (
            typeof rn.registerGlobals !== 'function' ||
            !rn.LiveKitRoom ||
            !rn.AudioSession ||
            !client?.Track
          ) {
            lastFailure = 'failed';
            lastFailureDetail =
              'LiveKit static bindings incomplete (registerGlobals/LiveKitRoom/AudioSession/Track).';
            console.warn('[livekit] static bindings incomplete', {
              registerGlobals: typeof rn.registerGlobals,
              LiveKitRoom: typeof rn.LiveKitRoom,
              AudioSession: typeof rn.AudioSession,
              Track: typeof client?.Track,
            });
            return null;
          }

          if (!registered) {
            rn.registerGlobals();
            registered = true;
          }
          // Never block camera on AudioSession — native start can hang on some devices.
          if (!audioSessionStarted) {
            void rn.AudioSession.startAudioSession()
              .then(() => {
                audioSessionStarted = true;
              })
              .catch((audioErr: unknown) => {
                console.warn('[livekit] AudioSession.startAudioSession failed', audioErr);
              });
          }
          lastFailure = null;
          lastFailureDetail = null;
          return { rn: rn as unknown as LiveKitModule, client: client as unknown as LivekitClient };
        })(),
        LOAD_TIMEOUT_MS,
        'LiveKit took too long to start. Check camera permission and try again.',
      );
    } catch (err) {
      lastFailure = 'failed';
      lastFailureDetail = errorMessage(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.warn('[livekit] native load failed', err);
      if (stack) console.warn('[livekit] native load stack', stack);
      // Cache failure until resetLiveKitNativeLoad() — avoids spam re-require on every render.
      return null;
    }
  })();
  return loadPromise;
}

export async function stopLiveKitAudioSession() {
  if (!audioSessionStarted) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const impl = require('./livekit-native-impl') as typeof import('./livekit-native-impl');
    await impl.createLiveKitNative().rn.AudioSession.stopAudioSession();
  } catch {
    /* ignore */
  } finally {
    audioSessionStarted = false;
  }
}
