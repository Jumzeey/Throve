#!/usr/bin/env node
/**
 * @livekit/react-native-webrtc imports `event-target-shim/index`, which collides with
 * React Native's event-target-shim@5 and crashes Android Live with:
 * "Super expression must either be null or a function".
 *
 * Rewrite those imports to `event-target-shim-v6` (vendored under frontend/vendor).
 */
const fs = require('fs');
const path = require('path');

const roots = [
  path.resolve(__dirname, '../node_modules/@livekit/react-native-webrtc'),
  path.resolve(__dirname, '../../node_modules/@livekit/react-native-webrtc'),
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
      .replace(/require\(['"]event-target-shim\/index['"]\)/g, "require('event-target-shim-v6')");
    if (next !== before) {
      fs.writeFileSync(file, next);
      changed += 1;
    }
  }
}

console.log(`[patch-livekit-webrtc-shim] updated ${changed} file(s)`);
