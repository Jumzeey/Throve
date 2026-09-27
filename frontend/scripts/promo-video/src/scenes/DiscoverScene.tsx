import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { C, Screens } from '../assets';
import { AppScreen } from '../components/AppScreen';
import { ScrollY, Toast } from '../components/Motion';
import { TapRipple } from '../components/TapRipple';
import { at } from '../timeline';
import { PhoneScene, type Cue } from './PhoneScene';

const SCROLL = 300;
const T = { scrollFrom: at('discover', 0.16), scrollTo: at('discover', 0.46), tap: at('discover', 0.62) };
export const discoverCues: Cue[] = [
  { sfx: 'whoosh', at: 0, volume: 0.25 },
  { sfx: 'tap', at: T.tap, volume: 0.4 },
  { sfx: 'pop', at: T.tap + 3, volume: 0.3 },
];

const html = Screens.homeScreen('phone');

export const DiscoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const liked = frame >= T.tap;
  const pop = liked ? spring({ frame: frame - T.tap, fps, config: { damping: 8 } }) : 0;
  const heart = liked
    ? `.grid .card:first-child .card-heart{transform:scale(${1 + (1 - pop) * 0.5})} .grid .card:first-child .card-heart path{fill:${C.plum};stroke:${C.plum}}`
    : '';
  return (
    <PhoneScene theme="ivory" side="right" title="Discover pre-loved pieces" sub="Curated secondhand fashion from trusted sellers across Nigeria.">
      <AppScreen html={html} kind="phone" width={390} height={844} css={ScrollY(frame, T.scrollFrom, T.scrollTo, SCROLL, '.pad, .hscroll') + heart}>
        <TapRipple x={165} y={667 - SCROLL} at={T.tap} />
        <Toast at={T.tap + 4} text="Saved to your likes" width={390} />
      </AppScreen>
    </PhoneScene>
  );
};
