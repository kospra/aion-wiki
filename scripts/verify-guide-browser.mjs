/* global document, innerWidth */
import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const errors = [];
let page;

async function visit(route, status = 200) {
  const response = await page.goto(baseUrl + route);
  assert.equal(response.status(), status, route);
  await page.locator('main h1').waitFor({ state: 'visible' });
  await page.locator('main img').evaluateAll(async (images) => {
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.map((image) => image.decode()));
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `${route}: horizontal page overflow`,
  );
}

try {
  for (const width of [375, 1440]) {
    page = await browser.newPage({ viewport: { width, height: 812 } });
    page.on('pageerror', (error) => errors.push(error.message));
    await visit('/');
    const search = page.getByRole('searchbox', { name: 'Search articles' });
    await search.fill('zzzz-unmatched');
    await page.getByText('No articles found').waitFor();
    await page.getByRole('button', { name: 'Reset filters' }).click();
    assert.equal(await search.inputValue(), '');
    assert.ok(await page.locator('main a[href^="/articles/"]').count());

    assert.equal(
      await page.locator('header a[href^="/categories/"]').count(),
      0,
    );
    const sourceLink = page
      .locator('header')
      .getByRole('link', { name: 'About the source' });
    await sourceLink.click();
    await page.waitForURL(baseUrl + '/source');
    await page
      .locator('header')
      .getByRole('link', { name: 'Aion 2 Wiki' })
      .click();
    await page.waitForURL(baseUrl + '/');
    await page.getByRole('searchbox', { name: 'Search articles' }).waitFor();
    const article = page.locator('main a[href^="/articles/"]').first();
    const destination = await article.getAttribute('href');
    await article.click();
    await page.waitForURL(baseUrl + destination);
    await page.locator('main h1').waitFor({ state: 'visible' });
    // All-route content and assets are checked by verify:static.
    for (const route of [
      '/articles/gear-anatomy-and-stat-layers',
      '/articles/theostones',
      '/articles/class-passives',
      '/source',
    ])
      await visit(route);
    await visit('/missing-browser-smoke-page', 404);
    await page.getByRole('link', { name: 'Return to the homepage' }).click();
    await page.waitForURL(baseUrl + '/');
    await page.close();
  }

  page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  await visit('/articles/gear-anatomy-and-stat-layers');
  assert.ok(await page.locator('main p').count());
  assert.deepEqual(errors, []);
  console.log(
    'Browser smoke passed: navigation, search reset, article layouts, 404 and no-JS reading.',
  );
} catch (error) {
  await mkdir('.local-tools/qa/guide', { recursive: true });
  if (page && !page.isClosed()) {
    await page
      .screenshot({ path: '.local-tools/qa/guide/failure.png' })
      .catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
