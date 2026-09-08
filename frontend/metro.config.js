// Learn more: https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Class-free EventTarget for LiveKit WebRTC. Metro+Hermes break event-target-shim@6
 * (ES classes and es5.js helpers) with "Super expression must either be null or a function".
 */
const SHIM_CJS = path.resolve(__dirname, 'vendor/event-target-shim-v6/hermes.js');

if (!fs.existsSync(SHIM_CJS)) {
  throw new Error(`Missing ${SHIM_CJS}.`);
}

const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromWebrtc = context.originModulePath.includes('react-native-webrtc');
  const wantsShim =
    moduleName === 'event-target-shim' ||
    moduleName.startsWith('event-target-shim/') ||
    moduleName === 'event-target-shim-v6' ||
    moduleName.startsWith('event-target-shim-v6/');

  if (wantsShim && (fromWebrtc || moduleName.includes('event-target-shim-v6'))) {
    return { filePath: SHIM_CJS, type: 'sourceFile' };
  }

  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
