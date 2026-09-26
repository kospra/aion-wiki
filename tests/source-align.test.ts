// @vitest-environment node
import { expect, it } from 'vitest';
import type { SourceBaseline } from '../app/content/types';
import {
  alignSnapshot,
  similarity,
  type Alignment,
} from '../scripts/source/align.ts';
import { parseExport } from '../scripts/source/parse.ts';

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const empty: SourceBaseline = {
  fingerprints: { html: '' },
  blocks: [],
  figures: [],
};
const capture = (body: string) =>
  parseExport(`<html><head></head><body>${body}</body></html>`);
const first = (body: string) =>
  alignSnapshot(empty, capture(body), {
    fingerprints: { html: 'first' },
    nextBlock: 1,
    nextFigure: 1,
  });
const next = (previous: Alignment, body: string, force = false) =>
  alignSnapshot(previous.baseline, capture(body), {
    fingerprints: { html: 'next' },
    nextBlock: previous.nextBlock,
    nextFigure: previous.nextFigure,
    force,
  });
const kinds = (alignment: Alignment) =>
  alignment.changes.map(({ id, kind }) => `${id}:${kind}`);
const paragraphs = (...texts: string[]) =>
  texts.map((text) => `<p>${text}</p>`).join('');

it('measures word similarity', () => {
  expect(similarity('one two three', 'one two four')).toBeCloseTo(2 / 3);
  expect(similarity('', '')).toBe(1);
  expect(similarity('a', '')).toBe(0);
});

it('keeps unchanged IDs and numbers new blocks after the highest issued', () => {
  const v1 = first(paragraphs('one two three', 'four five six'));
  const v2 = next(
    v1,
    paragraphs('one two three', 'new words here', 'four five six'),
  );
  expect(kinds(v2)).toEqual([
    'block-0001:unchanged',
    'block-0003:added',
    'block-0002:unchanged',
  ]);
  expect(v2.nextBlock).toBe(4);
});

it('pairs an edited paragraph by word similarity', () => {
  const v1 = first(paragraphs('a b c', 'd e f', 'one two three'));
  expect(kinds(next(v1, paragraphs('a b c', 'd e f', 'one two four')))).toEqual(
    ['block-0001:unchanged', 'block-0002:unchanged', 'block-0003:edited'],
  );
});

it('ignores new redirect tracking parameters and keeps the stored href', () => {
  const link = (ust: number) =>
    `<p><a href="https://www.google.com/url?q=https://example.com&amp;ust=${ust}">site</a></p>`;
  const v2 = next(first(link(1)), link(2));
  expect(kinds(v2)).toEqual(['block-0001:unchanged']);
  expect(v2.baseline.blocks[0].links[0].href).toContain('ust=1');
});

it('keeps a renamed heading by its anchor', () => {
  const v1 = first(
    '<h2 id="h.a">Old name</h2>' + paragraphs('x y z', 'q r s', 't u v'),
  );
  const v2 = next(
    v1,
    '<h2 id="h.a">Totally different</h2>' +
      paragraphs('x y z', 'q r s', 't u v'),
  );
  expect(kinds(v2)[0]).toBe('block-0001:edited');
});

it('never reuses the number of a removed block', () => {
  const v1 = first(paragraphs('a b', 'c d', 'e f', 'g h', 'i j'));
  const v2 = next(v1, paragraphs('a b', 'c d', 'e f', 'g h'));
  expect(v2.removed).toEqual(['block-0005']);
  const v3 = next(v2, paragraphs('a b', 'c d', 'e f', 'g h', 'k l'));
  expect(kinds(v3).at(-1)).toBe('block-0006:added');
});

it('stops when a chapter heading disappears or most blocks change', () => {
  const v1 = first(
    '<h1>CH 1: Start</h1>' + paragraphs('a b c', 'd e f', 'g h i', 'j k l'),
  );
  expect(() =>
    next(v1, paragraphs('a b c', 'd e f', 'g h i', 'j k l')),
  ).toThrow('Chapter heading');
  const v2 = first(paragraphs('a b c', 'd e f', 'g h i', 'j k l'));
  const rewrite = paragraphs('m n o', 'p q r', 's t u', 'v w x');
  expect(() => next(v2, rewrite)).toThrow('Only 0 of 4 blocks');
  expect(next(v2, rewrite, true).removed).toHaveLength(4);
});

it('reuses figure IDs by image hash and numbers new images', () => {
  const image = `<p><img src="data:image/png;base64,${png}"></p>`;
  const v1 = first(image + paragraphs('a b c'));
  expect(v1.baseline.figures.map((figure) => figure.id)).toEqual([
    'figure-001',
  ]);
  const v2 = next(v1, image + paragraphs('a b c') + image);
  expect(
    v2.baseline.figures.map((figure) => [figure.id, figure.sourceId]),
  ).toEqual([
    ['figure-001', 'block-0001'],
    ['figure-002', 'block-0003'],
  ]);
  expect(v2.newImages.map(({ figure }) => figure.id)).toEqual(['figure-002']);
  expect(v2.baseline.figures[1].src).toMatch(
    /^\/images\/guide\/[0-9a-f]{64}\.png$/u,
  );
});
