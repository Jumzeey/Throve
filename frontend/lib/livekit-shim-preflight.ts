/**
 * Must load before @livekit/react-native-webrtc so we fail with a clear error if
 * EventTarget is missing (Hermes: "Super expression must either be null or a function").
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const shim = require('../vendor/event-target-shim-v6/hermes.js') as {
  EventTarget?: unknown;
  Event?: unknown;
  default?: { EventTarget?: unknown; Event?: unknown };
};

const EventTarget = shim?.EventTarget ?? shim?.default?.EventTarget;
const Event = shim?.Event ?? shim?.default?.Event;

if (typeof EventTarget !== 'function' || typeof Event !== 'function') {
  throw new Error(
    `event-target-shim-v6 preflight failed (EventTarget=${typeof EventTarget}, Event=${typeof Event}, keys=${Object.keys(shim ?? {}).join(',')})`,
  );
}

export {};
