// Learn more: https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Vendored event-target-shim@6 — committed under frontend/vendor so CI/release
 * bundles never depend on fragile nested node_modules resolution.
 */
const VENDOR_SHIM_V6 = path.resolve(__dirname, 'vendor/event-target-shim-v6/index.js');

if (!fs.existsSync(VENDOR_SHIM_V6)) {
  throw new Error(
    `Missing ${VENDOR_SHIM_V6}. The vendored LiveKit WebRTC EventTarget shim is required.`,
  );
}

const previousResolveRequest = config.resolver.resolveRequest;

/**
 * React Native depends on event-target-shim@5; @livekit/react-native-webrtc needs @6.
 * Android Live crash without this: "Super expression must either be null or a function".
 *
 * 1) postinstall rewrites webrtc imports → event-target-shim-v6
 * 2) Metro always resolves that id (and legacy event-target-shim* from webrtc) to vendor v6
 *
 * @see https://github.com/react-native-webrtc/react-native-webrtc/issues/1503
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromWebrtc = context.originModulePath.includes('react-native-webrtc');
  const wantsV6Alias =
    moduleName === 'event-target-shim-v6' || moduleName.startsWith('event-target-shim-v6/');
  const wantsLegacyShim =
    moduleName === 'event-target-shim' || moduleName.startsWith('event-target-shim/');

  if (wantsV6Alias || (fromWebrtc && wantsLegacyShim)) {
    return { filePath: VENDOR_SHIM_V6, type: 'sourceFile' };
  }

  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Avoid package-exports picking a different event-target-shim entry than our pin.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
