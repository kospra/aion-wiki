import { describe, expect, it } from 'vitest';
import overview from '../app/content/source-overview.json';
import chapter1 from '../app/content/chapters/chapter-01.json';
import chapter2 from '../app/content/chapters/chapter-02.json';
import chapter3 from '../app/content/chapters/chapter-03.json';
import chapter4 from '../app/content/chapters/chapter-04.json';
import figureData from '../app/content/figures/group-a.json';
import coverageData from '../content/coverage/group-a.json';
import baseline from '../content/source/baseline.json';
import taxonomy from '../content/source/taxonomy.json';
import audit from '../content/source/figure-audit.json';
import { inlineText, pageText, walkBlocks } from '../app/content/reader';
import type { CoverageEntry, Figure, GuidePage } from '../app/content/types';
import { validateGuide } from '../scripts/content-integrity';

const pages = [
  overview,
  ...chapter1,
  ...chapter2,
  ...chapter3,
  ...chapter4,
] as GuidePage[];
const figures = figureData as Figure[];
const coverage = coverageData as CoverageEntry[];
const sources = baseline.blocks.slice(0, 406);
const externalDestinations = Object.fromEntries(
  baseline.blocks.slice(406).map((source) => {
    const article = taxonomy.find(
      (entry) => source.id >= entry.firstBlock && source.id <= entry.lastBlock,
    )!;
    return [source.id, `/articles/${article.slug}#${source.id}`];
  }),
);
const input = { baseline, pages, figures, coverage, externalDestinations };
const page = (slug: string) => pages.find((entry) => entry.slug === slug)!;
const text = (slug: string) => pageText(page(slug), figures);

describe('source overview and chapters one through four', () => {
  it('preserves the frozen article order and accounts for every source block', () => {
    expect(pages.map((entry) => entry.slug)).toEqual(
      taxonomy.filter((entry) => entry.chapter <= 4).map((entry) => entry.slug),
    );
    expect(pages.filter((entry) => entry.category !== null)).toHaveLength(14);
    expect(coverage.map((entry) => entry.sourceId)).toEqual(
      sources.map((source) => source.id),
    );
    expect(figures).toHaveLength(25);
    expect(validateGuide(input)).toEqual([]);
  });

  it('preserves every audited mapping, screenshot-only fact, and uncertainty', () => {
    const records = audit.filter((entry) => entry.auditGroup === 'a');
    expect(
      figures.reduce((count, figure) => count + figure.mappings.length, 0),
    ).toBe(71);
    expect(
      figures.reduce((count, figure) => count + figure.uncertainties.length, 0),
    ).toBe(19);
    for (const entry of records) {
      const source = entry.sourceRecord as {
        visualPurpose: string;
        mappings: {
          label: string;
          color?: string;
          visualValue?: string;
          meaning: string;
          textBlockIds: string[];
          confidence: string;
        }[];
        screenshotOnly: string[];
        unresolved: string[];
      };
      const figure = figures.find((item) => item.id === entry.figureId)!;
      expect(figure.caption).toBe(source.visualPurpose);
      expect(figure.screenshotOnly).toEqual(source.screenshotOnly);
      expect(figure.uncertainties).toEqual(source.unresolved);
      expect(figure.mappings).toEqual(
        source.mappings.map(({ textBlockIds, confidence, ...mapping }) => ({
          ...mapping,
          textSourceIds: textBlockIds,
          confidence:
            confidence === 'high'
              ? 'confirmed'
              : confidence === 'medium'
                ? 'approximate'
                : 'unresolved',
        })),
      );
    }
  });

  it('keeps the seven numbered gear layers and their color meanings', () => {
    const starts = walkBlocks(page('gear-anatomy-and-stat-layers').blocks)
      .filter((block) => block.kind === 'list' && block.ordered)
      .map((block) => (block.kind === 'list' ? block.start : undefined));
    expect(starts).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 7]));
    expect(
      figures
        .find((figure) => figure.id === 'figure-005')!
        .mappings.map(
          (mapping) => `${mapping.label} ${mapping.color} ${mapping.meaning}`,
        )
        .join(' '),
    ).toMatch(/Soul Binding/);
  });

  it('retains numbered gear headings and the nested explanation hierarchy', () => {
    const gear = page('gear-anatomy-and-stat-layers');
    for (const id of [
      'block-0034',
      'block-0042',
      'block-0045',
      'block-0060',
      'block-0069',
      'block-0078',
      'block-0085',
    ]) {
      expect(
        walkBlocks(gear.blocks).find((block) => block.id === id)?.kind,
      ).toBe('heading');
    }
    const first = gear.blocks.find((block) => block.id === 'list-block-0034');
    expect(first?.kind).toBe('list');
    if (first?.kind === 'list') {
      expect(
        walkBlocks(first.items[0]).some((block) => block.id === 'block-0035'),
      ).toBe(true);
    }
  });
  it('visibly carries Global and rarity context while keeping one primary placement', () => {
    const global = page('global-stat-priorities-by-equipment');
    expect(global.qualifiers.join(' ')).toMatch(/Global/);
    for (const id of ['block-0248', 'block-0250']) {
      const original = sources.find((source) => source.id === id)!;
      const context = walkBlocks(global.blocks).find((block) =>
        block.sourceIds.includes(id),
      );
      expect(context?.kind).toBe('note');
      if (context?.kind === 'note')
        expect(inlineText(context.content).replace(/\s+/gu, ' ').trim()).toBe(
          original.text,
        );
      expect(
        coverage.find((entry) => entry.sourceId === id)?.primary?.pageSlug,
      ).toBe('stat-line-rerolling-strategy');
      expect(
        walkBlocks(global.blocks).some(
          (block) =>
            block.kind === 'paragraph' &&
            block.content.some(
              (run) =>
                run.href === `/articles/stat-line-rerolling-strategy#${id}`,
            ),
        ),
      ).toBe(true);
    }
  });

  it('attributes first-person source prose and retains update and uncertainty context', () => {
    expect(text('about-the-source-and-author')).toMatch(/Kanon/);
    expect(page('about-the-source-and-author').qualifiers.join(' ')).toMatch(
      /first.person.*Kanon/i,
    );
    expect(text('about-the-source-and-author')).toContain(
      'Last Updated: /20/2026',
    );
    expect(text('about-the-source-and-author')).toContain('9/20/2026');
    expect(text('about-the-source-and-author')).toMatch(/Wings/);
    expect(text('about-the-source-and-author')).toMatch(/Aion Research Lab/);
    expect(text('gear-anatomy-and-stat-layers')).toMatch(/Armor DOUBLE CHECK/);
    expect(text('runes')).toMatch(/need confirmation/);
    expect(text('raid-accuracy-and-critical-hit-requirements')).toMatch(
      /Muspel.*Normal/s,
    );
    expect(text('raid-accuracy-and-critical-hit-requirements')).toMatch(
      /need values/,
    );
    expect(text('raid-accuracy-and-critical-hit-requirements')).toContain('?');
  });

  it('makes source emphasis and numeric fidelity fail when the visible source is altered', () => {
    const changed = structuredClone(input);
    const pantheon = changed.pages.find(
      (entry) => entry.slug === 'pantheon-stats-and-statues',
    )!;
    for (const block of walkBlocks(pantheon.blocks)) {
      if ('content' in block)
        for (const run of block.content) {
          delete run.highlight;
          delete run.underline;
        }
    }
    expect(validateGuide(changed).join(' ')).toMatch(/formatting/);
    const removed = structuredClone(input);
    const raid = removed.pages.find(
      (entry) => entry.slug === 'raid-accuracy-and-critical-hit-requirements',
    )!;
    const block = walkBlocks(raid.blocks).find(
      (entry) =>
        'content' in entry &&
        entry.content.some((run) => run.text.includes('1500')),
    )!;
    if ('content' in block)
      for (const run of block.content) run.text = run.text.replace('1500', '');
    expect(validateGuide(removed).join(' ')).toMatch(/numeric.*1500/);
  });
});
