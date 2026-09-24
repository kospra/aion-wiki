/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadChromium } from './browser-runtime.mjs';
const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true });
const output = resolve('.local-tools/qa/editorial');
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
try {
  for (const width of [320, 375, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [name, route] of [
      ['home', '/'],
      ['gear', '/articles/gear-anatomy-and-stat-layers'],
      ['table', '/articles/theostones'],
      ['priorities', '/articles/global-genus-stat-priorities'],
    ]) {
      const response = await page.goto(baseUrl + route, {
        waitUntil: 'networkidle',
      });
      assert.equal(response.status(), 200, route);
      assert.equal(
        await page
          .locator('html')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        'rgb(250, 249, 246)',
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} at ${width}: overflow`,
      );
      if (name === 'priorities') {
        const fits = await page
          .locator('table')
          .evaluate(
            (el) =>
              el.getBoundingClientRect().width <=
              el.parentElement.getBoundingClientRect().width,
          );
        assert.ok(
          fits,
          `${width}: two-column priorities must fit without caption-induced scrolling`,
        );
      }
      if (name === 'home') {
        const search = await page.getByRole('searchbox').boundingBox();
        assert.ok(
          search && search.y < 700,
          `${width}: search should be reachable in first screen`,
        );
      } else {
        const prose = page
          .locator('[data-guide-content] p:not(table p)')
          .first();
        if (await prose.count()) {
          const style = await prose.evaluate((el) => ({
            size: parseFloat(getComputedStyle(el).fontSize),
            leading: parseFloat(getComputedStyle(el).lineHeight),
            width: el.getBoundingClientRect().width,
          }));
          assert.ok(style.size >= 17, `${route}: body text size`);
          assert.ok(
            style.leading / style.size >= 1.6,
            `${route}: body leading`,
          );
          assert.ok(style.width <= 760, `${route}: comfortable prose measure`);
        }
      }
      await page.screenshot({
        path: resolve(output, `${name}-${width}.png`),
        animations: 'disabled',
      });
      results.push({ name, width, passed: true });
    }
    await page.close();
  }
  const accessible = await browser.newPage({
    viewport: { width: 320, height: 900 },
    reducedMotion: 'reduce',
  });
  for (const route of [
    '/',
    '/articles/gear-anatomy-and-stat-layers',
    '/articles/wing-stat-catalog',
  ]) {
    await accessible.goto(baseUrl + route, { waitUntil: 'networkidle' });
    // WCAG text-spacing override test: content must remain visible and operable.
    await accessible.addStyleTag({
      content:
        '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }',
    });
    assert.ok(
      await accessible.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${route}: text-spacing overflow`,
    );
    assert.ok(await accessible.locator('main h1').isVisible());
    results.push({ route, width: 320, textSpacing: true });
  }
  await accessible.close();
  const largeText = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  for (const route of ['/', '/articles/gear-anatomy-and-stat-layers']) {
    await largeText.goto(baseUrl + route, { waitUntil: 'networkidle' });
    await largeText.addStyleTag({
      content: 'html { font-size: 200% !important; }',
    });
    assert.ok(
      await largeText.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${route}: 200% text enlargement overflow`,
    );
    assert.ok(await largeText.locator('main h1').isVisible());
    results.push({ route, textEnlargement: '200%' });
  }
  await largeText.close();
  const staticPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
  });
  await staticPage.goto(baseUrl + '/articles/gear-anatomy-and-stat-layers');
  assert.equal(
    await staticPage
      .locator('html')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgb(250, 249, 246)',
  );
  assert.ok(await staticPage.locator('main h1').isVisible());
  await staticPage.close();
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
  console.log(
    `Editorial design: ${results.length} layout/readability checks and styled no-JS rendering passed.`,
  );
} finally {
  await browser.close();
}
