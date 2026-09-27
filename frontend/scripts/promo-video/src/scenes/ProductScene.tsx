import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Screens } from '../assets';
import { AppScreen } from '../components/AppScreen';
import { staggerCss } from '../components/Motion';
import { TapRipple } from '../components/TapRipple';
import { at, SCENES } from '../timeline';
import { PhoneScene, type Cue } from './PhoneScene';

const DURATION = SCENES.find((s) => s.id === 'product')!.duration;
const T = { details: at('product', 0.1), tap: at('product', 0.8) };
export const productCues: Cue[] = [
  { sfx: 'whoosh', at: 0, volume: 0.25 },
  { sfx: 'tap', at: T.tap, volume: 0.4 },
];

const html = Screens.productScreen('phone');

export const ProductScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, DURATION], [1, 1.16]);
  const css =
    `.pd-img{background-size:${390 * zoom}px auto;background-position:center ${interpolate(frame, [0, DURATION], [18, 30])}%}` +
    staggerCss(frame, '.pd-body > *', 8, T.details, 3, fps, 26);
  return (
    <PhoneScene theme="ivory" side="right" title="Every detail, up close" sub="Real photos, honest condition notes and clear sizing.">
      <AppScreen html={html} kind="phone" width={390} height={844} css={css}>
        <TapRipple x={285} y={683} at={T.tap} />
      </AppScreen>
    </PhoneScene>
  );
};
