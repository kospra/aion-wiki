import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCompleteGuide } from './guide-data.ts';
import {
  blockInlineSegments,
  normalizeSourceUrl,
} from '../app/content/reader.ts';
import type {
  CoverageEntry,
  Figure,
  GuidePage,
  SourceBaseline,
} from '../app/content/types';
import { createDestinations, pagePath } from './content-destinations.ts';
import {
  indexBlocks,
  normalizeWhitespace,
  primaryFragments,
  validateFragments,
} from './content-fragments.ts';

export type GuideValidationInput = {
  baseline: SourceBaseline;
  pages: GuidePage[];
  figures: Figure[];
  coverage: CoverageEntry[];
  /** Focused groups only: frozen source IDs outside this group → route#block. */
  externalDestinations?: Record<string, string>;
};

function duplicateIds(values: string[], kind: string): string[] {
  const seen = new Set<string>();
  return values.flatMap((id) => {
    if (seen.has(id)) return [`duplicate ${kind}: ${id}`];
    seen.add(id);
    return [];
  });
}

function isLayoutOnly(source: SourceBaseline['blocks'][number]): boolean {
  const text = normalizeWhitespace(source.text);
  return (
    !source.figureIds.length &&
    !source.numbers.length &&
    !source.links.length &&
    (!text || /^(?:[-_=─━═*–—]\s*){3,}$/u.test(text))
  );
}

function validateFigures(
  input: GuideValidationInput,
  destinations: ReturnType<typeof createDestinations>,
  indexes: Map<string, ReturnType<typeof indexBlocks>>,
): string[] {
  const errors: string[] = [];
  const original = new Map(
    input.baseline.figures.map((figure) => [figure.id, figure]),
  );
  const byId = new Map(input.figures.map((figure) => [figure.id, figure]));
  const placements = [...indexes.values()]
    .flat()
    .filter(({ block }) => block.kind === 'figure');
  for (const { block } of placements) {
    if (block.kind === 'figure' && !byId.has(block.figureId))
      errors.push(`${block.id}: missing figure ${block.figureId}`);
  }
  for (const figure of input.figures) {
    const expected = original.get(figure.id);
    if (!expected) errors.push(`${figure.id}: unknown figure`);
    else
      for (const property of [
        'sourceId',
        'src',
        'sha256',
        'width',
        'height',
      ] as const) {
        if (figure[property] !== expected[property])
          errors.push(`${figure.id}: figure ${property} differs from source`);
      }
    const placementCount = placements.filter(
      ({ block }) => block.kind === 'figure' && block.figureId === figure.id,
    ).length;
    if (placementCount !== 1)
      errors.push(
        `${figure.id}: figure requires exactly one visible placement, got ${placementCount}`,
      );
    if (!figure.alt.trim() || !figure.caption.trim())
      errors.push(`${figure.id}: figure needs accessible alt and caption`);
    if (
      !Number.isInteger(figure.width) ||
      figure.width <= 0 ||
      !Number.isInteger(figure.height) ||
      figure.height <= 0
    )
      errors.push(`${figure.id}: invalid figure dimensions`);
    if (
      !figure.src.startsWith('/images/guide/') ||
      figure.src.includes('..') ||
      normalizeSourceUrl(figure.src) !== figure.src
    )
      errors.push(`${figure.id}: unsafe figure asset path`);
    for (const mapping of figure.mappings) {
      if (!mapping.label.trim() || !mapping.meaning.trim())
        errors.push(
          `${figure.id}: figure mapping needs a text label and meaning`,
        );
      for (const sourceId of mapping.textSourceIds) {
        if (!destinations.textDestination(sourceId))
          errors.push(
            `${figure.id}: figure linked text ${sourceId} has no rendered destination`,
          );
      }
    }
  }
  for (const expected of input.baseline.figures) {
    if (
      input.externalDestinations?.[expected.sourceId] &&
      !input.coverage.some((entry) => entry.sourceId === expected.sourceId)
    )
      continue;
    if (!byId.has(expected.id))
      errors.push(`${expected.id}: missing source figure`);
    const source = input.baseline.blocks.find(
      (block) => block.id === expected.sourceId,
    );
    if (!source?.figureIds.includes(expected.id))
      errors.push(`${expected.id}: figure source placement is inconsistent`);
  }
  return errors;
}

/** Pure, offline validation against the independently captured source baseline. */
export function validateGuide(input: GuideValidationInput): string[] {
  const {
    baseline,
    pages,
    figures,
    coverage,
    externalDestinations = {},
  } = input;
  const errors = [
    ...duplicateIds(
      baseline.blocks.map((block) => block.id),
      'source id',
    ),
    ...duplicateIds(
      baseline.figures.map((figure) => figure.id),
      'source figure id',
    ),
    ...duplicateIds(
      pages.map((page) => page.slug),
      'page slug',
    ),
    ...duplicateIds(pages.map(pagePath), 'page route'),
    ...duplicateIds(
      figures.map((figure) => figure.id),
      'figure id',
    ),
    ...duplicateIds(
      coverage.map((entry) => entry.sourceId),
      'coverage source id',
    ),
  ];
  const sources = new Map(baseline.blocks.map((block) => [block.id, block]));
  const manifests = new Map(coverage.map((entry) => [entry.sourceId, entry]));
  const indexes = new Map(
    pages.map((page) => [page.slug, indexBlocks(page.blocks)]),
  );
  const anchors = new Map(
    pages.map((page) => [
      pagePath(page),
      new Set(indexes.get(page.slug)!.map(({ block }) => block.id)),
    ]),
  );
  const destinations = createDestinations(
    baseline,
    pages,
    coverage,
    anchors,
    externalDestinations,
  );

  for (const [sourceId, target] of Object.entries(externalDestinations)) {
    if (anchors.has(target.split('#')[0]))
      errors.push(
        `${sourceId}: external destination must be outside the included pages`,
      );
    if (manifests.has(sourceId))
      errors.push(
        `${sourceId}: external destination conflicts with local coverage`,
      );
    if (
      !/^\/(?:articles\/[^/#?]+|source)#[^#?]+$/u.test(target) ||
      normalizeSourceUrl(target) !== target
    )
      errors.push(
        `${sourceId}: unsafe or invalid external destination ${target}`,
      );
  }
  for (const page of pages) {
    const index = indexes.get(page.slug)!;
    errors.push(
      ...duplicateIds(
        index.map(({ block }) => block.id),
        `anchor on ${page.slug}`,
      ),
    );
    const sourceUrl = normalizeSourceUrl(page.sourceUrl);
    if (!sourceUrl || !/^https?:\/\//u.test(sourceUrl))
      errors.push(`${page.slug}: unsafe source URL`);
    for (const { block, sourceIds } of index) {
      const textSources = new Set(
        sourceIds.filter((id) => sources.get(id)?.text.trim()),
      );
      if (
        textSources.size > 1 &&
        blockInlineSegments(block)
          .flat()
          .some((run) => run.text.trim())
      )
        errors.push(
          `${page.slug}/${block.id}: multiple substantive sources require distinct source text leaves`,
        );
      if (!block.id || /[\s#]/u.test(block.id))
        errors.push(`${page.slug}: invalid anchor ${block.id}`);
      for (const sourceId of block.sourceIds) {
        if (
          !sources.has(sourceId) &&
          !Object.hasOwn(externalDestinations, sourceId)
        )
          errors.push(
            `${page.slug}/${block.id}: unknown source id ${sourceId}`,
          );
      }
      for (const run of blockInlineSegments(block).flat()) {
        if (run.href === undefined) continue;
        if (!normalizeSourceUrl(run.href))
          errors.push(
            `${page.slug}/${block.id}: unsafe inline URL ${run.href}`,
          );
        else if (!destinations.canonical(run.href, page))
          errors.push(
            `${page.slug}/${block.id}: dead link destination or anchor ${run.href}`,
          );
      }
    }
  }

  for (const entry of coverage) {
    if (!sources.has(entry.sourceId))
      errors.push(`${entry.sourceId}: coverage has no source block`);
  }
  for (const source of baseline.blocks) {
    const entry = manifests.get(source.id);
    if (!entry) {
      if (!Object.hasOwn(externalDestinations, source.id))
        errors.push(`${source.id}: missing coverage`);
      continue;
    }
    if (entry.disposition === 'layout-only') {
      if (!entry.reason?.trim())
        errors.push(`${source.id}: layout-only coverage requires a reason`);
      if (!isLayoutOnly(source))
        errors.push(
          `${source.id}: substantive text or figure cannot be layout-only`,
        );
      if (entry.primary)
        errors.push(
          `${source.id}: layout-only coverage cannot have a primary destination`,
        );
      continue;
    }
    if (isLayoutOnly(source))
      errors.push(
        `${source.id}: empty or document separator requires explicit layout-only coverage`,
      );
    const primary = entry.primary;
    const page = pages.find((page) => page.slug === primary?.pageSlug);
    if (!primary || !page || !primary.blockIds.length) {
      errors.push(
        `${source.id}: rendered coverage needs a visible primary destination`,
      );
      continue;
    }
    const index = indexes.get(page.slug)!;
    errors.push(
      ...duplicateIds(primary.blockIds, `primary block id for ${source.id}`),
    );
    for (const id of primary.blockIds) {
      if (!index.some(({ block }) => block.id === id))
        errors.push(`${source.id}: missing primary block ${id}`);
    }
    const fragments = primaryFragments(index, primary.blockIds, source.id);
    if (!fragments.length)
      errors.push(`${source.id}: primary blocks lack source attribution`);
    errors.push(
      ...validateFragments(source, fragments, (href, fromSource) =>
        destinations.canonical(href, page, fromSource),
      ),
    );
    for (const figureId of source.figureIds) {
      const count = fragments.filter(
        ({ block }) => block.kind === 'figure' && block.figureId === figureId,
      ).length;
      if (count !== 1)
        errors.push(
          `${source.id}: figure ${figureId} requires one primary placement, got ${count}`,
        );
    }
  }
  errors.push(...validateFigures(input, destinations, indexes));
  return errors;
}

// Importing this module stays pure; direct execution provides an offline CI gate.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const inputPath = process.argv[2] === '--input' ? process.argv[3] : undefined;
  const input: GuideValidationInput = inputPath
    ? JSON.parse(await readFile(inputPath, 'utf8'))
    : await loadCompleteGuide();
  const errors = validateGuide(input);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `Verified ${input.coverage.length} source blocks, ${input.figures.length} figure placements and ${input.pages.length} source/article pages.`,
    );
  }
}
