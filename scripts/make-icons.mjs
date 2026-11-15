// Erzeugt die App-Icons in public/icons (Sprechblase mit „š“ – dem ersten Laut von „šlomo“).
//
//   node scripts/make-icons.mjs
//
// Braucht Playwright mit Chromium und die Schrift Inter; in Claude Code ist beides vorinstalliert.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

// `scale` verkleinert die Sprechblase: bei „maskable“-Icons darf das Handy rundum
// bis zu 20 % abschneiden. `radius` rundet die Ecken (0 = das Handy rundet selbst).
const svg = (size, scale, radius) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <clipPath id="form"><rect width="512" height="512" rx="${radius}"/></clipPath>
  <rect width="512" height="512" rx="${radius}" fill="#4B3FD6"/>
  <circle cx="470" cy="30" r="150" fill="#FFB224" clip-path="url(#form)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M132 112h248a56 56 0 0 1 56 56v150a56 56 0 0 1-56 56H238l-78 62a8 8 0 0 1-13-6v-56h-15a56 56 0 0 1-56-56V168a56 56 0 0 1 56-56z" fill="#fff"/>
    <text x="256" y="322" text-anchor="middle" font-family="Inter" font-weight="800" font-size="236" fill="#4B3FD6">š</text>
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale, radius] of [
  ['icon-512.png', 512, 1, 112],
  ['icon-192.png', 192, 1, 112],
  ['apple-touch-icon.png', 180, 0.92, 0],
  ['maskable-512.png', 512, 0.74, 0],
  ['favicon-64.png', 64, 1, 112],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(size, scale, radius)}</body>`);
  await page.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname, omitBackground: true });
}
await browser.close();
