import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import baseline from '../content/source/baseline.json';
import taxonomy from '../content/source/taxonomy.json';
import audit from '../content/source/figure-audit.json';
import { inlineText, pageText, walkBlocks } from '../app/content/reader';
import type { CoverageEntry, Figure, GuidePage } from '../app/content/types';
import { validateGuide } from '../scripts/content-integrity';

function read<T>(path: string, fallback: T): T {
  return existsSync(path)
    ? (JSON.parse(readFileSync(path, 'utf8')) as T)
    : fallback;
}
const groupPages = Array.from({ length: 7 }, (_, i) =>
  read<GuidePage[]>(
    `app/content/chapters/chapter-${String(i + 6).padStart(2, '0')}.json`,
    [],
  ),
).flat();
const groupFigures = read<Figure[]>('app/content/figures/group-c.json', []);
const groupCoverage = read<CoverageEntry[]>(
  'content/coverage/group-c.json',
  [],
);
const groupSources = baseline.blocks.slice(510);
const externalDestinations = Object.fromEntries(
  baseline.blocks.slice(0, 510).map((source) => {
    const article = taxonomy.find(
      (item) => source.id >= item.firstBlock && source.id <= item.lastBlock,
    )!;
    return [
      source.id,
      `${article.chapter === 0 ? '/source' : `/articles/${article.slug}`}#${source.id}`,
    ];
  }),
);
const input = {
  baseline,
  pages: groupPages,
  figures: groupFigures,
  coverage: groupCoverage,
  externalDestinations,
};
const page = (slug: string) => groupPages.find((item) => item.slug === slug)!;
const text = (slug: string) => pageText(page(slug), groupFigures);
const sourceBlock = (id: string) =>
  groupPages.flatMap((p) => walkBlocks(p.blocks)).find((b) => b.id === id)!;
type RecordC = {
  title: string;
  screenshotOnly?: string[];
  qualifiers: string[];
  unresolved: string[];
  mappings: {
    label: string;
    color?: string;
    visualValue?: string;
    meaning: string;
    textBlockIds: string[];
    confidence: string;
  }[];
};

describe('Chapters six through twelve source migration', () => {
  it('preserves all 23 articles, 758 primary source blocks and 37 placements', () => {
    expect(groupPages).toHaveLength(23);
    expect(groupPages.map((p) => p.slug)).toEqual(
      taxonomy.filter((t) => t.chapter >= 6).map((t) => t.slug),
    );
    expect(groupCoverage.map((c) => c.sourceId)).toEqual(
      groupSources.map((s) => s.id),
    );
    expect(groupFigures).toHaveLength(37);
    expect(validateGuide(input)).toEqual([]);
  });
  it('preserves 144 audited mappings, 32 uncertainties and every one of eight figure qualifiers', () => {
    const records = audit.filter((a) => a.auditGroup === 'c');
    expect(groupFigures.reduce((n, f) => n + f.mappings.length, 0)).toBe(144);
    expect(groupFigures.reduce((n, f) => n + f.uncertainties.length, 0)).toBe(
      32,
    );
    expect(
      records.reduce(
        (n, a) => n + (a.sourceRecord as RecordC).qualifiers.length,
        0,
      ),
    ).toBe(8);
    for (const entry of records) {
      const record = entry.sourceRecord as RecordC;
      const figure = groupFigures.find((f) => f.id === entry.figureId)!;
      expect(figure.caption).toBe(record.title);
      expect(figure.uncertainties).toEqual(record.unresolved);
      expect(figure.screenshotOnly).toEqual([
        ...(record.screenshotOnly ?? []),
        ...record.qualifiers,
      ]);
      expect(figure.mappings).toEqual(
        record.mappings.map(({ textBlockIds, confidence, ...mapping }) => ({
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
  it('keeps the nine-membership eight-card conflict and five-card alternatives visible', () => {
    const five = groupPages.find((p) => /Five-card/.test(p.title))!;
    const eight = page('five-card-and-eight-card-set-setups');
    expect(pageText(five, groupFigures)).toMatch(/Parchment/);
    expect(
      walkBlocks(five.blocks).some(
        (b) => b.kind === 'note' && b.tone === 'uncertain',
      ),
    ).toBe(true);
    expect(pageText(eight, groupFigures)).toMatch(
      /nine.*memberships|nine.*entries/i,
    );
    expect(pageText(eight, groupFigures)).toMatch(/one Parchment/i);
    expect(sourceBlock('block-0617')).toBeDefined();
    expect(sourceBlock('block-0626')).toBeDefined();
  });
  it('keeps region-specific Genus priorities and numbered screenshot example separate', () => {
    expect(text('asia-genus-stat-priorities')).toMatch(/Double Chance/);
    expect(text('global-genus-stat-priorities')).toMatch(/Power Shard/);
    expect(text('asia-genus-stat-priorities')).toMatch(
      /example.*not.*ideal|example.*not.*BIS/i,
    );
    expect(text('insight-levels-and-efficient-analysis')).toMatch(/Smite/);
    const numbered = groupFigures.find((f) => f.id === 'figure-079')!;
    expect(
      numbered.mappings
        .filter((mapping) => /^Line\(slot\)/.test(mapping.label))
        .map((mapping) => mapping.label),
    ).toEqual(Array.from({ length: 9 }, (_, i) => 'Line(slot)' + (i + 1)));
    expect(
      numbered.mappings.find((mapping) => mapping.label === 'Insight')
        ?.visualValue,
    ).toBe('Cogni Lv.10(MAX)');
    expect(
      walkBlocks(page('global-genus-stat-priorities').blocks).some(
        (b) => b.kind === 'table',
      ),
    ).toBe(true);
  });
  it('retains equipped and owned wing grouping, indentation and the sole source highlight', () => {
    const wings = page('wing-stat-catalog');
    const blocks = walkBlocks(wings.blocks);
    expect(
      blocks.filter((b) => b.kind === 'group').length,
    ).toBeGreaterThanOrEqual(12);
    expect(
      blocks.filter((b) => b.kind === 'list').length,
    ).toBeGreaterThanOrEqual(12);
    const highlighted = blocks.flatMap((b) =>
      'content' in b
        ? b.content
            .filter((i) => i.highlight)
            .map((i) => ({ id: b.id, text: i.text }))
        : [],
    );
    expect(highlighted.every((i) => i.id === 'block-0912')).toBe(true);
    expect(highlighted.map((i) => i.text).join('')).toMatch(/Double Chance/);
    expect(pageText(wings, groupFigures)).toMatch(
      /Flight Power Critical Hit Resist/,
    );
    expect(text('kr-class-wing-rankings-and-positional-faq')).toMatch(
      /8\/21\/2026/,
    );
    expect(
      page('kr-class-wing-rankings-and-positional-faq').qualifiers.join(' '),
    ).toMatch(/not updated|excluded/i);
  });
  it('keeps literal formulas with adjacent ambiguity notes and no inferred calculator', () => {
    for (const id of [
      'block-1021',
      'block-1099',
      'block-1112',
      'block-1152',
      'block-1226',
    ]) {
      const block = sourceBlock(id);
      expect(block.kind).toBe('formula');
      if (block.kind !== 'formula') continue;
      const original = baseline.blocks.find((s) => s.id === id)!;
      const literal = block.explanation.length
        ? inlineText(block.explanation)
        : block.expression;
      expect(literal.replace(/\s+/gu, ' ').trim()).toBe(
        original.text.replace(/\s+/gu, ' ').trim(),
      );
      const owner = groupPages.find((p) =>
        walkBlocks(p.blocks).some((b) => b.id === id),
      )!;
      const siblings = walkBlocks(owner.blocks);
      expect(siblings[siblings.indexOf(block) + 1]).toMatchObject({
        kind: 'note',
        tone: 'uncertain',
      });
    }
    expect(text('multi-hit')).toMatch(/unconfirmed/i);
    expect(text('damage-formula-and-pure-attack')).toMatch(/not an official/i);
  });
  it('retains source assumptions, raw versus effective shard values and graph disagreement', () => {
    expect(
      page('offensive-stat-values-and-attack-comparisons').qualifiers.join(' '),
    ).toMatch(/KR.*Season 1.*level 50/i);
    expect(text('power-shards')).toMatch(/4\.65%/);
    expect(text('power-shards')).toMatch(/8\.9%/);
    expect(text('power-shards')).toMatch(/4\.05%/);
    expect(text('accuracy-block-and-critical-hit')).toMatch(/79%/);
    expect(text('accuracy-block-and-critical-hit')).toMatch(/80%/);
    expect(text('defense-and-penetration')).toMatch(/490/);
    expect(text('defense-and-penetration')).toMatch(/499/);
    expect(text('damage-tolerance-endurance-and-combat-speed')).toMatch(
      /chance/i,
    );
  });
  it('preserves repaired italic and bold tails at their source positions', () => {
    for (const [id, flag] of [
      ['block-1031', 'emphasis'],
      ['block-1079', 'strong'],
    ] as const) {
      const b = sourceBlock(id);
      expect('content' in b).toBe(true);
      if ('content' in b) {
        expect(b.content.at(-1)?.[flag]).toBe(true);
        expect(inlineText(b.content).replace(/\s+/gu, ' ').trim()).toBe(
          baseline.blocks
            .find((s) => s.id === id)!
            .text.replace(/\s+/gu, ' ')
            .trim(),
        );
      }
    }
  });
  it('keeps Class Passives as the sole source-pending placeholder', () => {
    expect(
      groupPages
        .filter((p) => p.status === 'source-pending')
        .map((p) => p.slug),
    ).toEqual(['class-passives']);
    expect(text('class-passives')).toMatch(/coming soon/i);
    expect(
      walkBlocks(page('class-passives').blocks).filter(
        (b) => b.sourceIds.length,
      ),
    ).toHaveLength(2);
  });
});
