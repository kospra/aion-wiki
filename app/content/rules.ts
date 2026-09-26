import type { Block, Figure, Inline } from './types';

/** Google Docs' near-white paragraph shading, which the author uses for notes. */
export const SOURCE_SHADE = '#f8f9fa';

export function textOf(parts: Inline[]): string {
  return parts.map((part) => part.text).join('');
}

/** True when every visible run carries the author's note shading. */
export function isShadedRuns(parts: Inline[]): boolean {
  const visible = parts.filter((part) => part.text.trim());
  return (
    visible.length > 0 &&
    visible.every((part) => part.highlight?.toLowerCase() === SOURCE_SHADE)
  );
}

/** A paragraph, or a one-item list of paragraphs, whose text is fully shaded. */
export function isShadedBlock(block: Block): boolean {
  if (block.kind === 'paragraph') return isShadedRuns(block.content);
  if (block.kind !== 'list' || block.items.length !== 1) return false;
  const [item] = block.items;
  return (
    item.length > 0 &&
    item.every(
      (child) => child.kind === 'paragraph' && isShadedRuns(child.content),
    )
  );
}

export type CalloutTone = 'warning' | 'summary' | 'tip' | 'question' | 'note';

const leadInTones: [RegExp, CalloutTone][] = [
  [/^important\b/i, 'warning'],
  [/\btldr\b/i, 'summary'],
  [/^beginner note\b/i, 'tip'],
  [/^quick faq\b/i, 'question'],
  [/^additional notes?\b/i, 'note'],
];

function leadingText(block: Block): string {
  if (block.kind === 'paragraph' || block.kind === 'heading')
    return textOf(block.content);
  if (block.kind === 'list') {
    const first = block.items[0]?.[0];
    return first ? leadingText(first) : '';
  }
  return '';
}

/** The tone a block's lead-in names: its text before the first colon, or its first three words. */
export function leadInTone(block: Block): CalloutTone | undefined {
  const text = leadingText(block).trim();
  const colon = text.indexOf(':');
  const lead =
    colon > 0 ? text.slice(0, colon) : text.split(/\s+/).slice(0, 3).join(' ');
  return leadInTones.find(([pattern]) => pattern.test(lead.trim()))?.[1];
}

/** Moves TLDR paragraphs, and headings naming TLDR with their section, to the front. */
export function orderTldrFirst(blocks: Block[]): Block[] {
  const first: Block[] = [];
  const rest: Block[] = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (
      block.kind === 'paragraph' &&
      /^\s*TLDR\b/.test(textOf(block.content))
    ) {
      first.push(block);
    } else if (
      block.kind === 'heading' &&
      /\bTLDR\b/.test(textOf(block.content))
    ) {
      first.push(block);
      while (index + 1 < blocks.length) {
        const next = blocks[index + 1];
        if (next.kind === 'heading' && next.level <= block.level) break;
        first.push(next);
        index += 1;
      }
    } else {
      rest.push(block);
    }
  }
  return first.length ? [...first, ...rest] : blocks;
}

/** Icon-sized originals (64px or less on both sides) gain nothing from the viewer. */
export function isSmallFigure(
  figure: Pick<Figure, 'width' | 'height'>,
): boolean {
  return figure.width <= 64 && figure.height <= 64;
}

const valueLinePattern =
  /^(\s*\d+%?\s+[^=]{2,60}?)(\s*=\s*)(\d[\d.]*%(?:\s*~\s*\d[\d.]*%)?)\s*$/u;

/** A "1% Damage Boost = 0.35%" line: its stat, and where the "=" and the value start. */
export function valueLine(
  parts: Inline[],
): { stat: string; equals: number; value: number } | null {
  const match = valueLinePattern.exec(textOf(parts));
  if (!match) return null;
  const equals = match[1].length;
  return { stat: match[1].trim(), equals, value: equals + match[2].length };
}

/** Splits runs at ascending offsets of their joined text, keeping each run's formatting. */
export function splitRuns(parts: Inline[], offsets: number[]): Inline[][] {
  const cuts = [...offsets].sort((a, b) => a - b);
  const pieces: Inline[][] = [...cuts, Infinity].map(() => []);
  let position = 0;
  for (const part of parts) {
    const { breakAfter, ...style } = part;
    if (!part.text) {
      pieces[cuts.filter((cut) => cut <= position).length].push(part);
      continue;
    }
    for (let offset = 0; offset < part.text.length;) {
      const piece = cuts.filter((cut) => cut <= position).length;
      const limit = piece < cuts.length ? cuts[piece] : Infinity;
      const end = Math.min(part.text.length, offset + (limit - position));
      pieces[piece].push({
        ...style,
        text: part.text.slice(offset, end),
        ...(breakAfter && end === part.text.length ? { breakAfter } : {}),
      });
      position += end - offset;
      offset = end;
    }
  }
  return pieces;
}

export type InlineTag = 'scope' | 'todo';

const tagPatterns: [RegExp, InlineTag][] = [
  [/\([^()]*\b(?:for|on) global\b[^()]*\)/giu, 'scope'],
  [/\([^()]*\bKR\b[^()]*\)/gu, 'scope'],
  [/\bnot (?:yet )?confirmed (?:yet )?(?:for|on) global\b/giu, 'scope'],
  [/\bon (?:the )?asian? servers?\b/giu, 'scope'],
  [
    /\b(?:will not be in the game|won[’']t be available) at launch\b/giu,
    'scope',
  ],
  [/^\s*\*{3}[^*]+\*{3}\s*$/gu, 'todo'],
  [/\(need values for this\)/giu, 'todo'],
];

/** The guide's own qualifier phrases and to-do notes, as tagged segments of its runs. */
export function tagPhrases(
  parts: Inline[],
): { parts: Inline[]; tag?: InlineTag }[] {
  const text = textOf(parts);
  const linked: [number, number][] = [];
  let position = 0;
  for (const part of parts) {
    if (part.href) linked.push([position, position + part.text.length]);
    position += part.text.length;
  }
  const found = tagPatterns
    .flatMap(([pattern, tag]) =>
      [...text.matchAll(pattern)].map((match) => {
        const start = match.index ?? 0;
        return { start, end: start + match[0].length, tag };
      }),
    )
    .filter(
      ({ start, end }) =>
        !linked.some(([from, to]) => from < end && start < to),
    )
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const ranges: typeof found = [];
  for (const range of found)
    if (!ranges.length || range.start >= ranges[ranges.length - 1].end)
      ranges.push(range);
  if (!ranges.length) return [{ parts }];
  const pieces = splitRuns(
    parts,
    ranges.flatMap(({ start, end }) => [start, end]),
  );
  return pieces
    .map((piece, index) => ({
      parts: piece,
      tag: index % 2 ? ranges[(index - 1) / 2].tag : undefined,
    }))
    .filter((segment) => segment.parts.length > 0);
}

const spellingVariants: [RegExp, string][] = [
  [/\berroded\b/gu, 'eroded'],
  [/\bsynch\b/gu, 'sync'],
  [/\bvailzel\b/gu, 'vaizel'],
  [/\bprimal vigore\b/gu, 'primal vigor'],
  [/\btalisra[’']s\b/gu, 'talisra'],
];

/** Lower-cases search text and folds the guide's spelling variants together. */
export function normalizeSearch(text: string): string {
  let value = text.toLocaleLowerCase();
  for (const [pattern, replacement] of spellingVariants)
    value = value.replace(pattern, replacement);
  return value;
}

/**
 * Whether text contains the query as typed or with spelling variants folded.
 * Folding alone would lose a variant typed partway, such as "errode".
 */
export function matchesSearch(text: string, query: string): boolean {
  const typed = query.trim().toLocaleLowerCase();
  return (
    text.toLocaleLowerCase().includes(typed) ||
    normalizeSearch(text).includes(normalizeSearch(typed))
  );
}

export type Segment =
  | { kind: 'block'; block: Block }
  | { kind: 'callout'; tone: CalloutTone; blocks: Block[] }
  /** `columns`: some card holds label lists, which render side by side. */
  | { kind: 'sections'; sections: Block[][]; columns: boolean }
  | { kind: 'labels'; lists: Block[] };

const maxLineLength = 160;
const maxSectionLines = 20;
const maxLabelLength = 60;
const maxLabelLines = 10;

/** Lines of short list or paragraph content, or null when it cannot sit in a card. */
function cardLines(block: Block, depth = 0): string[] | null {
  if (block.kind === 'paragraph') {
    const line = textOf(block.content).trim();
    return line.length <= maxLineLength ? [line] : null;
  }
  if (block.kind !== 'list' || depth > 2) return null;
  const lines: string[] = [];
  for (const item of block.items)
    for (const child of item) {
      const childLines = cardLines(
        child,
        child.kind === 'list' ? depth + 1 : depth,
      );
      if (!childLines) return null;
      lines.push(...childLines);
    }
  return lines;
}

function lineCount(blocks: Block[]): number | null {
  let count = 0;
  for (const block of blocks) {
    const lines = cardLines(block);
    if (!lines) return null;
    count += lines.length;
  }
  return count;
}

function startsSection(block: Block | undefined): boolean {
  return (
    block?.kind === 'heading' ||
    (block?.kind === 'group' && block.blocks[0]?.kind === 'heading')
  );
}

type Section = {
  blocks: Block[];
  level: number;
  kind: Block['kind'];
  end: number;
};

/** A heading, or a group that starts with one, followed by content short enough for a card. */
function sectionAt(blocks: Block[], start: number): Section | null {
  const first = blocks[start];
  if (first.kind === 'group') {
    const [heading, ...content] = first.blocks;
    if (heading?.kind !== 'heading' || !content.length) return null;
    const count = lineCount(content);
    if (count === null || count > maxSectionLines) return null;
    return {
      blocks: [first],
      level: heading.level,
      kind: content[0].kind,
      end: start + 1,
    };
  }
  if (first.kind !== 'heading') return null;
  const content: Block[] = [];
  let count = 0;
  let index = start + 1;
  for (; index < blocks.length; index++) {
    const block = blocks[index];
    if (startsSection(block)) break;
    if (
      content.length &&
      block.kind !== content[0].kind &&
      !isShadedBlock(block)
    )
      break;
    const lines = cardLines(block);
    if (!lines || count + lines.length > maxSectionLines) break;
    content.push(block);
    count += lines.length;
  }
  if (!content.length || isShadedBlock(content[0])) return null;
  return {
    blocks: [first, ...content],
    level: first.level,
    kind: content[0].kind,
    end: index,
  };
}

/** Three or more consecutive sections with the same level and content kind. */
function sectionRun(blocks: Block[], start: number): Section[] {
  const run: Section[] = [];
  for (let index = start; ;) {
    const section = sectionAt(blocks, index);
    if (
      !section ||
      (run.length &&
        (section.level !== run[0].level || section.kind !== run[0].kind))
    )
      break;
    run.push(section);
    index = section.end;
    if (!startsSection(blocks[index])) break;
  }
  if (run.length < 3) return [];
  // A callout after the last section speaks for the whole grid.
  const last = run[run.length - 1];
  while (
    last.blocks.length > 2 &&
    isShadedBlock(last.blocks[last.blocks.length - 1])
  ) {
    last.blocks.pop();
    last.end -= 1;
  }
  return run;
}

/** A one-item list: a short label with nested lines, such as a card, set or stat pair. */
function isLabelList(block: Block): boolean {
  if (block.kind !== 'list' || block.items.length !== 1) return false;
  const [label, ...rest] = block.items[0];
  if (label?.kind !== 'paragraph' || isShadedRuns(label.content)) return false;
  if (textOf(label.content).trim().length > maxLabelLength) return false;
  if (!rest.length || rest.some((child) => child.kind !== 'list')) return false;
  let count = 0;
  for (const child of rest) {
    const lines = cardLines(child, 1);
    if (!lines) return false;
    count += lines.length;
  }
  return count > 0 && count <= maxLabelLines;
}

/** Whether a grid card's content holds label lists, which render as columns. */
function holdsColumns(section: Block[]): boolean {
  const [first, ...rest] = section;
  const content = first.kind === 'group' ? first.blocks.slice(1) : rest;
  return planLayout(content).some((segment) => segment.kind === 'labels');
}

/**
 * Groups sibling blocks into layout segments. Blocks keep their order, so the
 * rendered DOM order still matches the order the static verifier checks.
 */
export function planLayout(
  blocks: Block[],
  options: { structure?: boolean } = {},
): Segment[] {
  const structure = options.structure ?? true;
  const segments: Segment[] = [];
  let index = 0;
  while (index < blocks.length) {
    if (structure) {
      const run = sectionRun(blocks, index);
      if (run.length) {
        segments.push({
          kind: 'sections',
          sections: run.map((section) => section.blocks),
          columns: run.some((section) => holdsColumns(section.blocks)),
        });
        index = run[run.length - 1].end;
        continue;
      }
      let end = index;
      while (end < blocks.length && isLabelList(blocks[end])) end += 1;
      if (end - index >= 2) {
        segments.push({ kind: 'labels', lists: blocks.slice(index, end) });
        index = end;
        continue;
      }
    }
    const block = blocks[index];
    if (isShadedBlock(block)) {
      const previous = blocks[index - 1];
      let end = index + 1;
      while (
        end < blocks.length &&
        isShadedBlock(blocks[end]) &&
        !leadInTone(blocks[end])
      )
        end += 1;
      const tone =
        leadInTone(block) ??
        (previous?.kind === 'heading' && leadInTone(previous) === 'summary'
          ? 'summary'
          : 'note');
      segments.push({
        kind: 'callout',
        tone,
        blocks: blocks.slice(index, end),
      });
      index = end;
      continue;
    }
    segments.push({ kind: 'block', block });
    index += 1;
  }
  return segments;
}
