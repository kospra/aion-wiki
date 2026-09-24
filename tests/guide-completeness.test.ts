import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCompleteGuide } from '../scripts/guide-data';
import { validateGuide } from '../scripts/content-integrity';
import { blockInlineSegments, walkBlocks } from '../app/content/reader';
import { staticPaths } from '../app/content/wiki';
import audit from '../content/source/figure-audit.json';

const completeGuide = await loadCompleteGuide();
const copy = () => structuredClone(completeGuide);
const blocks = (input = completeGuide) =>
  input.pages.flatMap((page) => walkBlocks(page.blocks));

describe('complete captured guide', () => {
  it('accounts for every independent source occurrence with no external destinations', () => {
    expect(completeGuide.externalDestinations).toBeUndefined();
    expect(validateGuide(completeGuide)).toEqual([]);
    expect(completeGuide.coverage).toHaveLength(1268);
    expect(
      completeGuide.coverage.filter((c) => c.disposition === 'rendered'),
    ).toHaveLength(959);
    expect(completeGuide.figures).toHaveLength(90);
    expect(new Set(completeGuide.figures.map((f) => f.sha256)).size).toBe(89);
    expect(
      completeGuide.baseline.blocks.flatMap((b) => b.numbers),
    ).toHaveLength(651);
    expect(completeGuide.baseline.blocks.flatMap((b) => b.links)).toHaveLength(
      21,
    );
    expect(staticPaths).toHaveLength(57);
  });
  it('retains every audited mapping, uncertainty and regional qualifier in figure display fields', () => {
    expect(completeGuide.figures.flatMap((f) => f.mappings)).toHaveLength(321);
    expect(completeGuide.figures.flatMap((f) => f.uncertainties)).toHaveLength(
      71,
    );
    let qualifiers = 0;
    for (const entry of audit) {
      const record = entry.sourceRecord as {
        mappings: {
          textBlockIds: string[];
          confidence: string;
          label: string;
          meaning: string;
        }[];
        unresolved?: string[];
        qualifiers?: string[];
        screenshotOnly?: string[];
        screenshotOnlyInformation?: string[];
      };
      const figure = completeGuide.figures.find(
        (f) => f.id === entry.figureId,
      )!;
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
      expect(figure.uncertainties).toEqual(record.unresolved ?? []);
      for (const fact of [
        ...(record.screenshotOnly ?? record.screenshotOnlyInformation ?? []),
        ...(record.qualifiers ?? []),
      ])
        expect(figure.screenshotOnly).toContain(fact);
      qualifiers += record.qualifiers?.length ?? 0;
    }
    expect(qualifiers).toBe(8);
  });
  it('rejects a lost repeated placement and a lost primary coverage entry', () => {
    const missing = copy();
    missing.figures = missing.figures.filter((f) => f.id !== 'figure-043');
    expect(validateGuide(missing).join(' ')).toMatch(/figure-043/);
    const lostCoverage = copy();
    lostCoverage.coverage = lostCoverage.coverage.filter(
      (c) => c.sourceId !== 'block-0250',
    );
    expect(validateGuide(lostCoverage).join(' ')).toMatch(/block-0250/);
  });
  it('rejects one lost repeated numeric occurrence while keeping its source ID', () => {
    const changed = copy();
    const source = changed.baseline.blocks.find((b) =>
      b.numbers.some((n, i) => b.numbers.indexOf(n) !== i),
    )!;
    const token = source.numbers.find(
      (n, i) => source.numbers.indexOf(n) !== i,
    )!;
    const block = blocks(changed).find(
      (b) =>
        b.sourceIds.includes(source.id) &&
        blockInlineSegments(b)
          .flat()
          .some((r) => r.text.includes(token)),
    )!;
    const run = blockInlineSegments(block)
      .flat()
      .find((r) => r.text.includes(token))!;
    run.text = run.text.replace(token, '');
    expect(validateGuide(changed).join(' ')).toContain(source.id);
    expect(validateGuide(changed).join(' ')).toMatch(/number|numeric/);
  });
  it('rejects lost regional source wording even with an intact copy in another article', () => {
    const changed = copy();
    const owner = changed.coverage.find(
      (c) => c.sourceId === 'block-0250',
    )!.primary!;
    const block = walkBlocks(
      changed.pages.find((p) => p.slug === owner.pageSlug)!.blocks,
    ).find((b) => b.id === 'block-0250')!;
    const run = blockInlineSegments(block)
      .flat()
      .find((r) => /Global/i.test(r.text))!;
    expect(run).toBeDefined();
    run.text = run.text.replace(/Global/i, 'Regional');
    expect(validateGuide(changed).join(' ')).toMatch(/block-0250/);
  });
  it('rejects a changed external destination despite keeping its label', () => {
    const changed = copy();
    const run = blocks(changed)
      .flatMap((b) => blockInlineSegments(b).flat())
      .find((r) => r.href?.includes('twitch'))!;
    run.href = 'https://example.com/wrong-destination';
    expect(validateGuide(changed).join(' ')).toMatch(/link|destination/);
  });
  it('runs directly under Node and exits nonzero for invalid full-guide input', () => {
    const directory = mkdtempSync(join(tmpdir(), 'guide-integrity-'));
    try {
      const invalid = copy();
      invalid.figures = invalid.figures.filter((f) => f.id !== 'figure-043');
      const path = join(directory, 'invalid.json');
      writeFileSync(path, JSON.stringify(invalid));
      const result = spawnSync(
        process.execPath,
        ['scripts/content-integrity.ts', '--input', path],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/figure-043/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
