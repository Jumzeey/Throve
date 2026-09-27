import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Screens } from '../assets';
import { AppScreen } from '../components/AppScreen';
import { Background } from '../components/Background';
import { DeviceFrame, deviceSize } from '../components/DeviceFrame';
import { Headline } from '../components/Headline';
import { Toast, revealCss, staggerCss, useEnter } from '../components/Motion';
import { TapRipple } from '../components/TapRipple';
import { at, HEIGHT } from '../timeline';
import type { Cue } from './PhoneScene';

const PHONE = deviceSize('phone', 1);
const TABLET_SCALE = 0.64;
const TABLET = deviceSize('tablet', TABLET_SCALE);

const T = {
  photos: [0.05, 0.1, 0.14, 0.18].map((f) => at('sell', f)),
  fields: at('sell', 0.14),
  publish: at('sell', 0.5),
  tablet: at('sell', 0.6),
};
export const sellCues: Cue[] = [
  { sfx: 'whoosh', at: 0, volume: 0.25 },
  { sfx: 'pop', at: T.photos[0], volume: 0.24 },
  { sfx: 'pop', at: T.photos[1], volume: 0.24 },
  { sfx: 'tap', at: T.publish, volume: 0.4 },
  { sfx: 'chime', at: T.publish + 3, volume: 0.32 },
  { sfx: 'whoosh', at: T.tablet - 2, volume: 0.28 },
];

const sellHtml = Screens.sellScreen('phone');
const sellerHtml = Screens.sellerScreen('t10');

export const SellScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = useEnter(-4);
  const tabletIn = spring({ frame: frame - T.tablet, fps, config: { damping: 20, mass: 0.9 } });
  const float = Math.sin(frame / 22) * 5;
  const photoCss = T.photos
    .map((start, i) => {
      const p = spring({ frame: frame - start, fps, config: { damping: 11 } });
      return `.photos > :nth-child(${i + 1}){opacity:${Math.min(1, p * 1.5)};transform:scale(${0.5 + p * 0.5})}`;
    })
    .join('');
  const phoneLeft = interpolate(tabletIn, [0, 1], [1190, 900]);

  return (
    <AbsoluteFill>
      <Background theme="plum" />
      <Headline theme="plum" title="Sell in minutes" sub="Snap, price and list your wardrobe for thousands of shoppers." left={150} width={700} />
      <DeviceFrame
        kind="tablet"
        scale={TABLET_SCALE}
        theme="plum"
        style={{
          left: 1370,
          top: (HEIGHT - TABLET.height) / 2 - float,
          opacity: tabletIn,
          transform: `translateX(${(1 - tabletIn) * 420}px)`,
        }}
      >
        <AppScreen html={sellerHtml} kind="t10" width={700} height={1120} css={staggerCss(frame, '.prof .grid > *', 8, T.tablet + 6, 2, fps, 30)} />
      </DeviceFrame>
      <DeviceFrame
        kind="phone"
        scale={1}
        theme="plum"
        style={{
          left: phoneLeft,
          top: (HEIGHT - PHONE.height) / 2 + float,
          transform: `translateY(${(1 - phoneIn) * 260}px)`,
          opacity: Math.min(1, phoneIn * 1.6),
        }}
      >
        <AppScreen html={sellHtml} kind="phone" width={390} height={844} css={photoCss + revealCss(frame, '.pad > *', [0, 0, ...Array.from({ length: 7 }, (_, i) => T.fields + i * 2)], fps, 20)}>
          <TapRipple x={195} y={695} at={T.publish} />
          <Toast at={T.publish + 4} text="Listing published" width={390} tone="success" />
        </AppScreen>
      </DeviceFrame>
    </AbsoluteFill>
  );
};
