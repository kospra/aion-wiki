import type { Block } from '../../app/content/types';
import type { GuideValidationInput } from '../../scripts/content-integrity.ts';
import { alignSnapshot, type Alignment } from '../../scripts/source/align.ts';
import { baselineDigest } from '../../scripts/source/captures.ts';
import type { ContentSet } from '../../scripts/source/model.ts';
import { parseExport } from '../../scripts/source/parse.ts';

export const exportHtml = (body: string) =>
  `<html><head><style>.b{font-weight:700}</style></head><body>${body}</body></html>`;

/** block-0001..0008: two overview paragraphs, a chapter title, a heading, a paragraph, two list items, a spacer. */
export const FIRST =
  '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1>' +
  '<h2 id="h.intro">Intro</h2><p>Alpha has 10 points.</p>' +
  '<ul class="lst-kix_a-0"><li>First item</li><li>Second item</li></ul><p></p>';

const leaf = (id: string, text: string): Block => ({
  id,
  sourceIds: [id],
  kind: 'paragraph',
  content: [{ text }],
});
const rendered = (id: string, pageSlug: string) => ({
  sourceId: id,
  disposition: 'rendered' as const,
  primary: { pageSlug, blockIds: [id] },
});

export function fixtureContent(): ContentSet {
  const baseline = alignSnapshot(
    { fingerprints: { html: '' }, blocks: [], figures: [] },
    parseExport(exportHtml(FIRST)),
    { fingerprints: { html: 'first' }, nextBlock: 1, nextFigure: 1 },
  ).baseline;
  const sourceUrl = 'https://docs.google.com/document/d/doc/edit';
  return {
    baseline,
    overview: {
      slug: 'about',
      title: 'About',
      category: null,
      summary: 'About summary',
      status: 'source-backed',
      sourceUrl,
      blocks: [
        leaf('block-0001', 'About text'),
        leaf('block-0002', 'More about text'),
      ],
    },
    chapters: [
      {
        file: 'chapter-01.json',
        pages: [
          {
            slug: 'basics',
            title: 'Basics',
            category: 'basics',
            summary: 'Basics summary',
            status: 'source-backed',
            sourceUrl,
            blocks: [
              {
                id: 'block-0004',
                sourceIds: ['block-0004'],
                kind: 'heading',
                level: 2,
                content: [{ text: 'Intro' }],
              },
              leaf('block-0005', 'Alpha has 10 points.'),
              {
                id: 'list-1',
                sourceIds: [],
                kind: 'list',
                ordered: false,
                items: [
                  [leaf('block-0006', 'First item')],
                  [leaf('block-0007', 'Second item')],
                ],
              },
            ],
          },
        ],
      },
    ],
    coverage: [
      {
        file: 'group-a.json',
        entries: [
          rendered('block-0001', 'about'),
          rendered('block-0002', 'about'),
          {
            sourceId: 'block-0003',
            disposition: 'omitted',
            omission: 'chapter-title',
            pageSlug: 'basics',
            reason:
              'Google Docs chapter title; the article header shows the chapter.',
          },
          rendered('block-0004', 'basics'),
          rendered('block-0005', 'basics'),
          rendered('block-0006', 'basics'),
          rendered('block-0007', 'basics'),
          {
            sourceId: 'block-0008',
            disposition: 'layout-only',
            reason: 'Empty document spacing is normalized by article layout.',
          },
        ],
      },
    ],
    figures: [{ file: 'group-a.json', entries: [] }],
    taxonomy: [
      {
        slug: 'about',
        chapter: 0,
        title: 'About',
        firstBlock: 'block-0001',
        lastBlock: 'block-0002',
        nonemptyBlocks: 2,
        figures: [],
      },
      {
        slug: 'basics',
        chapter: 1,
        title: 'Basics',
        firstBlock: 'block-0003',
        lastBlock: 'block-0008',
        nonemptyBlocks: 5,
        figures: [],
      },
    ],
    captures: [
      {
        capturedAt: '2026-01-01T00:00:00.000Z',
        fingerprints: { html: 'first' },
        updateNote: null,
        blocks: 8,
        figures: 0,
        nextBlock: 9,
        nextFigure: 1,
        report: null,
        baselineDigest: baselineDigest(baseline),
      },
    ],
  };
}

export function alignFixture(
  content: ContentSet,
  body: string,
  force = false,
): Alignment {
  const last = content.captures.at(-1)!;
  return alignSnapshot(content.baseline, parseExport(exportHtml(body)), {
    fingerprints: { html: 'next' },
    nextBlock: last.nextBlock,
    nextFigure: last.nextFigure,
    force,
  });
}

export const guideInput = (content: ContentSet): GuideValidationInput => ({
  baseline: content.baseline,
  pages: [content.overview, ...content.chapters.flatMap((file) => file.pages)],
  figures: content.figures.flatMap((file) => file.entries),
  coverage: content.coverage.flatMap((file) => file.entries),
});
