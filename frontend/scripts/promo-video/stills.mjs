// Renders review stills: `node stills.mjs 60 150 300` (frame numbers) into ./stills/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.join(HERE, 'src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'ThrovePromo' });
fs.mkdirSync(path.join(HERE, 'stills'), { recursive: true });
for (const frame of frames) {
  const output = path.join(HERE, 'stills', `f${String(frame).padStart(4, '0')}.png`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: 'png', scale: 0.5 });
  console.log(output);
}
