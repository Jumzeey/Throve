import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import { C, hifi, image } from '../assets';
import { Background } from '../components/Background';
import { KenBurns, useEnter } from '../components/Motion';
import { at, SCENES } from '../timeline';
import type { Cue } from './PhoneScene';

const DURATION = SCENES.find((s) => s.id === 'end')!.duration;
const T = { badge: at('end', 0.22) };
export const endCues: Cue[] = [{ sfx: 'chime', at: T.badge, volume: 0.3 }];

const STRIP = ['womens-midi-dress.jpg', 'mens-jacket.jpg', 'brown-shoulder-bag.jpg', 'black-heels.jpg', 'womens-top.jpg', 'watch.jpg', 'fashion-scarf.jpg', 'white-trainers.jpg'];

export const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const mark = useEnter(0);
  const word = useEnter(4);
  const tag = useEnter(10);
  const badge = useEnter(T.badge);
  const strip = useEnter(2);
  return (
    <AbsoluteFill>
      <Background theme="ivory" />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 60, display: 'flex', gap: 22, justifyContent: 'center', transform: `translateX(${-frame * 0.8}px) translateY(${(1 - strip) * 80}px)`, opacity: strip }}>
        {[...STRIP, ...STRIP.slice(0, 6)].map((src, i) => (
          <KenBurns key={i} src={hifi(src)} duration={DURATION} from={1.08} to={1} style={{ width: 170, height: 210, borderRadius: 18, flex: 'none', boxShadow: '0 16px 40px rgba(43,33,31,.18)' }} />
        ))}
      </div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 200 }}>
        <Img src={image('throve-mark.png')} style={{ width: 110, height: 110, opacity: mark, transform: `scale(${0.7 + mark * 0.3})` }} />
        <div style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 112, color: C.plum, marginTop: 8, opacity: word, transform: `translateY(${(1 - word) * 30}px)` }}>Throve</div>
        <div style={{ fontFamily: 'Inter', fontSize: 34, color: C.body, marginTop: 4, opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>
          Shop and sell pre-loved fashion
        </div>
        <Img src={image('google-play-badge.png')} style={{ width: 330, marginTop: 34, opacity: badge, transform: `scale(${0.85 + badge * 0.15})` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
