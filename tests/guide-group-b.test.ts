import { describe, expect, it } from 'vitest';
import chapter from '../app/content/chapters/chapter-05.json';
import figureData from '../app/content/figures/group-b.json';
import coverageData from '../content/coverage/group-b.json';
import baseline from '../content/source/baseline.json';
import taxonomy from '../content/source/taxonomy.json';
import audit from '../content/source/figure-audit.json';
import { inlineText, pageText, walkBlocks } from '../app/content/reader';
import type { CoverageEntry, Figure, GuidePage } from '../app/content/types';
import { validateGuide } from '../scripts/content-integrity';

type AuditRecord = {
  purpose: string;
  screenshotOnlyInformation: string[];
  unresolved: string[];
  mappings: {
    label: string;
    color?: string;
    visualValue?: string;
    meaning: string;
    textBlockIds: string[];
    confidence: string;
  }[];
  combatTable?: { columns: string[]; rows: (string | number)[][] };
};

const groupPages = chapter as GuidePage[];
const groupFigures = figureData as Figure[];
const groupCoverage = coverageData as CoverageEntry[];
const groupSources = baseline.blocks.slice(406, 510);
const externalDestinations = Object.fromEntries(
  baseline.blocks
    .filter((source) => !groupSources.includes(source))
    .map((source) => {
      const article = taxonomy.find(
        (entry) =>
          source.id >= entry.firstBlock && source.id <= entry.lastBlock,
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
const figure = (id: string) => groupFigures.find((item) => item.id === id)!;

describe('Enhancement chapter source migration', () => {
  it('keeps six ordered articles, 104 source blocks, and 28 original placements', () => {
    expect(groupPages).toHaveLength(6);
    expect(groupPages.map((item) => item.slug)).toEqual(
      taxonomy.filter((item) => item.chapter === 5).map((item) => item.slug),
    );
    expect(groupCoverage.map((item) => item.sourceId)).toEqual(
      groupSources.map((item) => item.id),
    );
    expect(groupFigures).toHaveLength(28);
    expect(validateGuide(input)).toEqual([]);
  });

  it('preserves all 106 independent visual mappings and 20 uncertainties', () => {
    const records = audit.filter((item) => item.auditGroup === 'b');
    expect(records).toHaveLength(28);
    expect(
      groupFigures.reduce((count, item) => count + item.mappings.length, 0),
    ).toBe(106);
    expect(
      groupFigures.reduce(
        (count, item) => count + item.uncertainties.length,
        0,
      ),
    ).toBe(20);
    for (const entry of records) {
      const source = entry.sourceRecord as AuditRecord;
      const item = figure(entry.figureId);
      expect(item.caption).toBe(source.purpose);
      expect(
        item.screenshotOnly.slice(
          0,
          source.screenshotOnlyInformation?.length ?? 0,
        ),
      ).toEqual(source.screenshotOnlyInformation ?? []);
      expect(item.uncertainties).toEqual(source.unresolved ?? []);
      expect(item.mappings).toEqual(
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
    expect(figure('figure-042').src).toBe(figure('figure-043').src);
    expect(figure('figure-042').sourceId).not.toBe(
      figure('figure-043').sourceId,
    );
    expect(figure('figure-039').screenshotOnly.join(' ')).toMatch(
      /626330|626,330/,
    );
  });

  it('renders every row of the audited combat sample beside figure 039', () => {
    const blocks = walkBlocks(page('theostones').blocks);
    const placement = blocks.findIndex(
      (item) => item.kind === 'figure' && item.figureId === 'figure-039',
    );
    const table = blocks.find((item) => item.kind === 'table');
    expect(placement).toBeGreaterThanOrEqual(0);
    expect(table?.kind).toBe('table');
    if (table?.kind !== 'table') return;
    expect(blocks.indexOf(table)).toBe(placement + 1);
    const audited = (
      audit.find((item) => item.figureId === 'figure-039')!
        .sourceRecord as AuditRecord
    ).combatTable!;
    expect(table.columns.map(inlineText)).toEqual(audited.columns);
    expect(table.rows).toHaveLength(16);
    expect(
      table.rows.map((row) =>
        row.map((cell) =>
          cell
            .map((block) =>
              'content' in block ? inlineText(block.content) : '',
            )
            .join(''),
        ),
      ),
    ).toEqual(audited.rows.map((row) => row.map((value) => String(value))));
    expect(table.caption).toMatch(/single|sample/i);
    expect(text('theostones')).toMatch(/626,330|626330/);
    expect(text('theostones')).toMatch(/encounter|duration/i);
  });

  it('separates screenshot samples and labels ambiguous costs and grades', () => {
    expect(text('growth-and-amplification')).toMatch(/60%/);
    expect(text('growth-and-amplification')).toMatch(/25\.5%.*16\.5%.*9%/s);
    expect(text('growth-and-amplification')).toMatch(/3\.0%/);
    expect(text('potential-enhancement')).toMatch(/Global.*not confirmed/s);
    expect(text('manastones-and-soulstones')).toMatch(/50%.*35%.*15%/s);
    expect(text('manastones-and-soulstones')).toMatch(/Common Manastone/);
    expect(text('soul-binding-bind-sync-and-reset')).toMatch(/90\.2%/);
    expect(text('soul-binding-bind-sync-and-reset')).toMatch(/32%/);
  });

  it('places each source arrow between its recipe output and input', () => {
    const blocks = walkBlocks(page('gear-transfer-and-material-costs').blocks);
    for (const [id, output, input] of [
      ['block-0496', 'figure-048', 'figure-049'],
      ['block-0497', 'figure-050', 'figure-051'],
    ] as const) {
      const group = blocks.find((item) => item.id === id);
      expect(group?.kind).toBe('group');
      if (group?.kind !== 'group') continue;
      expect(
        group.blocks.map((child) =>
          child.kind === 'figure' ? child.figureId : 'arrow',
        ),
      ).toEqual([output, 'arrow', input]);
      const arrow = group.blocks[1];
      expect(arrow.kind).toBe('paragraph');
      if (arrow.kind === 'paragraph')
        expect(inlineText(arrow.content)).toBe('⬅️');
    }
  });

  it('keeps transfer donor direction, paired recipes, and chapter transition context', () => {
    const transfer = page('gear-transfer-and-material-costs');
    const copy = text(transfer.slug);
    expect(copy).toMatch(/right.*donor.*left.*recipient/i);
    expect(copy).toMatch(/049.*048/s);
    expect(copy).toMatch(/051.*050/s);
    expect(copy).toMatch(/20\/15/);
    expect(copy).toMatch(/0 held|owns 0/);
    expect(copy).toMatch(/3 held|owns 3/);
    expect(copy).toMatch(/CHAPTER 6:/);
    expect(
      walkBlocks(transfer.blocks).find((item) => item.id === 'block-0510')
        ?.kind,
    ).toBe('paragraph');
  });
});
