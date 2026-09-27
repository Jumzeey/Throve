import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Background, type Theme } from '../components/Background';
import { DeviceFrame, deviceSize } from '../components/DeviceFrame';
import { Headline } from '../components/Headline';
import { useEnter } from '../components/Motion';
import { HEIGHT } from '../timeline';

export type SfxName = 'tap' | 'pop' | 'whoosh' | 'chime' | 'success' | 'riser';
export type Cue = { sfx: SfxName; at: number; volume?: number };

export const PHONE_SCALE = 1;
const PHONE = deviceSize('phone', PHONE_SCALE);

/** Headline on one side, phone springing up on the other, with a gentle float. */
export const PhoneScene: React.FC<{
  theme: Theme;
  side: 'left' | 'right';
  title: string;
  sub: string;
  children: React.ReactNode;
}> = ({ theme, side, title, sub, children }) => {
  const frame = useCurrentFrame();
  const p = useEnter(-4);
  const float = Math.sin(frame / 22) * 5;
  const tilt = interpolate(p, [0, 1], [side === 'right' ? 4 : -4, 0]);
  const deviceLeft = side === 'right' ? 1190 : 318;
  return (
    <AbsoluteFill>
      <Background theme={theme} />
      <Headline theme={theme} title={title} sub={sub} left={side === 'right' ? 150 : 880} width={side === 'right' ? 900 : 900} />
      <DeviceFrame
        kind="phone"
        scale={PHONE_SCALE}
        theme={theme}
        style={{
          left: deviceLeft,
          top: (HEIGHT - PHONE.height) / 2 + float,
          transform: `translateY(${(1 - p) * 260}px) rotate(${tilt}deg)`,
          opacity: Math.min(1, p * 1.6),
        }}
      >
        {children}
      </DeviceFrame>
    </AbsoluteFill>
  );
};
