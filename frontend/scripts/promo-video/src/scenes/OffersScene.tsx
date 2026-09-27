import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Screens } from '../assets';
import { AppScreen } from '../components/AppScreen';
import { revealCss } from '../components/Motion';
import { TapRipple } from '../components/TapRipple';
import { at } from '../timeline';
import { PhoneScene, type Cue } from './PhoneScene';

// Children of .thread: day, bubble, bubble, offer, counter-offer, bubble.
const REVEAL = [0.02, 0.07, 0.16, 0.27, 0.43, 0.54].map((f) => at('offers', f));
const T = { accept: at('offers', 0.7) };
export const offersCues: Cue[] = [
  { sfx: 'whoosh', at: 0, volume: 0.25 },
  { sfx: 'pop', at: REVEAL[1], volume: 0.2 },
  { sfx: 'pop', at: REVEAL[2], volume: 0.2 },
  { sfx: 'whoosh', at: REVEAL[3], volume: 0.22 },
  { sfx: 'pop', at: REVEAL[4], volume: 0.26 },
  { sfx: 'tap', at: T.accept, volume: 0.4 },
  { sfx: 'chime', at: T.accept + 3, volume: 0.35 },
];

const html = Screens.offerScreen('phone');

export const OffersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accepted =
    frame >= T.accept
      ? `.counter{border-color:#4F6B4C;background:#F4F7F2} .counter .offer-btns{display:none}` +
        `.counter::after{content:'\\2713  Offer accepted';display:block;margin-top:10px;color:#3F5A3C;font-weight:700;font-size:14px}`
      : '';
  return (
    <PhoneScene theme="plum" side="left" title="Make an offer" sub="Chat with sellers and agree on a price that works for you.">
      <AppScreen html={html} kind="phone" width={390} height={844} css={revealCss(frame, '.thread > *', REVEAL, fps, 22) + accepted}>
        <TapRipple x={85} y={584} at={T.accept} />
      </AppScreen>
    </PhoneScene>
  );
};
