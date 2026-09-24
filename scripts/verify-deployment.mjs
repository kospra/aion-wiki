/* global fetch, AbortSignal */
import console from 'node:console';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { JSDOM } from 'jsdom';

const catalogue = JSON.parse(
  await readFile(
    new URL('../app/content/catalogue.json', import.meta.url),
    'utf8',
  ),
);
const figures = JSON.parse(
  await readFile(
    new URL('../app/content/figures/group-a.json', import.meta.url),
    'utf8',
  ),
);
const source = JSON.parse(
  await readFile(
    new URL('../app/content/source-overview.json', import.meta.url),
    'utf8',
  ),
);

function parseBaseUrl(value) {
  if (typeof value !== 'string')
    throw new Error('Expected one HTTP(S) base URL');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Expected a valid HTTP(S) base URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Expected one HTTP(S) root base URL without credentials, query, or fragment',
    );
  }
  return url;
}

async function request(base, path, expectedStatus) {
  const url = new URL(path, base);
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new Error(`${path}: request timed out after 10 seconds`, {
        cause: error,
      });
    }
    throw new Error(`${path}: request failed: ${error.message}`, {
      cause: error,
    });
  }
  if (response.status !== expectedStatus) {
    await response.body?.cancel();
    throw new Error(
      `${path}: expected HTTP ${expectedStatus}, got ${response.status}`,
    );
  }
  return response;
}

async function htmlText(base, path, status = 200) {
  const response = await request(base, path, status);
  const type = response.headers.get('content-type') ?? '';
  if (!/^text\/html(?:\s*;|$)/i.test(type)) {
    await response.body?.cancel();
    throw new Error(
      `${path}: expected HTML content-type, got ${type || 'none'}`,
    );
  }
  const dom = new JSDOM(await response.text());
  const document = dom.window.document;
  for (const element of document.querySelectorAll(
    'script, style, template, [hidden], [aria-hidden="true"]',
  )) {
    element.remove();
  }
  return {
    text: document.body?.textContent?.replace(/\s+/gu, ' ').trim() ?? '',
    document,
  };
}

async function assertPage(base, path, identifyingText) {
  const { text } = await htmlText(base, path);
  for (const phrase of identifyingText) {
    if (!text.includes(phrase))
      throw new Error(
        `${path}: missing expected article/page text ${JSON.stringify(phrase)}`,
      );
  }
}

export async function checkDeployment(baseUrl) {
  const base = parseBaseUrl(baseUrl);
  const category =
    catalogue.categories.find(
      (item) => item.slug === 'gear-and-basics-explained',
    ) ?? catalogue.categories[0];
  const article = catalogue.articles.find(
    (item) => item.slug === 'gear-anatomy-and-stat-layers',
  );
  if (!category || !article || !figures[0]?.src)
    throw new Error('Missing source catalogue or figure contract');

  await assertPage(base, '/', ['Aion 2 Wiki']);
  for (const path of [
    `/categories/${category.slug}`,
    `/categories/${category.slug}/`,
  ]) {
    await assertPage(base, path, [category.title, category.description]);
  }
  for (const path of [
    `/articles/${article.slug}`,
    `/articles/${article.slug}/`,
  ]) {
    await assertPage(base, path, [
      article.title,
      article.headings
        .find((heading) => heading.title.trim() === 'Enhancement/Amp Level')
        .title.trim(),
    ]);
  }
  for (const path of ['/source', '/source/']) {
    await assertPage(base, path, [source.title, 'Kanon’s original words']);
  }

  const imagePath = figures[0].src;
  const image = await request(base, imagePath, 200);
  const imageType = image.headers.get('content-type') ?? '';
  if (!/^image\/(?:png|jpeg|webp|gif|svg\+xml)(?:\s*;|$)/i.test(imageType)) {
    await image.body?.cancel();
    throw new Error(
      `${imagePath}: expected image content-type, got ${imageType || 'none'}`,
    );
  }
  if ((await image.arrayBuffer()).byteLength === 0)
    throw new Error(`${imagePath}: empty image`);

  const nonce = randomUUID();
  const missingPage = await htmlText(
    base,
    `/__deployment-smoke-missing-${nonce}`,
    404,
  );
  if (
    !/page not found/i.test(missingPage.text) ||
    !missingPage.document.querySelector('a[href="/"]')
  ) {
    throw new Error('404 page must say Page not found and link home');
  }
  const missingAsset = await request(
    base,
    `/images/guide/__deployment-smoke-missing-${nonce}.png`,
    404,
  );
  await missingAsset.body?.cancel();
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  if (process.argv.length !== 3) {
    console.error(
      'Usage: npm run verify:deployment -- https://YOUR-DEPLOY-URL.netlify.app',
    );
    process.exitCode = 1;
  } else {
    try {
      await checkDeployment(process.argv[2]);
      console.log(`Deployment smoke checks passed: ${process.argv[2]}`);
    } catch (error) {
      console.error(`Deployment smoke checks failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
