/**
 * Static LiveKit bindings for Metro.
 * Dynamic import()/require('@livekit/react-native') returns `{ default }` without named
 * exports in our Hermes release/debug bundles — named static imports resolve correctly.
 */
import './livekit-shim-preflight';
import '@livekit/react-native-webrtc';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  registerGlobals,
  useLocalParticipant,
  useTracks,
} from '@livekit/react-native';
import * as LivekitClient from 'livekit-client';

export function createLiveKitNative() {
  return {
    rn: {
      registerGlobals,
      LiveKitRoom,
      AudioSession,
      VideoTrack,
      useTracks,
      useLocalParticipant,
    },
    client: LivekitClient,
  };
}
