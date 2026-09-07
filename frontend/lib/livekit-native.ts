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
 *
 * Failures must resolve to null (SimulatedStage) — never throw through to the UI.
 * Android "Super expression must either be null or a function" means Metro resolved
 * RN's event-target-shim@5 for WebRTC — see metro.config.js + event-target-shim-v6.
 */
export function loadLiveKitNative() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (!canLoadNativeLiveKit()) return null;
    try {
      await import('@livekit/react-native-webrtc');
      const rn = await import('@livekit/react-native');
      if (!rn?.registerGlobals || !rn?.LiveKitRoom) {
        console.warn('[livekit] react-native module incomplete');
        return null;
      }
      const client = await import('livekit-client');
      if (!registered) {
        rn.registerGlobals();
        registered = true;
      }
      return { rn, client };
    } catch (err) {
      console.warn('[livekit] native load failed', err);
      return null;
    }
  })();
  return loadPromise;
}
