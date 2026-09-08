#!/usr/bin/env node
/**
 * @livekit/react-native-webrtc imports `event-target-shim/index`, which collides with
 * React Native's event-target-shim@5 and crashes Android Live with:
 * "Super expression must either be null or a function".
 *
 * 1) Rewrite those imports to `event-target-shim-v6` (vendored hermes.js).
 * 2) LiveKit 2.12 MediaRecorder imports EventTarget from webrtc 125, which does not
 *    export it — rewrite that import to the same shim.
 */
const fs = require('fs');
const path = require('path');

const roots = [
  path.resolve(__dirname, '../node_modules/@livekit/react-native-webrtc'),
  path.resolve(__dirname, '../../node_modules/@livekit/react-native-webrtc'),
];

const livekitRnRoots = [
  path.resolve(__dirname, '../node_modules/@livekit/react-native'),
  path.resolve(__dirname, '../../node_modules/@livekit/react-native'),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|ts|tsx|mjs|cjs)$/.test(name) || name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

let changed = 0;
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes('event-target-shim')) continue;
    const next = before
      .replace(/from ['"]event-target-shim\/index['"]/g, "from 'event-target-shim-v6'")
      .replace(/require\(['"]event-target-shim\/index['"]\)/g, "require('event-target-shim-v6')")
      .replace(/from ['"]event-target-shim['"]/g, "from 'event-target-shim-v6'")
      .replace(/require\(['"]event-target-shim['"]\)/g, "require('event-target-shim-v6')");
    if (next !== before) {
      fs.writeFileSync(file, next);
      changed += 1;
    }
  }
}

let mediaRecorderPatched = 0;
for (const root of livekitRnRoots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    if (!/MediaRecorder\.(ts|js)$/.test(file)) continue;
    const before = fs.readFileSync(file, 'utf8');
    let next = before.replace(
      /import \{\s*EventTarget,\s*Event,\s*getEventAttributeValue,\s*setEventAttributeValue,\s*\} from ['"]@livekit\/react-native-webrtc['"];/g,
      "import { EventTarget, Event, getEventAttributeValue, setEventAttributeValue } from 'event-target-shim-v6';",
    );
    next = next.replace(
      "import { EventTarget, Event, getEventAttributeValue, setEventAttributeValue } from '@livekit/react-native-webrtc';",
      "import { EventTarget, Event, getEventAttributeValue, setEventAttributeValue } from 'event-target-shim-v6';",
    );
    next = next.replace(
      /var _reactNativeWebrtc = require\(["']@livekit\/react-native-webrtc["']\);/g,
      "var _reactNativeWebrtc = require('event-target-shim-v6');",
    );
    if (next !== before) {
      fs.writeFileSync(file, next);
      mediaRecorderPatched += 1;
    }
  }
}

console.log(
  `[patch-livekit-webrtc-shim] updated ${changed} webrtc import(s), ${mediaRecorderPatched} MediaRecorder file(s)`,
);
