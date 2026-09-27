import React from 'react';
import { Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../assets';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** CSS that scrolls the given selectors up by `distance` between two frames (status bar stays put). */
export function ScrollY(frame: number, from: number, to: number, distance: number, selectors: string) {
  const y = interpolate(frame, [from, to], [0, -distance], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return `${selectors}{transform:translateY(${y}px)} .status{background:${C.ivory}}`;
}

/** Slow zoom on an image, for photo-led moments. */
export const KenBurns: React.FC<{ src: string; duration: number; from?: number; to?: number; style?: React.CSSProperties }> = ({
  src,
  duration,
  from = 1,
  to = 1.12,
  style,
}) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, duration], [from, to], clamp);
  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})` }} />
    </div>
  );
};

/** Reveal CSS for `selector:nth-child(i + 1)` starting at `starts[i]`. */
export function revealCss(frame: number, selector: string, starts: number[], fps: number, distance = 18) {
  return starts
    .map((start, i) => {
      const p = spring({ frame: frame - start, fps, config: { damping: 18, mass: 0.7 } });
      return `${selector}:nth-child(${i + 1}){opacity:${Math.min(1, p * 1.3)};transform:translateY(${(1 - p) * distance}px)}`;
    })
    .join('');
}

/** Evenly staggered variant of revealCss. */
export function staggerCss(frame: number, selector: string, count: number, start: number, step: number, fps: number, distance = 18) {
  return revealCss(frame, selector, Array.from({ length: count }, (_, i) => start + i * step), fps, distance);
}

/** Toast pill that drops in from the top of the screen. */
export const Toast: React.FC<{ at: number; text: string; width: number; tone?: 'plum' | 'success' }> = ({ at, text, width, tone = 'plum' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = spring({ frame: frame - at, fps, config: { damping: 16, mass: 0.7 } });
  return (
    <div style={{ position: 'absolute', left: 0, width, top: 58, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - p) * -90}px)`, opacity: p, zIndex: 30 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: tone === 'success' ? '#3F5A3C' : C.plum,
          color: '#fff',
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: 15,
          padding: '12px 18px',
          borderRadius: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,.25)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {text}
      </div>
    </div>
  );
};

export const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 20, mass: 0.9 } });
};
