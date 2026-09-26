/* global structuredClone, URL */
import console from 'node:console';
import process from 'node:process';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { articles, categories, staticPaths } from '../app/content/wiki.ts';
import { walkBlocks, inlineText } from '../app/content/reader.ts';
import { orderTldrFirst } from '../app/content/rules.ts';
import { loadCompleteGuide } from './guide-data.ts';
import { validateGuide } from './content-integrity.ts';
import { canonicalUrl, isIndexable, siteOrigin } from '../app/seo.ts';

export const normalize = (text) => text.replace(/\s+/gu, ' ').trim();
// DOM parsing decodes entities and preserves inline boundaries. Hidden source
// copies, script payloads, closed dialogs, and metadata cannot satisfy checks.
export function visibleText(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return '';
  if (
    node.closest(
      'script,style,template,[hidden],[aria-hidden="true"],[role="dialog"][data-state="closed"]',
    )
  )
    return '';
  for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
    const style = ancestor.getAttribute('style') ?? '';
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) return '';
  }
  if (node.tagName === 'BR') return ' ';
  const text = [...node.childNodes].map(visibleText).join('');
  return /^(P|DIV|LI|SECTION|ASIDE|PRE|H[1-6]|DT|DD|TH|TD|CAPTION)$/.test(
    node.tagName,
  )
    ? ` ${text} `
    : text;
}
function hasText(node, expected, context) {
  assert.ok(node, `${context}: missing DOM destination`);
  assert.ok(
    normalize(visibleText(node)).includes(normalize(expected)),
    `${context}: missing visible text ${JSON.stringify(expected)}`,
  );
}

// Reconstruct only visible source-bearing fields from the built DOM, then run
// the independent source validator again. Metadata and a hidden duplicate cannot
// stand in for a missing number, source phrase, link, or emphasis in the output.
function renderedInline(element) {
  const runs = [];
  function visit(node, inherited = {}) {
    if (node.nodeType === 3) {
      runs.push({ ...inherited, text: node.textContent });
      return;
    }
    if (node.nodeType !== 1 || !visibleText(node)) return;
    const flags = { ...inherited };
    if (node.tagName === 'STRONG') flags.strong = true;
    if (node.tagName === 'EM') flags.emphasis = true;
    if (node.tagName === 'U') flags.underline = true;
    if (node.tagName === 'MARK')
      flags.highlight = node.getAttribute('data-source-highlight') ?? '';
    if (node.tagName === 'A') flags.href = node.getAttribute('href');
    if (node.tagName === 'BR') {
      runs.push({ ...flags, text: '\n' });
      return;
    }
    for (const child of node.childNodes) visit(child, flags);
  }
  visit(element);
  return runs;
}
// Only placeholder content may be noindex. A new kind of page that isIndexable
// in app/seo.ts does not know yet would otherwise drop out of search silently.
function isPlaceholder(route) {
  const [, section, slug] = route.split('/');
  const pending = (article) => article.status === 'source-pending';
  if (section === 'articles')
    return articles.some(
      (article) => article.slug === slug && pending(article),
    );
  if (section !== 'categories') return false;
  const chapter = articles.filter((article) => article.category === slug);
  return chapter.length > 0 && chapter.every(pending);
}

// Netlify sets CONTEXT to the deploy context and URL to the site's primary
// domain. A production deploy must not publish canonical links to another one.
export function checkSiteOrigin(env) {
  if (env.CONTEXT !== 'production' || !env.URL) return;
  assert.equal(
    new URL(env.URL).origin,
    siteOrigin,
    `Netlify's primary domain is ${env.URL}, but siteOrigin in app/seo.ts is ${siteOrigin}. Follow "Changing the domain" in docs/deployment.md before deploying.`,
  );
}

// Search engines see one canonical URL per indexable page and noindex on every
// other page; link previews need an absolute image on the site's own origin.
export function checkSearchMetadata(route, document) {
  const url = canonicalUrl(route);
  const indexable = isIndexable(route);
  const canonical = [...document.querySelectorAll('link[rel="canonical"]')].map(
    (link) => link.getAttribute('href'),
  );
  const robots =
    document.querySelector('meta[name="robots"]')?.getAttribute('content') ??
    '';
  if (indexable) {
    assert.deepEqual(canonical, [url], `${route}: canonical link`);
    assert.doesNotMatch(robots, /noindex/, `${route}: indexable but noindex`);
  } else {
    assert.ok(
      isPlaceholder(route),
      `${route}: noindex, but only placeholder content may be; add this kind of page to isIndexable in app/seo.ts`,
    );
    assert.deepEqual(canonical, [], `${route}: noindex page with canonical`);
    assert.match(robots, /noindex/, `${route}: missing noindex`);
  }
  assert.equal(
    document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    url,
    `${route}: og:url`,
  );
  const image =
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content') ?? '';
  assert.ok(image.startsWith(`${siteOrigin}/`), `${route}: og:image origin`);
  for (const script of document.querySelectorAll(
    'script[type="application/ld+json"]',
  ))
    for (const item of [JSON.parse(script.textContent)].flat())
      assert.equal(
        item['@context'],
        'https://schema.org',
        `${route}: structured data context`,
      );
  return {
    indexed: indexable ? url : undefined,
    image: new URL(image).pathname,
  };
}

export async function verifyPublishRoot(root) {
  const allowedTopLevel = new Set([
    '404.html',
    '__spa-fallback.html',
    'favicon.svg',
    'index.html',
    'robots.txt',
    'sitemap.xml',
    'articles',
    'assets',
    'categories',
    'images',
    'source',
  ]);
  const forbiddenAnywhere = new Set([
    '.git',
    '.local-tools',
    '.npmrc',
    'content',
    'functions',
    'scripts',
    'server',
  ]);
  async function checkPublishedFiles(directory, topLevel = false) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      assert.ok(
        !entry.isSymbolicLink() &&
          !/^\.env(?:\.|$)/i.test(entry.name) &&
          !forbiddenAnywhere.has(entry.name) &&
          (!topLevel || allowedTopLevel.has(entry.name)),
        `Forbidden publish artifact: ${join(directory, entry.name)}`,
      );
      if (entry.isDirectory())
        await checkPublishedFiles(join(directory, entry.name));
    }
  }
  await checkPublishedFiles(root, true);
  assert.equal(
    (await readdir(join(root, 'source'))).sort().join(','),
    'index.html',
    'Published /source must contain only its prerendered route',
  );
}

export async function verifyStatic(root = 'build/client', suppliedInput) {
  checkSiteOrigin(process.env);
  await verifyPublishRoot(root);
  const notFoundHtml = await readFile(join(root, '404.html'), 'utf8');
  const notFoundDocument = new JSDOM(notFoundHtml).window.document;
  assert.equal(notFoundDocument.documentElement.lang, 'en');
  assert.equal(notFoundDocument.documentElement.className, 'dark');
  assert.equal(notFoundDocument.querySelectorAll('main').length, 1);
  assert.equal(
    notFoundDocument.querySelector('h1')?.textContent,
    'Page not found',
  );
  assert.equal(
    notFoundDocument.querySelector('a[href="/"]')?.textContent,
    'Return to the homepage',
  );
  assert.equal(
    notFoundDocument
      .querySelector('meta[name="robots"]')
      ?.getAttribute('content'),
    'noindex',
  );
  assert.ok(
    notFoundDocument.querySelector('style'),
    '404 needs embedded Chakra styles',
  );
  assert.equal(notFoundDocument.querySelectorAll('script').length, 0);
  notFoundDocument.defaultView.close();
  const input = suppliedInput ?? (await loadCompleteGuide());
  assert.deepEqual(
    validateGuide(input),
    [],
    'Full guide must match independent baseline',
  );
  assert.equal(staticPaths.length, 57);
  const renderedInput = structuredClone(input);
  const documents = new Map();
  const assetPaths = new Set();
  const indexedUrls = new Set();
  let checkedBlocks = 0;
  for (const route of staticPaths) {
    const html = await readFile(
      join(root, route.slice(1), 'index.html'),
      'utf8',
    );
    assert.doesNotMatch(
      html,
      /\/@vite\/client|\/@react-refresh|localhost:\d+|127\.0\.0\.1:\d+/,
      `${route}: development reference`,
    );
    const document = new JSDOM(html).window.document;
    documents.set(route, document);
    const search = checkSearchMetadata(route, document);
    if (search.indexed) indexedUrls.add(search.indexed);
    assetPaths.add(search.image);
    const main = document.querySelector('main');
    assert.equal(
      document.querySelectorAll('main').length,
      1,
      `${route}: semantic main`,
    );
    assert.equal(
      main.querySelectorAll('h1').length,
      1,
      `${route}: single heading`,
    );
    assert.doesNotMatch(
      visibleText(main),
      /sample content|starter article/i,
      `${route}: obsolete sample disclosure`,
    );
    const page = input.pages.find(
      (p) =>
        route === (p.category === null ? '/source' : `/articles/${p.slug}`),
    );
    const category = categories.find((c) => route === `/categories/${c.slug}`);
    if (category || route === '/') {
      hasText(
        main.querySelector('h1'),
        category?.title ?? 'Aion 2, explained.',
        route,
      );
      for (const entry of category
        ? articles.filter((a) => a.category === category.slug)
        : []) {
        hasText(
          main.querySelector(`a[href="/articles/${entry.slug}"]`),
          entry.title,
          `${route}/${entry.slug}`,
        );
      }
      if (route === '/') {
        for (const chapter of categories) {
          hasText(
            main.querySelector(`a[href="/categories/${chapter.slug}"]`),
            chapter.title,
            `${route}/${chapter.slug}`,
          );
        }
      }
    }
    if (page) {
      hasText(main.querySelector('h1'), page.title, route);
      hasText(main.querySelector('article > header'), page.summary, route);
      assert.equal(
        main.querySelector('[data-source-credit] a').getAttribute('href'),
        page.sourceUrl,
      );
      // Articles show the author's TLDR first (app/content/rules.ts).
      const expectedOrder = walkBlocks(orderTldrFirst(page.blocks)).map(
        (block) => block.id,
      );
      const expectedIds = new Set(expectedOrder);
      assert.deepEqual(
        [...main.querySelectorAll('[data-guide-content] [id]')]
          .map((node) => node.id)
          .filter((id) => expectedIds.has(id)),
        expectedOrder,
        `${route}: structured source order`,
      );
      for (const block of walkBlocks(page.blocks)) {
        const actual = walkBlocks(
          renderedInput.pages.find((p) => p.slug === page.slug).blocks,
        ).find((b) => b.id === block.id);
        checkedBlocks++;
        const nodes = main.querySelectorAll(`[id="${block.id}"]`);
        assert.equal(
          nodes.length,
          1,
          `${route}#${block.id}: unique rendered block`,
        );
        const element = nodes[0];
        assert.ok(
          element.closest('[data-guide-content]'),
          `${block.id}: source must be in visible article body`,
        );
        if ('content' in block)
          actual.content = renderedInline(
            block.kind === 'note' ? element.querySelector('p') : element,
          );
        if ('content' in block)
          hasText(
            block.kind === 'note' ? element.querySelector('p') : element,
            inlineText(block.content),
            block.id,
          );
        if (block.kind === 'heading')
          assert.equal(element.tagName, `H${block.level}`);
        if (block.kind === 'note')
          hasText(element.querySelector('strong'), block.label, block.id);
        if (block.kind === 'formula') {
          actual.expression = renderedInline(element.querySelector('pre'));
          hasText(
            element.querySelector('pre'),
            inlineText(block.expression),
            block.id,
          );
          if (inlineText(block.explanation).trim()) {
            actual.explanation = renderedInline(element.querySelector('p'));
            hasText(
              element.querySelector('p'),
              inlineText(block.explanation),
              block.id,
            );
          } else {
            assert.equal(
              element.querySelector('p'),
              null,
              `${block.id}: empty formula explanation must not render`,
            );
            actual.explanation = [];
          }
        }
        if (block.kind === 'list' && block.ordered)
          assert.equal(
            Number(element.getAttribute('start') ?? 1),
            block.start ?? 1,
          );
        if (block.kind === 'table') {
          hasText(element.querySelector('caption'), block.caption, block.id);
          assert.equal(
            element.querySelectorAll(':scope > table > tbody > tr').length,
            block.rows.length,
          );
          const columns = element.querySelectorAll(':scope > table > thead th');
          assert.equal(columns.length, block.columns.length);
          actual.columns = [...columns].map(renderedInline);
          block.columns.forEach((column, index) =>
            hasText(columns[index], inlineText(column), block.id),
          );
        }
        if (block.kind === 'figure') {
          const figure = input.figures.find((f) => f.id === block.figureId);
          const rendered = element.querySelector('figure');
          assert.equal(rendered.id, figure.id);
          const img = rendered.querySelector('[data-guide-primary-image]');
          for (const [name, value] of Object.entries({
            src: figure.src,
            alt: figure.alt,
            width: figure.width,
            height: figure.height,
          }))
            assert.equal(
              img.getAttribute(name),
              String(value),
              `${figure.id}: ${name}`,
            );
        }
      }
    }
    for (const element of document.querySelectorAll('[src],link[href]')) {
      const path = element.getAttribute('src') ?? element.getAttribute('href');
      if (path?.startsWith('/')) assetPaths.add(path.split(/[?#]/)[0]);
    }
  }
  assert.deepEqual(
    validateGuide(renderedInput),
    [],
    'Built visible content must match the independent baseline',
  );
  for (const [route, document] of documents) {
    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!href.startsWith('/') && !href.startsWith('#')) continue;
      const url = new URL(href, `https://static.invalid${route}`);
      const target = documents.get(url.pathname.replace(/\/$/, '') || '/');
      if (!target) {
        assetPaths.add(url.pathname);
        continue;
      }
      if (url.hash)
        assert.ok(
          target.getElementById(decodeURIComponent(url.hash.slice(1))),
          `${route}: dead fragment ${href}`,
        );
    }
  }
  for (const asset of assetPaths) {
    const path = resolve(root, `.${asset}`);
    assert.ok(path.startsWith(resolve(root) + sep), `Unsafe asset ${asset}`);
    assert.ok((await stat(path)).isFile(), `Missing local asset ${asset}`);
  }
  for (const figure of input.figures) {
    const data = await readFile(join(root, figure.src));
    assert.equal(
      createHash('sha256').update(data).digest('hex'),
      figure.sha256,
      `${figure.id}: original image changed`,
    );
  }
  const sitemap = new JSDOM(await readFile(join(root, 'sitemap.xml'), 'utf8'), {
    contentType: 'application/xml',
  }).window;
  const urlset = sitemap.document.documentElement;
  assert.equal(urlset.localName, 'urlset', 'Sitemap root');
  assert.equal(
    urlset.namespaceURI,
    'http://www.sitemaps.org/schemas/sitemap/0.9',
    'Sitemap namespace',
  );
  const sitemapLocs = [...urlset.getElementsByTagName('loc')].map((loc) =>
    loc.textContent.trim(),
  );
  sitemap.close();
  assert.equal(
    new Set(sitemapLocs).size,
    sitemapLocs.length,
    'Sitemap URLs must be unique',
  );
  assert.deepEqual(
    new Set(sitemapLocs),
    indexedUrls,
    'Sitemap must list exactly the indexable canonical URLs',
  );
  const robots = await readFile(join(root, 'robots.txt'), 'utf8');
  assert.ok(
    robots.split('\n').includes(`Sitemap: ${siteOrigin}/sitemap.xml`),
    'robots.txt must name the sitemap',
  );
  assert.doesNotMatch(
    robots,
    /^Disallow:\s*\/\s*$/m,
    'robots.txt must not block the site',
  );
  const result = {
    routes: documents.size,
    blocks: checkedBlocks,
    figures: input.figures.length,
    localAssets: assetPaths.size,
    sitemapUrls: sitemapLocs.length,
  };
  console.log(`Verified static guide: ${JSON.stringify(result)}`);
  for (const document of documents.values()) document.defaultView.close();
  return result;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await verifyStatic(process.argv[2]);
