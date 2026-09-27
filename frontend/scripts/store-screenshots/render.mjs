// Renders Play Store screenshots (phone, 7" tablet, 10" tablet) from HTML mockups of the app.
// Usage: npm install && npm run render   (needs Google Chrome installed)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { configureAssets, C, SCREENS, appCss, fontFaceCss } from './screens.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '../..');
const ROOT = path.resolve(FRONTEND, '..');
const OUT = path.join(FRONTEND, 'assets/store/screenshots');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';


configureAssets({
  img: (name) => pathToFileURL(path.join(FRONTEND, 'assets/hifi', name)).href,
  asset: (rel) => pathToFileURL(path.join(FRONTEND, rel)).href,
  font: (pkg, file) => pathToFileURL(path.join(ROOT, 'node_modules/@expo-google-fonts', pkg, file)).href,
});
const asset = (rel) => pathToFileURL(path.join(FRONTEND, rel)).href;

// Canvas sizes are CSS px; output = size x dpr. Play Store: ratio <= 2:1, sides 320-3840.
const DEVICES = {
  phone: { dir: 'phone', w: 540, h: 960, dpr: 2, kind: 'phone', screenW: 390, deviceW: 414, top: 222, headline: 33, sub: 15 },
  tablet7: { dir: 'tablet-7in', w: 600, h: 960, dpr: 2, kind: 't7', screenW: 520, deviceW: 500, top: 222, headline: 34, sub: 15.5 },
  tablet10: { dir: 'tablet-10in', w: 800, h: 1280, dpr: 2, kind: 't10', screenW: 700, deviceW: 680, top: 290, headline: 46, sub: 19 },
};

function css(d) {
  const scale = scaleOf(d);
  return `
${fontFaceCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${d.w}px;height:${d.h}px;overflow:hidden}
body{font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased}
.canvas{position:relative;width:100%;height:100%;overflow:hidden}
.canvas.ivory{background:radial-gradient(120% 70% at 50% 0%,#FFFCF8 0%,${C.ivory} 55%,#F6E9DF 100%)}
.canvas.plum{background:radial-gradient(120% 70% at 50% 0%,#74305C 0%,${C.plum} 55%,#43152F 100%)}
.blob{position:absolute;border-radius:50%;filter:blur(2px)}
.ivory .blob{background:rgba(216,138,161,.14)}
.plum .blob{background:rgba(216,138,161,.16)}
.copy{position:absolute;left:0;right:0;top:${Math.round(d.top * 0.2)}px;text-align:center;padding:0 ${Math.round(d.w * 0.08)}px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-weight:600;letter-spacing:.14em;font-size:${Math.round(d.sub * 0.72)}px;text-transform:uppercase;margin-bottom:${Math.round(d.sub * 0.9)}px}
.eyebrow img{width:${Math.round(d.sub * 1.25)}px;height:${Math.round(d.sub * 1.25)}px;border-radius:5px}
.ivory .eyebrow{color:${C.plum}} .plum .eyebrow{color:#F3C9D6} .plum .eyebrow img{filter:brightness(0) invert(1)}
.headline{font-family:Playfair;font-weight:600;font-size:${d.headline}px;line-height:1.12;letter-spacing:-.01em}
.ivory .headline{color:${C.espresso}} .plum .headline{color:#FFF7F0}
.sub{margin-top:${Math.round(d.sub * 0.8)}px;font-size:${d.sub}px;line-height:1.45}
.ivory .sub{color:${C.body}} .plum .sub{color:rgba(255,247,240,.82)}
.device{position:absolute;left:50%;top:${d.top}px;width:${d.deviceW}px;transform:translateX(-50%);
  background:#1A1416;border-radius:${d.kind === 'phone' ? 52 : 38}px;padding:${bezel(d)}px;
  box-shadow:0 40px 80px rgba(43,33,31,.28),0 12px 24px rgba(43,33,31,.18),inset 0 0 0 1.5px #3a2f32}
.plum .device{box-shadow:0 40px 90px rgba(10,2,8,.5),0 12px 24px rgba(10,2,8,.3),inset 0 0 0 1.5px #3a2f32}
.screen-clip{width:${d.screenW * scale}px;height:${d.screenH * scale}px;border-radius:${d.kind === 'phone' ? 42 : 26}px;overflow:hidden;position:relative;background:${C.ivory}}
.screen{position:absolute;left:0;top:0;width:${d.screenW}px;height:${d.screenH}px;transform:scale(${scale});transform-origin:0 0;background:${C.ivory};color:${C.espresso};overflow:hidden}
${d.kind === 'phone' ? `.screen-clip:after{content:'';position:absolute;top:11px;left:50%;width:30px;height:30px;margin-left:-15px;border-radius:50%;background:#0d0a0b;z-index:5;transform:scale(${scale})}` : `.screen-clip:after{content:'';position:absolute;top:8px;left:50%;width:9px;height:9px;margin-left:-4.5px;border-radius:50%;background:#0d0a0b;z-index:5}`}
${appCss(d)}
`;
}

const bezel = (d) => (d.kind === 'phone' ? 11 : 14);
// The device bleeds off the bottom edge; bottom-anchored UI is lifted by the hidden amount.
const BLEED = 34;
const scaleOf = (d) => (d.deviceW - 2 * bezel(d)) / d.screenW;
for (const d of Object.values(DEVICES)) {
  d.screenH = Math.round((d.h - d.top - bezel(d) + BLEED) / scaleOf(d));
  d.hidden = Math.round(BLEED / scaleOf(d));
}


function page(d, s) {
  const blobs = d.kind === 'phone'
    ? `<div class="blob" style="width:320px;height:320px;left:-120px;top:${d.top + 120}px"></div><div class="blob" style="width:260px;height:260px;right:-110px;top:${d.top - 40}px"></div>`
    : `<div class="blob" style="width:${d.w * 0.6}px;height:${d.w * 0.6}px;left:-${d.w * 0.22}px;top:${d.top + 160}px"></div><div class="blob" style="width:${d.w * 0.5}px;height:${d.w * 0.5}px;right:-${d.w * 0.2}px;top:${d.top - 60}px"></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(d)}</style></head><body>
  <div class="canvas ${s.bg}">
    ${blobs}
    <div class="copy">
      <div class="eyebrow"><img src="${asset('assets/images/throve-mark.png')}"/>Throve</div>
      <div class="headline">${s.headline}</div>
      <div class="sub">${s.sub}</div>
    </div>
    <div class="device"><div class="screen-clip"><div class="screen"${s.dark ? ` style="background:${C.liveDark}"` : ''}>${s.render(d.kind)}</div></div></div>
  </div></body></html>`;
}

const only = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
try {
  const tmp = path.join(HERE, '.tmp');
  fs.mkdirSync(tmp, { recursive: true });
  for (const [key, d] of Object.entries(DEVICES)) {
    if (only.length && !only.includes(key)) continue;
    const dir = path.join(OUT, d.dir);
    fs.mkdirSync(dir, { recursive: true });
    const tab = await browser.newPage();
    await tab.setViewport({ width: d.w, height: d.h, deviceScaleFactor: d.dpr });
    for (const s of SCREENS) {
      const file = path.join(tmp, `${key}-${s.id}.html`);
      fs.writeFileSync(file, page(d, s));
      await tab.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
      await tab.evaluate(() => document.fonts.ready);
      const out = path.join(dir, `${s.id}.png`);
      await tab.screenshot({ path: out, type: 'png', omitBackground: false });
      console.log(`${d.dir}/${s.id}.png  ${d.w * d.dpr}x${d.h * d.dpr}`);
    }
    await tab.close();
  }
  fs.rmSync(tmp, { recursive: true, force: true });
} finally {
  await browser.close();
}
