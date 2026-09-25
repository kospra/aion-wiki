import type { Figure } from './types.ts';

/** Reader-facing projection; the original figure remains the provenance record. */
export function readerFigure(figure: Figure): Figure {
  return {
    ...figure,
    screenshotOnly: figure.readerNotes?.details ?? [],
    uncertainties: figure.readerNotes?.caveats ?? [],
    mappings: figure.mappings.map((mapping) => {
      const overrides = figure.readerNotes?.mappingText;
      const text =
        overrides && Object.hasOwn(overrides, mapping.label)
          ? overrides[mapping.label]
          : undefined;
      return {
        ...mapping,
        label: text?.label ?? mapping.label,
        meaning: text?.meaning ?? mapping.meaning,
      };
    }),
  };
}
