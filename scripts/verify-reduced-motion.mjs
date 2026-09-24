/* global getComputedStyle, document, matchMedia */
import console from 'node:console';
import assert from 'node:assert/strict';
import process from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const testRoot = resolve(
  process.env.GUIDE_BROWSER_ROOT ?? '.local-tools/wsl-browser',
);
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(testRoot, 'browsers');
process.env.LD_LIBRARY_PATH ??= resolve(
  testRoot,
  'libs/usr/lib/x86_64-linux-gnu',
);
const { chromium } = await import(
  pathToFileURL(resolve(testRoot, 'node_modules/playwright/index.mjs')).href
);
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const animation = async (locator) =>
    locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        name: style.animationName,
        duration: style.animationDuration,
      };
    });
  const noAnimation = async (locator, surface) => {
    const actual = await animation(locator);
    assert.equal(actual.name, 'none', `${surface}: ${JSON.stringify(actual)}`);
    console.log(`${surface}: animation ${actual.name}`);
  };

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  assert.equal(
    await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
    true,
  );
  const browse = page.getByRole('button', { name: 'Browse chapters' });
  await browse.click();
  await noAnimation(
    page.locator('[data-scope="collapsible"][data-part="content"]'),
    'Mobile chapter navigation',
  );
  assert.equal(await browse.getAttribute('aria-expanded'), 'true');
  await browse.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('header button[aria-expanded]')
        ?.getAttribute('aria-expanded') === 'false',
  );

  await page.goto(`${baseUrl}/articles/gear-anatomy-and-stat-layers`, {
    waitUntil: 'networkidle',
  });
  const opener = page
    .locator('#figure-003')
    .getByRole('button', { name: 'View full-size image' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await noAnimation(
    page.locator('[data-scope="dialog"][data-part="backdrop"]'),
    'Image viewer backdrop',
  );
  await noAnimation(dialog, 'Image viewer content');
  assert.equal(await dialog.count(), 1);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(
    await opener.evaluate((element) => document.activeElement === element),
    true,
  );
  assert.deepEqual(errors, []);
  console.log('Escape dismissal and opener focus return: passed');
} finally {
  await browser.close();
}
