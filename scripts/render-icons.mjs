// Rasterizes public/favicon.svg into the favicon.ico Google Search reads, the
// iOS touch icon and the web manifest icons named in app/seo.ts. Run it by hand
// after `npx playwright install chromium`, and again whenever the SVG changes:
//   node scripts/render-icons.mjs
// Builds never run it; the images are committed.
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { siteIcons } from '../app/seo.ts';

const svg = await readFile('public/favicon.svg');
const source = `data:image/svg+xml;base64,${svg.toString('base64')}`;

const browser = await chromium.launch();
async function render(size, { opaque = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<body style="margin:0;background:${opaque ? '#000' : 'transparent'}"><img src="${source}" width="${size}" height="${size}" style="display:block"></body>`,
  );
  const png = await page.screenshot({ type: 'png', omitBackground: !opaque });
  await page.close();
  return png;
}

// An ICO file whose entries are PNGs: a 6-byte header, a 16-byte directory
// entry per size, then the images.
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

try {
  const outputs = new Map();
  const icoImages = [];
  for (const size of [16, 32, 48])
    icoImages.push({ size, png: await render(size) });
  outputs.set('public/favicon.ico', ico(icoImages));
  // iOS masks the touch icon itself, so it gets square, opaque corners.
  outputs.set(
    'public/apple-touch-icon.png',
    await render(180, { opaque: true }),
  );
  for (const { src, sizes } of siteIcons.manifest)
    outputs.set(`public${src}`, await render(Number.parseInt(sizes, 10)));
  for (const [path, data] of outputs) {
    await writeFile(path, data);
    console.log(`Wrote ${path} (${data.length} bytes)`);
  }
} finally {
  await browser.close();
}
