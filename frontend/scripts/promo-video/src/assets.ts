import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import * as Screens from '../../store-screenshots/screens.mjs';

Screens.configureAssets({
  img: (name: string) => staticFile(`hifi/${name}`),
  asset: (rel: string) => staticFile(`images/${rel.split('/').pop()}`),
  font: (pkg: string, file: string) => staticFile(`fonts/${pkg}/${file}`),
});

export { Screens };
export const C = Screens.C as Record<string, string>;
export const hifi = (name: string) => staticFile(`hifi/${name}`);
export const image = (name: string) => staticFile(`images/${name}`);

const FONT_WEIGHTS = ['600 16px Playfair', '700 16px Playfair', '400 16px Inter', '500 16px Inter', '600 16px Inter', '700 16px Inter'];

function screenImageUrls(): string[] {
  const builders = ['homeScreen', 'liveTabScreen', 'liveRoomScreen', 'productScreen', 'offerScreen', 'checkoutScreen', 'sellScreen', 'sellerScreen'];
  const html = builders.flatMap((b) => ['phone', 't10'].map((k) => (Screens as any)[b](k) as string)).join('');
  const urls = new Set<string>();
  for (const m of html.matchAll(/url\('([^']+)'\)|src="([^"]+)"/g)) urls.add(m[1] ?? m[2]);
  return [...urls];
}

/** Holds the render until fonts and every image referenced by the HTML mockups have loaded. */
export function useAssetsReady() {
  const [handle] = useState(() => delayRender('Loading fonts and images'));
  useEffect(() => {
    const images = screenImageUrls().map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = src;
        }),
    );
    const fonts = FONT_WEIGHTS.map((f) => document.fonts.load(f).then(() => undefined));
    Promise.all([...images, ...fonts]).then(() => continueRender(handle));
  }, [handle]);
}
