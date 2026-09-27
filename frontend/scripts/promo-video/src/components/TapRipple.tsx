import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

/** Fingertip that approaches, presses at `at`, and leaves a ripple. Logical screen coordinates. */
export const TapRipple: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const f = useCurrentFrame() - at;
  if (f < -10 || f > 22) return null;
  const tipOpacity = interpolate(f, [-10, -4, 6, 14], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tipScale = interpolate(f, [-10, -2, 0, 3, 8], [1.35, 1.05, 0.82, 0.82, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ring = interpolate(f, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      {f >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 40,
            top: y - 40,
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,.9)',
            boxShadow: '0 0 0 2px rgba(90,31,69,.35)',
            transform: `scale(${0.3 + ring})`,
            opacity: 1 - ring,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: x - 22,
          top: y - 22,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(43,33,31,.28)',
          border: '2.5px solid rgba(255,255,255,.95)',
          boxShadow: '0 6px 16px rgba(0,0,0,.25)',
          opacity: tipOpacity,
          transform: `scale(${tipScale})`,
        }}
      />
    </>
  );
};
