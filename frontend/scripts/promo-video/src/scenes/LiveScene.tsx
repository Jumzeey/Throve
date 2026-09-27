import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Screens } from '../assets';
import { AppScreen } from '../components/AppScreen';
import { Toast, staggerCss } from '../components/Motion';
import { TapRipple } from '../components/TapRipple';
import { at } from '../timeline';
import { PhoneScene, type Cue } from './PhoneScene';

const T = {
  watch: at('live', 0.18),
  swap: at('live', 0.23),
  chat: at('live', 0.32),
  chatStep: Math.max(4, at('live', 0.07)),
  pinned: at('live', 0.6),
  claim: at('live', 0.74),
};
export const liveCues: Cue[] = [
  { sfx: 'whoosh', at: 0, volume: 0.25 },
  { sfx: 'tap', at: T.watch, volume: 0.4 },
  ...[0, 1, 2, 3].map((i) => ({ sfx: 'pop' as const, at: T.chat + i * T.chatStep, volume: 0.22 })),
  { sfx: 'whoosh', at: T.pinned, volume: 0.18 },
  { sfx: 'tap', at: T.claim, volume: 0.4 },
  { sfx: 'chime', at: T.claim + 3, volume: 0.35 },
];

const tabHtml = Screens.liveTabScreen('phone');
const roomHtml = Screens.liveRoomScreen('phone');

export const LiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const roomOpacity = interpolate(frame, [T.swap, T.swap + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const roomCss =
    staggerCss(frame, '.msg', 4, T.chat, T.chatStep, fps, 24) +
    staggerCss(frame, '.pinned', 1, T.pinned, 0, fps, 140) +
    `.room{transform:scale(${interpolate(frame, [T.swap, T.swap + 90], [1.06, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })})}`;
  return (
    <PhoneScene theme="plum" side="left" title="Shop live drops" sub="Tune in, chat with hosts and claim pieces the moment they’re shown.">
      <AppScreen html={tabHtml} kind="phone" width={390} height={844}>
        <TapRipple x={316} y={464} at={T.watch} />
      </AppScreen>
      {frame >= T.swap && (
        <AppScreen html={roomHtml} kind="phone" width={390} height={844} dark css={roomCss} style={{ opacity: roomOpacity }}>
          <TapRipple x={320} y={722} at={T.claim} />
          <Toast at={T.claim + 4} text="Claimed! Added to your bag" width={390} />
        </AppScreen>
      )}
    </PhoneScene>
  );
};
