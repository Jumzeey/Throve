// Copies app images/fonts into public/, synthesises fallback UI sound effects, measures the audio
// (peak timing, loudness, music lead-in), and writes src/audio-manifest.json so the composition only
// references audio files that exist.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '../..');
const ROOT = path.resolve(FRONTEND, '..');
const PUBLIC = path.join(HERE, 'public');

function copyDir(from, to, filter = () => true) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (filter(name)) fs.copyFileSync(path.join(from, name), path.join(to, name));
  }
}

copyDir(path.join(FRONTEND, 'assets/hifi'), path.join(PUBLIC, 'hifi'), (n) => n.endsWith('.jpg'));
fs.mkdirSync(path.join(PUBLIC, 'images'), { recursive: true });
fs.copyFileSync(path.join(FRONTEND, 'assets/images/throve-mark.png'), path.join(PUBLIC, 'images/throve-mark.png'));
fs.copyFileSync(path.join(HERE, 'assets/google-play-badge.png'), path.join(PUBLIC, 'images/google-play-badge.png'));

const FONTS = [
  ['playfair-display', '600SemiBold/PlayfairDisplay_600SemiBold.ttf'],
  ['playfair-display', '700Bold/PlayfairDisplay_700Bold.ttf'],
  ['inter', '400Regular/Inter_400Regular.ttf'],
  ['inter', '500Medium/Inter_500Medium.ttf'],
  ['inter', '600SemiBold/Inter_600SemiBold.ttf'],
  ['inter', '700Bold/Inter_700Bold.ttf'],
];
for (const [pkg, file] of FONTS) {
  const to = path.join(PUBLIC, 'fonts', pkg, file);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'node_modules/@expo-google-fonts', pkg, file), to);
}

// ---------- Fallback SFX (used until Envato files are dropped into public/audio/sfx) ----------
const RATE = 44100;

function writeWav(file, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

let seed = 7;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const buf = (sec) => new Float64Array(Math.round(sec * RATE));
const bell = (out, freq, start, dur, amp) => {
  const s0 = Math.round(start * RATE);
  for (let i = 0; i < dur * RATE && s0 + i < out.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 7);
    out[s0 + i] += amp * env * (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(2 * Math.PI * freq * 2.01 * t));
  }
};

const SFX = {
  tap() {
    const o = buf(0.08);
    for (let i = 0; i < o.length; i++) {
      const t = i / RATE;
      o[i] = 0.5 * Math.exp(-t * 90) * Math.sin(2 * Math.PI * 1700 * t) + 0.25 * Math.exp(-t * 400) * noise();
    }
    return o;
  },
  pop() {
    const o = buf(0.12);
    let ph = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / RATE;
      ph += (2 * Math.PI * (380 + 900 * Math.min(1, t / 0.05))) / RATE;
      o[i] = 0.6 * Math.min(1, t / 0.003) * Math.exp(-t * 38) * Math.sin(ph);
    }
    return o;
  },
  whoosh() {
    const o = buf(0.45);
    let lp = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / o.length;
      const cutoff = 0.02 + 0.2 * Math.sin(Math.PI * t);
      lp += cutoff * (noise() - lp);
      o[i] = 1.6 * Math.sin(Math.PI * t) ** 2 * lp;
    }
    return o;
  },
  chime() {
    const o = buf(0.9);
    bell(o, 1318.5, 0, 0.9, 0.28);
    bell(o, 1975.5, 0.09, 0.8, 0.22);
    return o;
  },
  success() {
    const o = buf(1.0);
    bell(o, 1046.5, 0, 1, 0.22);
    bell(o, 1318.5, 0.08, 0.9, 0.22);
    bell(o, 1568.0, 0.16, 0.84, 0.24);
    return o;
  },
  riser() {
    const o = buf(1.4);
    let ph = 0;
    let lp = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / o.length;
      ph += (2 * Math.PI * (180 + 900 * t * t)) / RATE;
      lp += (0.02 + 0.3 * t) * (noise() - lp);
      const env = t ** 2 * (t > 0.96 ? (1 - t) / 0.04 : 1);
      o[i] = env * (0.25 * Math.sin(ph) + 0.5 * lp);
    }
    return o;
  },
};

const GENERATED = path.join(PUBLIC, 'audio/generated');
fs.mkdirSync(GENERATED, { recursive: true });
fs.mkdirSync(path.join(PUBLIC, 'audio/sfx'), { recursive: true });
for (const [name, make] of Object.entries(SFX)) writeWav(path.join(GENERATED, `${name}.wav`), make());

// ---------- Manifest ----------
const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
const findAudio = (dir, base) => {
  const abs = path.join(PUBLIC, dir);
  if (!fs.existsSync(abs)) return null;
  const hit = fs.readdirSync(abs).find((n) => path.parse(n).name === base && AUDIO_EXT.includes(path.extname(n).toLowerCase()));
  return hit ? `${dir}/${hit}` : null;
};

// ---------- Audio analysis (Remotion's bundled ffmpeg decodes any format to 16-bit mono WAV) ----------
const COMPOSITOR = (() => {
  const base = path.join(HERE, 'node_modules/@remotion');
  const dir = fs.existsSync(base) ? fs.readdirSync(base).find((n) => n.startsWith('compositor-')) : null;
  return dir ? path.join(base, dir) : null;
})();
const ANALYSIS_RATE = 16000;
const TARGET_PEAK_DB = -4;

/** Loudness envelope in 10 ms windows: loudest window, when it happens, first audible moment, length. */
function analyse(rel) {
  if (!COMPOSITOR) return null;
  const tmp = path.join(os.tmpdir(), `throve-promo-${process.pid}.wav`);
  const r = spawnSync('./ffmpeg', ['-hide_banner', '-v', 'error', '-i', path.join(PUBLIC, rel), '-ac', '1', '-ar', String(ANALYSIS_RATE), '-c:a', 'pcm_s16le', '-f', 'wav', '-y', tmp], { cwd: COMPOSITOR });
  if (r.status !== 0) return null;
  const raw = fs.readFileSync(tmp);
  fs.rmSync(tmp, { force: true });
  const at = raw.indexOf('data') + 8;
  const n = Math.floor((raw.length - at) / 2);
  const win = ANALYSIS_RATE / 100;
  const db = [];
  for (let i = 0; i + win <= n; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += (raw.readInt16LE(at + j * 2) / 32768) ** 2;
    db.push(10 * Math.log10(sum / win + 1e-12));
  }
  const peakDb = Math.max(...db);
  return {
    peakDb,
    peak: db.indexOf(peakDb) / 100,
    start: Math.max(0, db.findIndex((d) => d > peakDb - 30)) / 100,
    length: n / ANALYSIS_RATE,
  };
}

const round = (v) => Math.round(v * 1000) / 1000;
const music = findAudio('audio', 'music');
const musicInfo = music && analyse(music);
const sfx = Object.fromEntries(Object.keys(SFX).map((n) => [n, findAudio('audio/sfx', n) ?? `audio/generated/${n}.wav`]));
const sfxMeta = Object.fromEntries(
  Object.entries(sfx).map(([n, file]) => {
    const info = analyse(file);
    const custom = !file.startsWith('audio/generated/');
    const gain = info && custom ? Math.min(5, Math.max(0.2, 10 ** ((TARGET_PEAK_DB - info.peakDb) / 20))) : 1;
    return [n, { peak: round(info?.peak ?? 0), length: round(info?.length ?? 2), gain: round(gain) }];
  }),
);

const manifest = { music, musicStart: round(musicInfo?.start ?? 0), sfx, sfxMeta };
fs.writeFileSync(path.join(HERE, 'src/audio-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`music: ${manifest.music ?? '(none — drop public/audio/music.mp3)'}${music ? ` (first sound at ${manifest.musicStart}s)` : ''}`);
for (const [n, f] of Object.entries(manifest.sfx)) {
  const m = sfxMeta[n];
  console.log(`sfx ${n}: ${f} (peak at ${m.peak}s, gain ${m.gain})`);
}
