import React from 'react';
import { Img, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, image } from '../assets';
import type { Theme } from './Background';

/** Eyebrow + Playfair headline that rises word by word, then the subline fades up. */
export const Headline: React.FC<{
  theme: Theme;
  title: string;
  sub: string;
  left: number;
  width: number;
  delay?: number;
  size?: number;
}> = ({ theme, title, sub, left, width, delay = 0, size = 84 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const onPlum = theme === 'plum';
  const rise = (d: number) => spring({ frame: frame - d, fps, config: { damping: 18, mass: 0.7 } });
  const words = title.split(' ');
  const subIn = rise(delay + words.length * 3 + 4);
  const eyebrowIn = rise(delay - 2);

  return (
    <div style={{ position: 'absolute', left, top: 0, bottom: 0, width, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: onPlum ? '#F3C9D6' : C.plum,
          opacity: eyebrowIn,
          transform: `translateY(${(1 - eyebrowIn) * 16}px)`,
          marginBottom: 26,
        }}
      >
        <Img src={image('throve-mark.png')} style={{ width: 30, height: 30, filter: onPlum ? 'brightness(0) invert(1)' : undefined }} />
        Throve
      </div>
      <div style={{ fontFamily: 'Playfair', fontWeight: 600, fontSize: size, lineHeight: 1.08, letterSpacing: '-0.01em', color: onPlum ? C.ivory : C.espresso }}>
        {words.map((w, i) => {
          const p = rise(delay + i * 3);
          return (
            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em', marginRight: '0.24em' }}>
              <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)` }}>{w}</span>
            </span>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: 'Inter',
          fontSize: 28,
          lineHeight: 1.45,
          marginTop: 24,
          maxWidth: width - 40,
          color: onPlum ? 'rgba(255,247,240,.82)' : C.body,
          opacity: subIn,
          transform: `translateY(${(1 - subIn) * 20}px)`,
        }}
      >
        {sub}
      </div>
    </div>
  );
};
