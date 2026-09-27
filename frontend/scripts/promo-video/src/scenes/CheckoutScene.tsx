import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Screens } from '../assets';
import { AppScreen } from '../components/AppScreen';
import { staggerCss } from '../components/Motion';
import { TapRipple } from '../components/TapRipple';
import { at } from '../timeline';
import { PhoneScene, type Cue } from './PhoneScene';

const T = { rows: at('checkout', 0.06), pay: at('checkout', 0.55) };
export const checkoutCues: Cue[] = [
  { sfx: 'whoosh', at: 0, volume: 0.25 },
  { sfx: 'tap', at: T.pay, volume: 0.4 },
  { sfx: 'success', at: T.pay + 6, volume: 0.38 },
];

const html = Screens.checkoutScreen('phone');

const PaidSheet: React.FC<{ at: number }> = ({ at: start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const sheet = spring({ frame: frame - start, fps, config: { damping: 20, mass: 0.8 } });
  const tick = spring({ frame: frame - start - 6, fps, config: { damping: 9 } });
  const text = spring({ frame: frame - start - 10, fps, config: { damping: 18 } });
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.ivory,
        transform: `translateY(${(1 - sheet) * 100}%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter',
        color: C.espresso,
        zIndex: 25,
      }}
    >
      <div style={{ width: 112, height: 112, borderRadius: 56, background: '#4F6B4C', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${tick})` }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <div style={{ opacity: text, transform: `translateY(${(1 - text) * 16}px)`, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Playfair', fontWeight: 600, fontSize: 30, marginTop: 26 }}>Payment successful</div>
        <div style={{ fontSize: 15, color: C.body, marginTop: 8 }}>₦25,600 paid · Order TH-2041</div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 22,
            background: '#F4F7F2',
            border: '1px solid #B9CDB4',
            color: '#3F5A3C',
            fontWeight: 600,
            fontSize: 14,
            padding: '10px 16px',
            borderRadius: 22,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F6B4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Protected by Buyer Protection
        </div>
      </div>
    </div>
  );
};

export const CheckoutScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <PhoneScene theme="ivory" side="right" title="Checkout with confidence" sub="Buyer Protection on every order, from payment to delivery.">
      <AppScreen html={html} kind="phone" width={390} height={844} css={staggerCss(frame, '.pad > *', 7, T.rows, 3, fps, 24)}>
        <TapRipple x={195} y={786} at={T.pay} />
        <PaidSheet at={T.pay + 5} />
      </AppScreen>
    </PhoneScene>
  );
};
