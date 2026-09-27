export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Tempo of the chosen music track; scene cuts land on bar lines. */
export const BPM = 120;
/** Extra seconds to skip past the music's detected first sound (e.g. a slow intro before the first downbeat). */
export const MUSIC_OFFSET_SECONDS = 0;

export const FRAMES_PER_BAR = (60 / BPM) * 4 * FPS;
export const beats = (n: number) => Math.round((n * FRAMES_PER_BAR) / 4);

const BARS = [
  ['logo', 1.5],
  ['discover', 2],
  ['live', 2],
  ['product', 1.5],
  ['offers', 2],
  ['checkout', 1.5],
  ['sell', 2],
  ['end', 2.5],
] as const;

export type SceneId = (typeof BARS)[number][0];

let cursor = 0;
export const SCENES = BARS.map(([id, bars]) => {
  const from = Math.round(cursor * FRAMES_PER_BAR);
  cursor += bars;
  return { id, from, duration: Math.round(cursor * FRAMES_PER_BAR) - from };
});

export const TOTAL_FRAMES = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].duration;

/** Scene-relative frame expressed as a fraction of that scene, so timings scale with BPM. */
export const at = (id: SceneId, fraction: number) => Math.round(SCENES.find((s) => s.id === id)!.duration * fraction);
