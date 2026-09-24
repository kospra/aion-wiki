/* global structuredClone, URL */
import console from 'node:console';
import process from 'node:process';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { articles, categories, staticPaths } from '../app/content/wiki.ts';
import { walkBlocks, inlineText } from '../app/content/reader.ts';
import { loadCompleteGuide } from './guide-data.ts';
import { validateGuide } from './content-integrity.ts';

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
export async function verifyStatic(root = 'build/client', suppliedInput) {
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
        category?.title ?? 'Aion 2 Wiki',
        route,
      );
      for (const entry of articles.filter(
        (a) => !category || a.category === category.slug,
      )) {
        hasText(
          main.querySelector(`a[href="/articles/${entry.slug}"]`),
          entry.title,
          `${route}/${entry.slug}`,
        );
      }
    }
    if (page) {
      hasText(main.querySelector('h1'), page.title, route);
      hasText(main.querySelector('article > header'), page.summary, route);
      const status = {
        'source-backed': 'Source backed',
        'source-uncertain': 'Source context and uncertainty',
        'source-pending': 'Source pending',
      };
      hasText(
        main.querySelector('[data-source-status]'),
        status[page.status],
        route,
      );
      for (const qualifier of page.qualifiers)
        hasText(main.querySelector('[data-source-status]'), qualifier, route);
      assert.equal(
        main.querySelector('[data-source-credit] a').getAttribute('href'),
        page.sourceUrl,
      );
      const expectedOrder = walkBlocks(page.blocks).map((block) => block.id);
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
        if (block.kind === 'group')
          hasText(
            element.querySelector('[data-guide-group-label]'),
            block.label,
            block.id,
          );
        if (block.kind === 'formula') {
          actual.expression = visibleText(element.querySelector('pre'));
          actual.explanation = renderedInline(element.querySelector('p'));
          hasText(element.querySelector('pre'), block.expression, block.id);
          hasText(
            element.querySelector('p'),
            inlineText(block.explanation),
            block.id,
          );
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
          const img = rendered.querySelector(':scope > img');
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
          hasText(
            rendered.querySelector('figcaption'),
            figure.caption,
            figure.id,
          );
          const mappings = rendered.querySelectorAll(
            '[data-guide-legend] > div',
          );
          assert.equal(mappings.length, figure.mappings.length);
          figure.mappings.forEach((mapping, index) => {
            for (const value of [
              mapping.label,
              mapping.color,
              mapping.visualValue,
            ].filter(Boolean))
              hasText(mappings[index].querySelector('dt'), value, figure.id);
            hasText(
              mappings[index].querySelector('dd'),
              mapping.meaning,
              figure.id,
            );
            if (mapping.confidence !== 'confirmed')
              hasText(mappings[index], mapping.confidence, figure.id);
            assert.equal(
              mappings[index].querySelectorAll('a').length,
              mapping.textSourceIds.length,
            );
            mapping.textSourceIds.forEach((sourceId, linkIndex) => {
              const primary = input.coverage.find(
                (entry) => entry.sourceId === sourceId,
              ).primary;
              const owner = input.pages.find(
                (entry) => entry.slug === primary.pageSlug,
              );
              const path =
                owner.category === null ? '/source' : `/articles/${owner.slug}`;
              assert.equal(
                mappings[index]
                  .querySelectorAll('a')
                  .item(linkIndex)
                  .getAttribute('href'),
                `${path}#${primary.blockIds[0]}`,
                `${figure.id}: annotation source destination`,
              );
            });
          });
          for (const [selector, values] of [
            ['[data-guide-screenshot-facts] li', figure.screenshotOnly],
            ['[data-guide-uncertainties] li', figure.uncertainties],
          ]) {
            const items = rendered.querySelectorAll(selector);
            assert.equal(items.length, values.length);
            values.forEach((value, index) =>
              hasText(items[index], value, figure.id),
            );
          }
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
  const result = {
    routes: documents.size,
    blocks: checkedBlocks,
    figures: input.figures.length,
    localAssets: assetPaths.size,
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
