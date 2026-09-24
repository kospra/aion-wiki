/* global window, document, innerWidth, innerHeight, getComputedStyle, URL, history, dispatchEvent, PopStateEvent */
import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { staticPaths, categories, articles } from '../app/content/wiki.ts';
import { loadCompleteGuide } from './guide-data.ts';
import {
  walkBlocks,
  blockInlineSegments,
  inlineText,
} from '../app/content/reader.ts';

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
const output = resolve('.local-tools/qa/guide');
await mkdir(output, { recursive: true });
const guide = await loadCompleteGuide();
const result = {
  baseUrl,
  started: new Date().toISOString(),
  widths: [375, 1440],
  routes: [],
  interactions: [],
  screenshots: [],
  failures: [],
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (error) =>
  result.failures.push(`Page error: ${error.message}`),
);
page.on('console', (message) => {
  if (message.type() === 'error')
    result.failures.push(`Console: ${message.text()}`);
});
page.on('requestfailed', (request) => {
  if (request.failure()?.errorText !== 'net::ERR_ABORTED')
    result.failures.push(
      `Request: ${request.url()} ${request.failure()?.errorText}`,
    );
});
page.on('response', (response) => {
  if (response.status() >= 400)
    result.failures.push(`HTTP ${response.status()}: ${response.url()}`);
});
const record = (name) => result.interactions.push(name);
const screenshot = async (name) => {
  const path = `${output}/${name}.png`;
  await page.screenshot({ path });
  result.screenshots.push(path);
};
const visit = async (route) => {
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: 'networkidle',
  });
  assert.equal(response.status(), 200, route);
  await page.locator('main h1').waitFor();
  // Load every original on each direct visit, including interaction screenshots.
  await page.evaluate(async () => {
    await Promise.all(
      [...document.querySelectorAll('.guide-figure > img')].map((img) => {
        img.loading = 'eager';
        return img.decode();
      }),
    );
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
};
async function layout(route) {
  const issues = await page.evaluate(() => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      issues.push(
        `Page overflow ${document.documentElement.scrollWidth}/${innerWidth}`,
      );
    for (const element of document.querySelectorAll(
      'main button,main input,.site-header__toggle,dialog[open] button,dialog[open] a',
    )) {
      if (!element.checkVisibility({ checkVisibilityCSS: true })) continue;
      const rect = element.getBoundingClientRect();
      if (
        rect.width < 1 ||
        rect.height < 1 ||
        rect.left < -1 ||
        rect.right > innerWidth + 1
      )
        issues.push(`Clipped control: ${element.textContent || element.id}`);
      if (
        element.closest('dialog[open]') &&
        (rect.top < 0 || rect.bottom > innerHeight)
      )
        issues.push(`Unreachable dialog control: ${element.textContent}`);
    }
    for (const element of document.querySelectorAll(
      '.guide-content [id],.guide-figure figcaption,.guide-figure__legend,.guide-figure__screenshot-facts,.guide-figure > .guide-note',
    )) {
      if (
        !element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      )
        issues.push(`Hidden content: ${element.id || element.className}`);
      for (
        let parent = element;
        parent && parent !== document.body;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0
        )
          issues.push(`Hidden ancestor: ${element.id}`);
      }
    }
    return issues;
  });
  assert.deepEqual(issues, [], route);
}
async function viewer(figureId, width) {
  const figure = guide.figures.find((f) => f.id === figureId);
  const owner = guide.pages.find((p) =>
    walkBlocks(p.blocks).some(
      (b) => b.kind === 'figure' && b.figureId === figureId,
    ),
  );
  await visit(owner.category === null ? '/source' : `/articles/${owner.slug}`);
  const open = page
    .locator(`#${figureId}`)
    .getByRole('button', { name: 'View full-size image' });
  await open.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  for (const key of [
    'Tab',
    'Tab',
    'Tab',
    'Shift+Tab',
    'Shift+Tab',
    'Shift+Tab',
  ]) {
    await page.keyboard.press(key);
    assert.ok(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
      `Focus escaped viewer after ${key}`,
    );
  }
  await layout(`viewer ${figureId}`);
  const scroll = dialog.locator('.guide-image-viewer__content');
  const dimensions = await scroll.evaluate((el) => ({
    height: el.clientHeight,
    scrollHeight: el.scrollHeight,
  }));
  if (figure.height > 812) {
    assert.ok(
      dimensions.scrollHeight > dimensions.height,
      'Tall image must scroll',
    );
    await scroll.focus();
    await page.keyboard.press('PageDown');
    await page.waitForFunction(
      () =>
        document.querySelector('dialog[open] .guide-image-viewer__content')
          .scrollTop > 0,
    );
    assert.ok(await scroll.evaluate((el) => el.scrollTop > 0));
  }
  await screenshot(`viewer-${figureId}-${width}`);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(
    await open.evaluate((el) => el === document.activeElement),
    'Viewer did not return focus',
  );
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Close image' }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(await open.evaluate((el) => el === document.activeElement));
  record(
    `viewer keyboard, trap, Escape, close, scroll, focus return: ${figureId} at ${width}`,
  );
}
try {
  for (const width of result.widths) {
    await page.setViewportSize({ width, height: 812 });
    for (const route of staticPaths) {
      await visit(route);

      const sourcePage = guide.pages.find(
        (p) =>
          route === (p.category === null ? '/source' : `/articles/${p.slug}`),
      );
      if (sourcePage) {
        const expected = walkBlocks(sourcePage.blocks).flatMap((block) => {
          const fields = blockInlineSegments(block)
            .map(inlineText)
            .filter((text) => text.trim());
          if (block.kind === 'figure') {
            const figure = guide.figures.find((f) => f.id === block.figureId);
            fields.push(
              figure.caption,
              ...figure.screenshotOnly,
              ...figure.uncertainties,
              ...figure.mappings
                .flatMap((m) => [
                  m.label,
                  m.meaning,
                  m.color ?? '',
                  m.visualValue ?? '',
                ])
                .filter(Boolean),
            );
          }
          return fields.map((text) => ({ id: block.id, text }));
        });
        const missing = await page.evaluate((expected) => {
          const normalize = (text) => text.replace(/\s+/gu, ' ').trim();
          return expected.filter(
            ({ id, text }) =>
              !normalize(document.getElementById(id).innerText).includes(
                normalize(text),
              ),
          );
        }, expected);
        assert.deepEqual(
          missing,
          [],
          `${route}: source fields must remain visible with production CSS`,
        );
      }
      await layout(route);
      result.routes.push({
        width,
        route,
        heading: await page.locator('main h1').innerText(),
      });
      if (['/', '/source', '/articles/class-passives'].includes(route))
        await screenshot(
          `${route === '/' ? 'home' : route.split('/').at(-1)}-${width}`,
        );
    }
    record(
      `57 direct routes, all figure loads, source visibility, overflow and control bounds at ${width}`,
    );
    await visit('/');
    if (width === 375) {
      const toggle = page.getByRole('button', { name: /^Chapters/ });
      await toggle.focus();
      for (const key of ['Enter', 'Space']) {
        await page.keyboard.press(key);
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(
          await page.locator('#chapter-navigation a:visible').count(),
          13,
        );
        await layout('mobile chapters open');
        await screenshot(`chapters-${key}-${width}`);
        await page.keyboard.press(key);
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(
          await page.locator('#chapter-navigation a:visible').count(),
          0,
        );
      }
      await toggle.click();
    }
    await page
      .locator('#chapter-navigation')
      .getByRole('link', { name: /01 Gear/ })
      .click();
    await page
      .getByRole('heading', { level: 1, name: categories[0].title })
      .waitFor();
    if (width === 375)
      assert.equal(
        await page
          .getByRole('button', { name: /^Chapters/ })
          .getAttribute('aria-expanded'),
        'false',
      );
    await page
      .getByRole('link', { name: /Gear anatomy and stat layers/ })
      .first()
      .click();
    await page
      .getByRole('heading', { level: 1, name: 'Gear anatomy and stat layers' })
      .waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await page.locator('main h1').innerText(), /Gear anatomy/);
    await screenshot(`gear-${width}`);
    const explanation = page.locator('.guide-figure__references a').first();
    const destination = await explanation.getAttribute('href');
    await explanation.click();
    await page.waitForURL(`${baseUrl}${destination}`);
    assert.ok(
      await page
        .locator(
          `[id="${decodeURIComponent(new URL(page.url()).hash.slice(1))}"]`,
        )
        .isVisible(),
    );
    record(
      `chapter → article → source explanation; direct article refresh at ${width}`,
    );
    await visit('/');
    const search = page.getByRole('searchbox', { name: 'Search articles' });
    for (const term of ['Soul Binding', 'Cogni Lv.10(MAX)']) {
      await search.fill(term);
      const expected = articles.filter((a) =>
        a.searchText.toLocaleLowerCase().includes(term.toLocaleLowerCase()),
      );
      await page.waitForFunction(
        (count) => document.querySelectorAll('.article-card').length === count,
        expected.length,
      );
      assert.ok(expected.length > 0);
      for (const entry of expected)
        assert.ok(
          await page
            .locator(`.article-card a[href="/articles/${entry.slug}"]`)
            .isVisible(),
        );
    }
    await page.getByRole('button', { name: 'Wings', exact: true }).click();
    await page.getByRole('heading', { name: 'No articles found' }).waitFor();
    await page.getByRole('button', { name: 'Reset filters' }).click();
    assert.equal(await search.inputValue(), '');
    assert.equal(await page.locator('.article-card').count(), 43);
    await search.fill('no-such-captured-phrase-908172');
    await page.getByRole('button', { name: 'Reset filters' }).click();
    assert.equal(
      await page
        .getByRole('button', { name: 'All topics', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    record(
      `body/figure full-text search, combined category filter, empty/reset at ${width}`,
    );
    for (const [slug, selector] of [
      ['gear-transfer-and-material-costs', '#block-0496'],
      ['global-genus-stat-priorities', '.guide-table-scroll'],
      ['wing-stat-catalog', '#block-0912'],
      ['theostones', '.guide-table-scroll'],
      ['offensive-stat-values-and-attack-comparisons', '#block-1021'],
      ['damage-tolerance-endurance-and-combat-speed', '#block-1152'],
    ]) {
      const owner =
        guide.pages.find(
          (p) =>
            p.slug === slug &&
            walkBlocks(p.blocks).some((b) =>
              selector.startsWith('#')
                ? b.id === selector.slice(1)
                : b.kind === 'table',
            ),
        ) ??
        guide.pages.find((p) =>
          walkBlocks(p.blocks).some((b) => b.id === selector.slice(1)),
        );
      assert.ok(owner, selector);
      await visit(`/articles/${owner.slug}`);
      const target = page.locator(selector).first();
      await target.scrollIntoViewIfNeeded();
      await layout(owner.slug);
      if (selector === '.guide-table-scroll') {
        await target.focus();
        const maxScroll = await target.evaluate(
          (el) => el.scrollWidth - el.clientWidth,
        );
        if (maxScroll > 0) {
          await page.keyboard.press('ArrowRight');
          await page.waitForFunction(
            () => document.activeElement.scrollLeft > 0,
          );
          assert.ok(await target.evaluate((el) => el.scrollLeft > 0));
        }
      }
      await target.evaluate((el) => {
        el.scrollLeft = 0;
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      await screenshot(`${owner.slug}-${width}`);
    }
    record(
      `transfer sequence, Genus, Wings highlight, combat table and rich formulas at ${width}`,
    );
    await viewer('figure-003', width);
    const tall = guide.figures
      .filter((f) => f.height > 812)
      .sort((a, b) => b.height - a.height)[0];
    await viewer(tall.id, width);
    await visit('/');
    // Exercise the application's history listener; ordinary static hosts own
    // direct unknown URLs, so no host-specific fallback is invented here.
    await page.evaluate(() => {
      history.pushState({}, '', '/articles/missing-guide-page');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.getByRole('heading', { name: /Page not found/i }).waitFor();
    await screenshot(`missing-page-${width}`);
    await page.getByRole('link', { name: /Return to the homepage/i }).click();
    await page.locator('#article-search').waitFor();
    record(`client missing-page recovery at ${width}`);
  }
  // Direct unknown requests intentionally return the static server's 404.
  const unknown = await page.request.get(
    `${baseUrl}/articles/missing-guide-page`,
  );
  assert.equal(unknown.status(), 404);
  record('Direct unknown URL returns documented server 404');
  assert.deepEqual(result.failures, []);
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failures.push(error.stack ?? String(error));
  await screenshot('failure');
  process.exitCode = 1;
} finally {
  result.finished = new Date().toISOString();
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        passed: result.passed,
        routeChecks: result.routes.length,
        interactions: result.interactions,
        failures: result.failures,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
