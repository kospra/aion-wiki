import { expect, it } from 'vitest';
import { figures } from '../app/content/repository';
import { readerFigure } from '../app/content/reader-figure';

it('reviews every figure and excludes extraction instructions from its reader-facing text', () => {
  expect(figures).toHaveLength(90);
  for (const original of figures) {
    expect(original.readerNotes, original.id).toBeDefined();
    const figure = readerFigure(original);
    const text = [
      figure.caption,
      ...figure.screenshotOnly,
      ...figure.uncertainties,
      ...figure.mappings.flatMap((m) => [m.label, m.meaning]),
    ].join(' ');
    expect(text, original.id).not.toMatch(
      /HTML viewport|SHA256|source ledger|ol start|lst-kix|Do not reconstruct|preserve|do not infer|do not invent|do not fabricate|do not silently|if transcribing/i,
    );
    expect(
      figure.mappings.map((m) => [
        m.color,
        m.visualValue,
        m.textSourceIds,
        m.confidence,
      ]),
    ).toEqual(
      original.mappings.map((m) => [
        m.color,
        m.visualValue,
        m.textSourceIds,
        m.confidence,
      ]),
    );
    for (const label of Object.keys(original.readerNotes?.mappingText ?? {})) {
      expect(
        original.mappings.some((m) => m.label === label),
        `${original.id}: ${label}`,
      ).toBe(true);
    }
  }
});

it('never publishes unreviewed audit notes by default', () => {
  const figure = {
    ...figures[0],
    readerNotes: undefined,
    screenshotOnly: ['HTML viewport 100x200'],
    uncertainties: ['Do not reconstruct the title'],
  };
  expect(readerFigure(figure).screenshotOnly).toEqual([]);
  expect(readerFigure(figure).uncertainties).toEqual([]);
});
