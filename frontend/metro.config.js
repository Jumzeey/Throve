// Learn more: https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const resolveFrom = require('resolve-from');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

function resolveEventTargetShimV6(fromFile) {
  // v6 exports "." but not "./index"; WebRTC still imports ".../index"
  try {
    return resolveFrom(fromFile, 'event-target-shim');
  } catch {
    /* try known install locations next */
  }

  const candidates = [
    path.resolve(
      __dirname,
      'node_modules/@livekit/react-native-webrtc/node_modules/event-target-shim/index.js',
    ),
    path.resolve(
      __dirname,
      '../node_modules/@livekit/react-native-webrtc/node_modules/event-target-shim/index.js',
    ),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'Unable to resolve event-target-shim@6 for react-native-webrtc. Reinstall dependencies.',
  );
}

/**
 * React Native depends on event-target-shim@5; @livekit/react-native-webrtc needs @6.
 * Without this, LiveKit WebRTC either fails to bundle (`./index` export missing) or
 * crashes on device ("Super expression must either be null or a function").
 * @see https://github.com/react-native-webrtc/react-native-webrtc/issues/1503
 * @see https://github.com/livekit/client-sdk-react-native/issues/223
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('react-native-webrtc')
  ) {
    return {
      filePath: resolveEventTargetShimV6(context.originModulePath),
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
