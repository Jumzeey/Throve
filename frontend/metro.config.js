// Learn more: https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

function resolveEventTargetShimV6Entry() {
  const candidates = [];
  try {
    candidates.push(
      path.resolve(path.dirname(require.resolve('event-target-shim-v6/package.json')), 'index.js'),
    );
  } catch {
    /* fall through */
  }
  candidates.push(
    path.resolve(__dirname, 'node_modules/event-target-shim-v6/index.js'),
    path.resolve(__dirname, '../node_modules/event-target-shim-v6/index.js'),
    path.resolve(
      __dirname,
      'node_modules/@livekit/react-native-webrtc/node_modules/event-target-shim/index.js',
    ),
    path.resolve(
      __dirname,
      '../node_modules/@livekit/react-native-webrtc/node_modules/event-target-shim/index.js',
    ),
  );
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'Unable to resolve event-target-shim@6. Install event-target-shim-v6 (see frontend/package.json).',
  );
}

/**
 * React Native depends on event-target-shim@5; @livekit/react-native-webrtc needs @6.
 *
 * Codemagic used to `cd frontend && npm install`, which can flatten only RN's v5 into
 * node_modules. resolve-from(webrtc → event-target-shim) then returns v5 and Android
 * crashes with: "Super expression must either be null or a function".
 *
 * Always pin WebRTC's event-target-shim* imports to the dedicated v6 alias package.
 *
 * @see https://github.com/react-native-webrtc/react-native-webrtc/issues/1503
 * @see https://github.com/livekit/client-sdk-react-native/issues/223
 */
const eventTargetShimV6Entry = resolveEventTargetShimV6Entry();

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('react-native-webrtc')
  ) {
    return {
      filePath: eventTargetShimV6Entry,
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
