import Constants, { ExecutionEnvironment } from 'expo-constants';

type LiveKitModule = typeof import('@livekit/react-native');
type LivekitClient = typeof import('livekit-client');

export type LiveKitNative = { rn: LiveKitModule; client: LivekitClient };

let loadPromise: Promise<LiveKitNative | null> | null = null;
let registered = false;

export function canLoadNativeLiveKit() {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

/**
 * Load LiveKit once. registerGlobals must not run on every live-screen mount —
 * repeating it on Android/iOS WebRTC crashes the process.
 */
export function loadLiveKitNative() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (!canLoadNativeLiveKit()) return null;
    try {
      await import('@livekit/react-native-webrtc');
      const rn = await import('@livekit/react-native');
      const client = await import('livekit-client');
      if (!registered) {
        rn.registerGlobals();
        registered = true;
      }
      return { rn, client };
    } catch {
      return null;
    }
  })();
  return loadPromise;
}
