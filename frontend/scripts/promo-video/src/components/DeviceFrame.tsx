import React from 'react';
import type { Theme } from './Background';

export type DeviceKind = 'phone' | 'tablet';

export const DEVICE = {
  phone: { screenW: 390, screenH: 844, bezel: 11, radius: 52, clipRadius: 42 },
  tablet: { screenW: 700, screenH: 1120, bezel: 14, radius: 38, clipRadius: 26 },
} as const;

export const deviceSize = (kind: DeviceKind, scale: number) => {
  const d = DEVICE[kind];
  return { width: d.screenW * scale + d.bezel * 2, height: d.screenH * scale + d.bezel * 2 };
};

/** Device bezel that renders `children` at logical screen size, scaled into the frame. */
export const DeviceFrame: React.FC<{
  kind: DeviceKind;
  scale: number;
  theme: Theme;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ kind, scale, theme, style, children }) => {
  const d = DEVICE[kind];
  const shadow =
    theme === 'plum'
      ? '0 50px 110px rgba(10,2,8,.55), 0 14px 30px rgba(10,2,8,.3), inset 0 0 0 1.5px #3a2f32'
      : '0 50px 100px rgba(43,33,31,.28), 0 14px 30px rgba(43,33,31,.18), inset 0 0 0 1.5px #3a2f32';
  return (
    <div style={{ position: 'absolute', background: '#1A1416', borderRadius: d.radius, padding: d.bezel, boxShadow: shadow, ...style }}>
      <div style={{ width: d.screenW * scale, height: d.screenH * scale, borderRadius: d.clipRadius, overflow: 'hidden', position: 'relative', background: '#FFF7F0' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: d.screenW, height: d.screenH, transform: `scale(${scale})`, transformOrigin: '0 0' }}>{children}</div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: kind === 'phone' ? 11 * scale : 8,
            width: (kind === 'phone' ? 30 : 9) * scale,
            height: (kind === 'phone' ? 30 : 9) * scale,
            marginLeft: -((kind === 'phone' ? 30 : 9) * scale) / 2,
            borderRadius: '50%',
            background: '#0d0a0b',
            zIndex: 20,
          }}
        />
      </div>
    </div>
  );
};
