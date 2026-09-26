/* global document, URL */
// Renders the link-preview card (og:image) from the site's own copy, DESIGN.md
// colors, and the domain and size in app/seo.ts. Run it by hand after
// `npx playwright install chromium`, and again whenever any of those change:
//   node scripts/render-share-card.mjs
// Builds never run it; the PNG is committed.
import assert from 'node:assert/strict';
import console from 'node:console';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { shareCard, siteOrigin } from '../app/seo.ts';

const output = `public${shareCard.path}`;
const domain = new URL(siteOrigin).host;
const require = createRequire(import.meta.url);
const font = await readFile(
  require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'Inter Variable';
        font-weight: 100 900;
        src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');
      }
      * { box-sizing: border-box; margin: 0; }
      body {
        width: ${shareCard.width}px;
        height: ${shareCard.height}px;
        padding: 80px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #000000;
        color: #fafafa;
        font-family: 'Inter Variable', sans-serif;
      }
      .wordmark { font-size: 32px; font-weight: 600; }
      .eyebrow { color: #5eead4; font-size: 22px; font-weight: 600; letter-spacing: 0.12em; }
      h1 { margin: 12px 0 20px; font-size: 104px; font-weight: 600; line-height: 1.05; letter-spacing: -0.02em; }
      .lede { color: #a1a1aa; font-size: 34px; }
      .domain { color: #5eead4; font-size: 28px; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="wordmark">AION 2 / WIKI</div>
    <div>
      <div class="eyebrow">THE AION 2 COMMUNITY WIKI</div>
      <h1>Aion 2, explained.</h1>
      <div class="lede">Equipment, progression and combat.</div>
    </div>
    <div class="domain">${domain}</div>
  </body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: shareCard.width, height: shareCard.height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  const interLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (face) =>
        face.family.replace(/["']/g, '') === 'Inter Variable' &&
        face.status === 'loaded',
    );
  });
  assert.ok(interLoaded, 'Inter Variable did not load');
  await page.screenshot({ path: output, type: 'png' });
} finally {
  await browser.close();
}
const { size } = await stat(output);
assert.ok(
  size < 200 * 1024,
  `${output} is ${size} bytes; keep it under 200 KB`,
);
console.log(`Wrote ${output} (${size} bytes)`);
