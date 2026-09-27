import React from 'react';
import { Composition } from 'remotion';
import { Promo } from './Promo';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './timeline';

export const Root: React.FC = () => (
  <Composition id="ThrovePromo" component={Promo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
