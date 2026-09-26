import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { SourceBaseline } from '../app/content/types';
import { baselineDigest } from '../scripts/source/captures.ts';
import type { Capture, TaxonomyEntry } from '../scripts/source/model.ts';

const load = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;
const baseline = load<SourceBaseline>('content/source/baseline.json');
const captures = load<Capture[]>('content/source/captures.json');
const taxonomy = load<TaxonomyEntry[]>('content/source/taxonomy.json');
const sourceDigest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
// The original visual audit is provenance and never changes with a sync.
const figureAuditSourceDigest =
  'b6875fb48a72944260c42deb28d2633e88f4889211a77c8e00735abb4bf83f44';

it('changes the baseline only through the importer', () => {
  // npm run source:sync records each capture's digest; a hand edit no longer matches.
  expect(baselineDigest(baseline)).toBe(captures.at(-1)?.baselineDigest);
});

it('numbers blocks and figures uniquely, below the next free numbers', () => {
  const last = captures.at(-1)!;
  const blockIds = baseline.blocks.map((block) => block.id);
  const figureIds = baseline.figures.map((figure) => figure.id);
  expect(new Set(blockIds).size).toBe(blockIds.length);
  expect(new Set(figureIds).size).toBe(figureIds.length);
  for (const id of blockIds) expect(id).toMatch(/^block-\d{4,}$/u);
  for (const id of figureIds) expect(id).toMatch(/^figure-\d{3,}$/u);
  expect(Math.max(...blockIds.map((id) => Number(id.slice(6))))).toBeLessThan(
    last.nextBlock,
  );
  expect(Math.max(...figureIds.map((id) => Number(id.slice(7))))).toBeLessThan(
    last.nextFigure,
  );
});

it('stores the exact original bytes at every figure path', () => {
  for (const figure of baseline.figures) {
    const path = join('public', figure.src.replace(/^\//, ''));
    expect(existsSync(path), figure.id).toBe(true);
    expect(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      figure.id,
    ).toBe(figure.sha256);
  }
});

it('covers every source block with one article range, in order', () => {
  const positions = new Map(
    baseline.blocks.map((block, index) => [block.id, index]),
  );
  let expected = 0;
  for (const page of taxonomy) {
    expect(positions.get(page.firstBlock), page.slug).toBe(expected);
    const last = positions.get(page.lastBlock)!;
    expect(last, page.slug).toBeGreaterThanOrEqual(expected);
    const blocks = baseline.blocks.slice(expected, last + 1);
    expect(page.nonemptyBlocks, page.slug).toBe(
      blocks.filter((block) => block.text || block.figureIds.length).length,
    );
    expect(page.figures, page.slug).toEqual(
      blocks.flatMap((block) => block.figureIds),
    );
    expected = last + 1;
  }
  expect(expected).toBe(baseline.blocks.length);
});

it('uses distinct ASCII slugs', () => {
  expect(new Set(taxonomy.map((page) => page.slug)).size).toBe(taxonomy.length);
  for (const page of taxonomy)
    expect(page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

it('retains complete normalized figure audit evidence', () => {
  const preserved = load<unknown[]>('content/source/figure-audit.json');
  expect(sourceDigest(preserved)).toBe(figureAuditSourceDigest);
});

it('positions every formatting run in whitespace-normalized UTF-16 source text', () => {
  for (const block of baseline.blocks) {
    const normalized = block.text.replace(/\s+/gu, ' ').trim();
    for (const run of block.formatting) {
      expect(Number.isInteger(run.start), block.id).toBe(true);
      expect(run.start, block.id).toBeGreaterThanOrEqual(0);
      expect(run.end, block.id).toBeGreaterThan(run.start);
      expect(normalized.slice(run.start, run.end), block.id).toBe(
        run.text.replace(/\s+/gu, ' ').trim(),
      );
    }
  }
});
