import React from 'react';
import { AbsoluteFill, Easing, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Screens, useAssetsReady } from './assets';
import manifest from './audio-manifest.json';
import { CheckoutScene, checkoutCues } from './scenes/CheckoutScene';
import { DiscoverScene, discoverCues } from './scenes/DiscoverScene';
import { EndScene, endCues } from './scenes/EndScene';
import { LiveScene, liveCues } from './scenes/LiveScene';
import { LogoScene, logoCues } from './scenes/LogoScene';
import { OffersScene, offersCues } from './scenes/OffersScene';
import type { Cue, SfxName } from './scenes/PhoneScene';
import { ProductScene, productCues } from './scenes/ProductScene';
import { SellScene, sellCues } from './scenes/SellScene';
import { FPS, MUSIC_OFFSET_SECONDS, SCENES, TOTAL_FRAMES, type SceneId } from './timeline';

const SCENE_VIEWS: Record<SceneId, { Component: React.FC; cues: Cue[] }> = {
  logo: { Component: LogoScene, cues: logoCues },
  discover: { Component: DiscoverScene, cues: discoverCues },
  live: { Component: LiveScene, cues: liveCues },
  product: { Component: ProductScene, cues: productCues },
  offers: { Component: OffersScene, cues: offersCues },
  checkout: { Component: CheckoutScene, cues: checkoutCues },
  sell: { Component: SellScene, cues: sellCues },
  end: { Component: EndScene, cues: endCues },
};

/** Each scene after the first starts WIPE_LEAD frames early and wipes in across the bar line. */
const WIPE = 10;
const WIPE_LEAD = 5;
const PLACED = SCENES.map((s, i) => {
  const lead = i === 0 ? 0 : WIPE_LEAD;
  return { ...s, start: s.from - lead, length: s.duration + lead, wipe: i > 0, dir: i % 2 ? 'left' : 'right' } as const;
});
const CUES = PLACED.flatMap((s) => SCENE_VIEWS[s.id].cues.map((c) => ({ ...c, at: s.start + c.at })));

const Wipe: React.FC<{ dir: 'left' | 'right'; children: React.ReactNode }> = ({ dir, children }) => {
  const p = interpolate(useCurrentFrame(), [0, WIPE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const hidden = `${(1 - p) * 100}%`;
  return <AbsoluteFill style={{ clipPath: dir === 'left' ? `inset(0 0 0 ${hidden})` : `inset(0 ${hidden} 0 0)` }}>{children}</AbsoluteFill>;
};

const MUSIC_LEVEL = 0.7;
const DUCK = 0.8;

/** Music gain: fade in/out, dipping under each sound effect so taps and chimes read clearly. */
function musicVolume(f: number) {
  const fade = interpolate(f, [0, 3, TOTAL_FRAMES - 15, TOTAL_FRAMES], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const duck = CUES.reduce((g, c) => {
    const d = f - c.at;
    if (d < -3 || d > 14) return g;
    return Math.min(g, interpolate(d, [-3, 0, 6, 14], [1, DUCK, DUCK, 1]));
  }, 1);
  return MUSIC_LEVEL * fade * duck;
}

type SfxMeta = { peak: number; length: number; gain: number };
const SFX_META = manifest.sfxMeta as Record<SfxName, SfxMeta>;
const SFX_LEVEL = 0.85;
const SFX_TAIL = FPS * 0.8;
const SFX_FADE = 8;

/** Cue frames mark where a sound's loudest moment lands, so risers peak on the cut and whooshes on the wipe. */
const SFX_PLAYS = CUES.map((c) => {
  const meta = SFX_META[c.sfx];
  const peak = Math.round(meta.peak * FPS);
  const from = c.at - peak;
  const trim = Math.max(0, -from);
  const length = Math.max(SFX_FADE + 1, Math.min(Math.round(meta.length * FPS), peak + SFX_TAIL) - trim);
  return { ...c, from: Math.max(0, from), trim, length, volume: Math.min(1, (c.volume ?? 0.3) * meta.gain * SFX_LEVEL) };
});

const sfxVolume = (length: number, volume: number) => (f: number) =>
  volume * interpolate(f, [length - SFX_FADE, length], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const Promo: React.FC = () => {
  useAssetsReady();
  const sfx = manifest.sfx as Record<SfxName, string>;
  return (
    <AbsoluteFill style={{ background: '#FFF7F0' }}>
      <style>{Screens.fontFaceCss()}</style>
      {PLACED.map(({ id, start, length, wipe, dir }) => {
        const { Component } = SCENE_VIEWS[id];
        return (
          <Sequence key={id} from={start} durationInFrames={length} name={id}>
            {wipe ? (
              <Wipe dir={dir}>
                <Component />
              </Wipe>
            ) : (
              <Component />
            )}
          </Sequence>
        );
      })}
      {manifest.music && (
        <Html5Audio src={staticFile(manifest.music)} trimBefore={Math.round((manifest.musicStart + MUSIC_OFFSET_SECONDS) * FPS)} volume={musicVolume} />
      )}
      {SFX_PLAYS.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.length} name={`sfx ${c.sfx}`} layout="none">
          <Html5Audio src={staticFile(sfx[c.sfx])} trimBefore={c.trim || undefined} volume={sfxVolume(c.length, c.volume)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
