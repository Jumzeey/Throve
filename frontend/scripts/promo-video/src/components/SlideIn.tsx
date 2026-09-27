import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const useSpring = (delay: number, damping = 18) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.8 } });
};

/** Absolutely positioned wrapper that springs in from a side. */
export const SlideIn: React.FC<{
  from?: 'bottom' | 'left' | 'right' | 'top';
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ from = 'bottom', delay = 0, distance = 120, style, children }) => {
  const p = useSpring(delay);
  const off = (1 - p) * distance;
  const t = { bottom: `translateY(${off}px)`, top: `translateY(${-off}px)`, left: `translateX(${-off}px)`, right: `translateX(${off}px)` }[from];
  return <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, p * 1.4), transform: t, ...style }}>{children}</div>;
};
