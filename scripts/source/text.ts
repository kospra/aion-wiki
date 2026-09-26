// Whitespace the original capture collapsed: Python's str.split() set, plus the
// rest of ECMAScript's \s so the integrity validator normalizes the same text.
const spaceRanges: [number, number][] = [
  [0x09, 0x0d],
  [0x1c, 0x20],
  [0x85, 0x85],
  [0xa0, 0xa0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
];

/** Marks a `<br>` in block text; the validator reads it as a space. */
export const LINE_BREAK = '\n';

export function isSourceSpace(character: string): boolean {
  const code = character.codePointAt(0) ?? -1;
  return spaceRanges.some(([low, high]) => code >= low && code <= high);
}

/** The capture's numeric-token grammar, shared with the integrity validator. */
export const numbersIn = (text: string): string[] =>
  text.match(/\d+(?:[.,]\d+)*/gu) ?? [];
