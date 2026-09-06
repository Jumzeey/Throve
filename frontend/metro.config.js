// Learn more: https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const resolveFrom = require('resolve-from');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * React Native depends on event-target-shim@5; @livekit/react-native-webrtc needs @6.
 * Without this, entering a live room loads WebRTC classes that extend an undefined
 * EventTarget → "Super expression must either be null or a function" on device.
 * @see https://github.com/react-native-webrtc/react-native-webrtc/issues/1503
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('react-native-webrtc')
  ) {
    const eventTargetShimPath = resolveFrom(context.originModulePath, moduleName);
    return { filePath: eventTargetShimPath, type: 'sourceFile' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
