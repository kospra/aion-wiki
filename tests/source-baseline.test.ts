import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

type BaselineSnapshot = {
  fingerprints: { html: string; docx: string };
  blocks: {
    id: string;
    text: string;
    numbers: string[];
    figureIds: string[];
    anchor?: string;
    listStart?: number;
    links: { label: string; href: string }[];
    formatting: {
      text: string;
      strong?: boolean;
      emphasis?: boolean;
      underline?: boolean;
      highlight?: string;
    }[];
  }[];
  figures: {
    id: string;
    sourceId: string;
    sha256: string;
    src: string;
    width: number;
    height: number;
  }[];
};

type TaxonomyEntry = {
  chapter: number;
  title: string;
  sourceTitle?: string;
  slug: string;
  firstBlock: string;
  lastBlock: string;
  nonemptyBlocks: number;
  figures: string[];
};

const load = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;
const baseline = (): BaselineSnapshot =>
  load<BaselineSnapshot>('content/source/baseline.json');
// Frozen from JSON.stringify(JSON.parse(saved audit)) before the original, ignored
// research inputs were imported. These digests cover every nested record.
const sourceDigest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const taxonomySourceDigest =
  '6bcdca4876e79fe8f98f908f995dd7d9eda5c7b4d1f8a396a9c537c0d164da82';
const figureAuditSourceDigest =
  'b6875fb48a72944260c42deb28d2633e88f4889211a77c8e00735abb4bf83f44';

it('freezes the complete source block, number, link, and figure baseline', () => {
  const snapshot = baseline();
  expect(snapshot.fingerprints).toEqual({
    html: '3d1a5c34900c95b1cc7af1c19167be836adbf23570e71684172a2a00480c5eb8',
    docx: 'ac7c3833a4d39ada22045deb471772df73b1abaf9d54e53f0f92baeb9caed826',
  });
  expect(snapshot.blocks).toHaveLength(1268);
  expect(
    snapshot.blocks.filter(
      (block) => block.text.trim() || block.figureIds.length,
    ),
  ).toHaveLength(959);
  expect(snapshot.blocks.flatMap((block) => block.numbers)).toHaveLength(651);
  expect(snapshot.blocks.flatMap((block) => block.links)).toHaveLength(21);
  expect(snapshot.figures).toHaveLength(90);
  expect(new Set(snapshot.figures.map((figure) => figure.sha256)).size).toBe(
    89,
  );
  expect(
    snapshot.figures.find((figure) => figure.id === 'figure-042')?.src,
  ).toBe(snapshot.figures.find((figure) => figure.id === 'figure-043')?.src);
  expect(
    snapshot.figures.find((figure) => figure.id === 'figure-042')?.sourceId,
  ).not.toBe(
    snapshot.figures.find((figure) => figure.id === 'figure-043')?.sourceId,
  );
});

it('preserves source anchors, numbered list starts, and meaningful styling', () => {
  const blocks = baseline().blocks;
  expect(blocks.find((block) => block.id === 'block-0408')?.anchor).toBe(
    'h.u6i0vc6bqc0l',
  );
  expect(blocks.find((block) => block.id === 'block-0034')?.listStart).toBe(1);
  expect(blocks.find((block) => block.id === 'block-0042')?.listStart).toBe(2);
  expect(blocks.find((block) => block.id === 'block-0005')?.formatting).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        text: 'Last Updated: /',
        strong: true,
        emphasis: true,
        underline: true,
        highlight: '#ffff00',
      }),
    ]),
  );
});

it('stores the exact original bytes at every figure path', () => {
  const figures = baseline().figures;
  for (const figure of figures) {
    const path = join('public', figure.src.replace(/^\//, ''));
    expect(existsSync(path), figure.id).toBe(true);
    expect(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      figure.id,
    ).toBe(figure.sha256);
  }
});

it('freezes all approved page ranges with distinct ASCII slugs', () => {
  const pages = load<TaxonomyEntry[]>('content/source/taxonomy.json');
  expect(pages).toHaveLength(44);
  expect(
    sourceDigest(
      pages.map((page) => ({
        chapter: page.chapter,
        title: page.sourceTitle ?? page.title,
        firstBlock: page.firstBlock,
        lastBlock: page.lastBlock,
        nonemptyBlocks: page.nonemptyBlocks,
        figures: page.figures,
      })),
    ),
  ).toBe(taxonomySourceDigest);
  expect(pages.at(-1)).toEqual(
    expect.objectContaining({
      title: 'Class Passives',
      sourceTitle: 'Class Passives source placeholder',
      slug: 'class-passives',
    }),
  );
  expect(new Set(pages.map((page) => page.slug)).size).toBe(44);
  for (const page of pages) {
    expect(page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

it('retains complete normalized figure audit evidence', () => {
  const preserved = load<unknown[]>('content/source/figure-audit.json');
  expect(preserved).toHaveLength(90);
  expect(sourceDigest(preserved)).toBe(figureAuditSourceDigest);
});
