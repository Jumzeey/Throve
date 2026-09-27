import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../assets';

export type Theme = 'ivory' | 'plum';

export const Background: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const bg =
    theme === 'plum'
      ? `radial-gradient(120% 90% at 30% 10%, #74305C 0%, ${C.plum} 55%, #43152F 100%)`
      : `radial-gradient(120% 90% at 30% 10%, #FFFCF8 0%, ${C.ivory} 55%, #F6E9DF 100%)`;
  const blob = theme === 'plum' ? 'rgba(216,138,161,.16)' : 'rgba(216,138,161,.14)';
  const drift = (speed: number, amp: number) => Math.sin((frame / 30) * speed) * amp;
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 760, height: 760, borderRadius: '50%', background: blob, left: -260 + drift(0.5, 30), top: 520 + drift(0.4, 20) }} />
      <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', background: blob, right: -220 + drift(0.6, 24), top: -200 + drift(0.3, 26) }} />
    </AbsoluteFill>
  );
};
