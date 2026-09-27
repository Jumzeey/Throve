import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { C, hifi, image } from '../assets';
import { Background } from '../components/Background';
import { useEnter } from '../components/Motion';
import { at } from '../timeline';
import type { Cue } from './PhoneScene';

export const logoCues: Cue[] = [{ sfx: 'riser', at: at('logo', 1), volume: 0.35 }];

const FLOATERS = [
  { src: 'womens-midi-dress.jpg', x: 120, y: 120, r: -8, d: 2 },
  { src: 'brown-shoulder-bag.jpg', x: 1600, y: 90, r: 7, d: 5 },
  { src: 'black-heels.jpg', x: 210, y: 700, r: 6, d: 8 },
  { src: 'mens-jacket.jpg', x: 1520, y: 660, r: -6, d: 4 },
  { src: 'watch.jpg', x: 520, y: 40, r: 4, d: 10 },
  { src: 'womens-top.jpg', x: 1230, y: 820, r: 5, d: 7 },
];

export const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const mark = useEnter(2);
  const letters = 'Throve'.split('');
  const tag = useEnter(20);
  return (
    <AbsoluteFill>
      <Background theme="plum" />
      {FLOATERS.map((f, i) => {
        const p = useEnter(f.d);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: f.x,
              top: f.y + (1 - p) * 60 - frame * 0.6,
              width: 180,
              height: 225,
              borderRadius: 20,
              overflow: 'hidden',
              opacity: p * 0.55,
              transform: `rotate(${f.r}deg) scale(${0.9 + p * 0.1})`,
              boxShadow: '0 20px 50px rgba(10,2,8,.4)',
            }}
          >
            <Img src={hifi(f.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        );
      })}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Img
          src={image('throve-mark.png')}
          style={{ width: 150, height: 150, filter: 'brightness(0) invert(1)', opacity: mark, transform: `scale(${0.6 + mark * 0.4}) rotate(${(1 - mark) * -20}deg)` }}
        />
        <div style={{ display: 'flex', marginTop: 18, fontFamily: 'Playfair', fontWeight: 700, fontSize: 132, color: C.ivory, letterSpacing: '-0.01em' }}>
          {letters.map((l, i) => {
            const p = useEnter(8 + i * 2);
            return (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: 10 }}>
                <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)` }}>{l}</span>
              </span>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: 'Inter',
            fontSize: 34,
            color: 'rgba(255,247,240,.85)',
            marginTop: 8,
            opacity: tag,
            transform: `translateY(${interpolate(tag, [0, 1], [18, 0])}px)`,
          }}
        >
          Curated secondhand fashion.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
