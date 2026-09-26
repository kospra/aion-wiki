import chapter01 from './chapters/chapter-01.json' with { type: 'json' };
import chapter02 from './chapters/chapter-02.json' with { type: 'json' };
import chapter03 from './chapters/chapter-03.json' with { type: 'json' };
import chapter04 from './chapters/chapter-04.json' with { type: 'json' };
import chapter05 from './chapters/chapter-05.json' with { type: 'json' };
import chapter06 from './chapters/chapter-06.json' with { type: 'json' };
import chapter07 from './chapters/chapter-07.json' with { type: 'json' };
import chapter08 from './chapters/chapter-08.json' with { type: 'json' };
import chapter09 from './chapters/chapter-09.json' with { type: 'json' };
import chapter10 from './chapters/chapter-10.json' with { type: 'json' };
import chapter11 from './chapters/chapter-11.json' with { type: 'json' };
import chapter12 from './chapters/chapter-12.json' with { type: 'json' };
import overview from './source-overview.json' with { type: 'json' };
import groupA from './figures/group-a.json' with { type: 'json' };
import groupB from './figures/group-b.json' with { type: 'json' };
import groupC from './figures/group-c.json' with { type: 'json' };
import taxonomy from '../../content/source/taxonomy.json' with { type: 'json' };
import sourceReferences from './source-references.json' with { type: 'json' };
import coverageA from '../../content/coverage/group-a.json' with { type: 'json' };
import coverageB from '../../content/coverage/group-b.json' with { type: 'json' };
import coverageC from '../../content/coverage/group-c.json' with { type: 'json' };
import { normalizeSourceUrl, walkBlocks } from './reader';
import { pageForSource, sourceDistance, sourcePositions } from './source-order';
import type { CoverageEntry, Figure, GuidePage } from './types';

const chapterPages = [
  chapter01,
  chapter02,
  chapter03,
  chapter04,
  chapter05,
  chapter06,
  chapter07,
  chapter08,
  chapter09,
  chapter10,
  chapter11,
  chapter12,
].flat() as GuidePage[];
const bySlug = new Map(chapterPages.map((page) => [page.slug, page]));
export const pages: GuidePage[] = [
  overview as GuidePage,
  ...taxonomy.slice(1).map(({ slug }) => {
    const page = bySlug.get(slug);
    if (!page) throw new Error(`Missing guide page: ${slug}`);
    return page;
  }),
];
export const figures: Figure[] = [...groupA, ...groupB, ...groupC] as Figure[];
export const figureById: Record<string, Figure> = Object.fromEntries(
  figures.map((figure) => [figure.id, figure]),
);
const pageBySlug = new Map(pages.map((page) => [page.slug, page]));
export function getPage(slug: string): GuidePage | undefined {
  return pageBySlug.get(slug);
}
export function pagePath(slug: string): string {
  return slug === overview.slug ? '/source' : `/articles/${slug}`;
}

const coverage = [...coverageA, ...coverageB, ...coverageC] as CoverageEntry[];
const primary = new Map(
  coverage
    .filter((item) => item.primary)
    .map((item) => [item.sourceId, item.primary!]),
);
const sourceDocument = overview.sourceUrl;
export const sourceLinks: Record<string, string> = {};
const blockIds = new Map(
  pages.map((page) => [
    page.slug,
    new Set(walkBlocks(page.blocks).map((block) => block.id)),
  ]),
);

const positions = sourcePositions(
  sourceReferences.blocks.map((block) => block.id),
);
const omitted = new Map(
  coverage
    .filter((item) => item.disposition === 'omitted' && item.pageSlug)
    .map((item) => [item.sourceId, item.pageSlug!]),
);

function destination(sourceId: string): string {
  const omittedPage = omitted.get(sourceId);
  if (omittedPage) return pagePath(omittedPage);
  const mapped = primary.get(sourceId);
  if (mapped) {
    const blockId = mapped.blockIds.find((id) =>
      blockIds.get(mapped.pageSlug)?.has(id),
    );
    if (blockId) return `${pagePath(mapped.pageSlug)}#${blockId}`;
  }
  // Spacing-only source blocks have no visible destination. Use the nearest
  // source-bearing block in their article to keep every captured id navigable.
  const slug = pageForSource(sourceId, positions, taxonomy);
  if (!slug) return sourceDocument;
  const candidates = [...primary.entries()]
    .filter(
      ([, item]) =>
        item.pageSlug === slug &&
        item.blockIds.some((blockId) => blockIds.get(slug)?.has(blockId)),
    )
    .sort(
      ([a], [b]) =>
        sourceDistance(positions, a, sourceId) -
        sourceDistance(positions, b, sourceId),
    );
  const closest = candidates[0]?.[1];
  const blockId = closest?.blockIds.find((id) => blockIds.get(slug)?.has(id));
  return blockId ? `${pagePath(slug)}#${blockId}` : pagePath(slug);
}

for (const block of sourceReferences.blocks) {
  const href = destination(block.id);
  sourceLinks[block.id] = href;
  if (block.anchor) {
    sourceLinks[`#${block.anchor}`] = href;
    sourceLinks[`${sourceDocument}#${block.anchor}`] = href;
  }
}
for (const block of sourceReferences.blocks) {
  for (const href of block.links) {
    const normalized = normalizeSourceUrl(href);
    if (href.startsWith('#')) {
      if (!sourceLinks[href]) sourceLinks[href] = `${sourceDocument}${href}`;
    } else if (normalized) {
      const parsed = new URL(normalized);
      const sameDocument =
        parsed.origin + parsed.pathname ===
        new URL(sourceDocument).origin + new URL(sourceDocument).pathname;
      const target =
        sameDocument && parsed.hash ? sourceLinks[parsed.hash] : undefined;
      sourceLinks[href] = target ?? normalized;
    }
  }
}
