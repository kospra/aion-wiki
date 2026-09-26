# New-player reading, phase 1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing articles readable for new Global players by adding content-shape rendering rules and simpler navigation, without changing any source text.

**Architecture:** A pure rules module (`app/content/rules.ts`) detects content shapes: shaded notes, TLDRs, short sections, label lists, value lines, qualifier phrases and small figures. `RichContent` turns the planned segments into callouts, card grids, value headers and inline tags, using presentational pieces in `app/components/rich-layouts.tsx`. The rest of the phase is navigation work: the contents disclosure, chapter overview pages, nested sidebar articles, chapter-aware previous/next links and search spelling variants. Every rule keys on content, never on block IDs, so it re-applies after a future Google Doc import.

**Tech Stack:** React 19, React Router 8 (static prerender), Chakra UI 3.37, TypeScript 6, Vitest 5 with jsdom, Playwright 1.63, Node 24.21.0, npm 12.1.0.

**Spec:** `docs/superpowers/specs/2026-09-25-new-player-reading-phase1-design.md`

## Global Constraints

- Sync-safe: every behavior is a rule over content (formatting, text patterns or block structure). No rule refers to a block ID, figure ID or specific article, except the three title fixes (T1).
- Source fidelity: every source character, number, highlight, link and figure placement still renders. The integrity validator and static verifier keep their guarantees. The only content-model change is formula expressions gaining inline formatting.
- No new words about the game; rules add interface labels only, such as “On this page”, “Previous chapter” and “Next chapter”.
- Existing quality bars: keyboard access, visible focus, reduced motion, readable no-JavaScript output, no horizontal page overflow at 320px, and colors, radii and type from `app/components/ui/theme.ts`.
- Code is the design source of truth; there is no Figma file. Record component and rule changes in `DESIGN.md`.
- Tests assert generic behavior with small fixtures, never article wording, game values or catalogue counts (`AGENTS.md`).
- Rendered DOM order of block IDs must equal `walkBlocks(orderTldrFirst(page.blocks))`. `scripts/verify-static.mjs` asserts this for every page.

## Environment

- Work only in `/mnt/c/code/aion-wiki/.claude/worktrees/new-player-phase1`. Its `node_modules` are Linux-native.
- Run every npm command with this prefix, shown in full in each step: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin`.
- Do not run git. The session’s worktree guard refuses git through the RTK hook. The user asked for uncommitted changes, so checkpoints replace commits.

## Review Focus

1. **Block order under layout.** Callouts, card grids and label cards must never reorder blocks, or `verify:static` fails and screen readers read out of order. Task 4 pins it with a DOM-order test over every segment kind.
2. **Tags inside formatted or linked text.** A qualifier phrase spanning bold or italic runs must keep that formatting, and linked text must never be split. Tasks 1 and 4 pin both.
3. **Narrow phones.** Card grids, value headers and inline tags must not overflow a 320px viewport. Task 9 measures overflow at 320px on every affected page.
4. **No JavaScript.** The contents disclosure is closed by default and its summary opens it natively; article text never depends on JavaScript. Task 6 pins the closed default; `verify:browser` covers no-JavaScript article reading.
5. **Ordinary searches.** Spelling folding must not change searches that contain no variant; for example “synchronize” stays “synchronize”. Tasks 1 and 8 pin it.

---

### Task 1: Content text rules

**Files:**

- Create: `app/content/rules.ts`
- Create: `tests/content-rules.test.ts`

**Interfaces:**

- Consumes: `Block`, `Figure`, `Inline` from `app/content/types.ts`.
- Produces:
  - `SOURCE_SHADE: '#f8f9fa'`
  - `textOf(parts: Inline[]): string`
  - `isShadedRuns(parts: Inline[]): boolean`
  - `isShadedBlock(block: Block): boolean`
  - `type CalloutTone = 'warning' | 'summary' | 'tip' | 'question' | 'note'`
  - `leadInTone(block: Block): CalloutTone | undefined`
  - `orderTldrFirst(blocks: Block[]): Block[]`
  - `isSmallFigure(figure: Pick<Figure, 'width' | 'height'>): boolean`
  - `valueLine(parts: Inline[]): { stat: string; equals: number; value: number } | null`
  - `splitRuns(parts: Inline[], offsets: number[]): Inline[][]`
  - `type InlineTag = 'scope' | 'todo'`
  - `tagPhrases(parts: Inline[]): { parts: Inline[]; tag?: InlineTag }[]`
  - `normalizeSearch(text: string): string`

  `rules.ts` imports only types, because `scripts/verify-static.mjs` imports it under plain Node.

- [ ] **Step 1: Write the failing tests**

Create `tests/content-rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  isShadedBlock,
  isShadedRuns,
  isSmallFigure,
  leadInTone,
  normalizeSearch,
  orderTldrFirst,
  splitRuns,
  tagPhrases,
  textOf,
  valueLine,
} from '../app/content/rules';
import type { Block, Inline } from '../app/content/types';

const shade = '#f8f9fa';
const p = (id: string, content: Inline[]): Block => ({
  id,
  sourceIds: [],
  kind: 'paragraph',
  content,
});
const text = (id: string, value: string): Block => p(id, [{ text: value }]);
const heading = (id: string, value: string, level: 2 | 3 | 4 = 3): Block => ({
  id,
  sourceIds: [],
  kind: 'heading',
  level,
  content: [{ text: value }],
});

describe('shading', () => {
  it('treats text as shaded only when every visible run carries the note shading', () => {
    expect(
      isShadedRuns([
        { text: 'Note', highlight: shade },
        { text: ' ' },
        { text: 'more', highlight: '#F8F9FA' },
      ]),
    ).toBe(true);
    expect(
      isShadedRuns([{ text: 'Note', highlight: shade }, { text: 'plain' }]),
    ).toBe(false);
    expect(isShadedRuns([{ text: 'Yellow', highlight: '#ffff00' }])).toBe(
      false,
    );
    expect(isShadedRuns([{ text: '  ' }])).toBe(false);
  });

  it('recognises shaded paragraphs and one-item lists of shaded paragraphs', () => {
    const shaded = p('a', [{ text: 'Careful', highlight: shade }]);
    expect(isShadedBlock(shaded)).toBe(true);
    expect(
      isShadedBlock({
        id: 'l',
        sourceIds: [],
        kind: 'list',
        ordered: false,
        items: [[shaded]],
      }),
    ).toBe(true);
    expect(
      isShadedBlock({
        id: 'l2',
        sourceIds: [],
        kind: 'list',
        ordered: false,
        items: [[shaded], [shaded]],
      }),
    ).toBe(false);
    expect(isShadedBlock(heading('h', 'Heading'))).toBe(false);
  });
});

describe('lead-ins', () => {
  it.each([
    ['IMPORTANT: Keep it', 'warning'],
    ['Important Note: Swap a line', 'warning'],
    ['TLDR: Short answer', 'summary'],
    ['BEGINNER NOTE: Start here', 'tip'],
    ['QUICK FAQ:', 'question'],
    ['Additional Notes: Details', 'note'],
  ] as const)('reads %s as %s', (value, tone) => {
    expect(leadInTone(text('x', value))).toBe(tone);
  });

  it('reads a list’s first item and a heading, and ignores plain openings', () => {
    expect(
      leadInTone({
        id: 'l',
        sourceIds: [],
        kind: 'list',
        ordered: false,
        items: [[text('a', 'IMPORTANT: Lost on transfer')]],
      }),
    ).toBe('warning');
    expect(leadInTone(heading('h', 'STAT VALUE TLDR'))).toBe('summary');
    expect(
      leadInTone(text('b', 'This guide is a work in progress')),
    ).toBeUndefined();
  });
});

describe('TLDR ordering', () => {
  it('moves TLDR paragraphs and TLDR heading sections to the front in order', () => {
    const blocks = [
      heading('h1', 'Intro'),
      text('a', 'Body'),
      heading('h2', 'Summary TLDR'),
      text('b', 'Rank'),
      heading('h3', 'Later', 2),
      text('c', 'TLDR: Short'),
    ];
    expect(orderTldrFirst(blocks).map((block) => block.id)).toEqual([
      'h2',
      'b',
      'c',
      'h1',
      'a',
      'h3',
    ]);
  });

  it('returns the same array when there is no TLDR', () => {
    const blocks = [text('a', 'Body')];
    expect(orderTldrFirst(blocks)).toBe(blocks);
  });
});

describe('figures and value lines', () => {
  it('treats only icon-sized originals as small', () => {
    expect(isSmallFigure({ width: 52, height: 53 })).toBe(true);
    expect(isSmallFigure({ width: 52, height: 65 })).toBe(false);
  });

  it.each([
    ['1% Damage Boost = 0.35%', '1% Damage Boost'],
    ['1% Double Chance= 0.6% ~ 0.65%', '1% Double Chance'],
    ['10 Attack = 0.17% ', '10 Attack'],
  ])('reads %s as a value line', (value, stat) => {
    const line = valueLine([{ text: value }]);
    expect(line?.stat).toBe(stat);
    const [left, equals, amount] = splitRuns(
      [{ text: value }],
      [line!.equals, line!.value],
    );
    expect(textOf(left) + textOf(equals) + textOf(amount)).toBe(value);
    expect(textOf(equals).trim()).toBe('=');
  });

  it('ignores sentences and values without a percentage', () => {
    expect(valueLine([{ text: '1500 Accuracy' }])).toBeNull();
    expect(valueLine([{ text: '1 Heroic Gear = 5 Fragments' }])).toBeNull();
    expect(
      valueLine([{ text: 'Damage is 5% = more than before, roughly' }]),
    ).toBeNull();
  });
});

describe('splitting runs', () => {
  it('keeps formatting, links and line breaks on each side of a cut', () => {
    const parts: Inline[] = [
      { text: 'Bold start', strong: true },
      { text: ' link', href: '#a', breakAfter: true },
    ];
    const [before, after] = splitRuns(parts, [4]);
    expect(before).toEqual([{ text: 'Bold', strong: true }]);
    expect(after).toEqual([
      { text: ' start', strong: true },
      { text: ' link', href: '#a', breakAfter: true },
    ]);
  });
});

describe('inline tags', () => {
  it('tags qualifiers and to-do notes without changing the text', () => {
    const parts: Inline[] = [
      { text: 'Crafted 5% (not confirmed for Global) and ' },
      { text: '(need values for this)', strong: true },
    ];
    const segments = tagPhrases(parts);
    expect(segments.map((segment) => textOf(segment.parts)).join('')).toBe(
      textOf(parts),
    );
    expect(
      segments
        .filter((segment) => segment.tag)
        .map((segment) => [segment.tag, textOf(segment.parts)]),
    ).toEqual([
      ['scope', '(not confirmed for Global)'],
      ['todo', '(need values for this)'],
    ]);
    expect(segments.at(-1)?.parts[0]).toMatchObject({ strong: true });
  });

  it('tags a qualifier that spans formatted runs as one segment', () => {
    const segments = tagPhrases([
      { text: '(The following ', emphasis: true },
      { text: 'Stat Lines', strong: true },
      { text: ' are for Global)', emphasis: true },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].tag).toBe('scope');
    expect(segments[0].parts).toHaveLength(3);
  });

  it('leaves linked and plain text untagged', () => {
    expect(tagPhrases([{ text: 'on Asia Server', href: '#x' }])).toEqual([
      { parts: [{ text: 'on Asia Server', href: '#x' }] },
    ]);
    expect(tagPhrases([{ text: 'Plain' }])).toEqual([
      { parts: [{ text: 'Plain' }] },
    ]);
  });

  it('tags a whole starred paragraph as a to-do', () => {
    expect(tagPhrases([{ text: '***ADD MORE***' }])).toEqual([
      { parts: [{ text: '***ADD MORE***' }], tag: 'todo' },
    ]);
  });
});

describe('search', () => {
  it('folds the guide’s spelling variants and leaves other words alone', () => {
    expect(normalizeSearch('Erroded Wings')).toBe('eroded wings');
    expect(normalizeSearch('Synch Stones')).toBe('sync stones');
    expect(normalizeSearch('Talisra’s Wings')).toBe('talisra wings');
    expect(normalizeSearch('Primal Vigore')).toBe('primal vigor');
    expect(normalizeSearch('Vailzel board')).toBe('vaizel board');
    expect(normalizeSearch('synchronize')).toBe('synchronize');
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/content-rules.test.ts`

Expected: FAIL, because `../app/content/rules` cannot be resolved.

- [ ] **Step 3: Implement the text rules**

Create `app/content/rules.ts`:

```ts
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
    for (let offset = 0; offset < part.text.length; ) {
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
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/content-rules.test.ts`

Expected: PASS for every test in the file.

- [ ] **Step 5: Checkpoint**

No commit. Confirm `app/content/rules.ts` has only the type import, then continue.

### Task 2: Layout planner

**Files:**

- Modify: `app/content/rules.ts` (append)
- Modify: `tests/content-rules.test.ts` (append; extend the import)

**Interfaces:**

- Consumes: `textOf`, `isShadedRuns`, `isShadedBlock`, `leadInTone` and `CalloutTone` from Task 1.
- Produces:
  - `type Segment = { kind: 'block'; block: Block } | { kind: 'callout'; tone: CalloutTone; blocks: Block[] } | { kind: 'sections'; sections: Block[][] } | { kind: 'labels'; lists: Block[] }`
  - `planLayout(blocks: Block[], options?: { structure?: boolean }): Segment[]`

  Each entry of `sections` is either `[heading, ...content]` or `[group]` for a group that starts with a heading. Concatenating all segments' blocks in order always reproduces the input order.

- [ ] **Step 1: Write the failing tests**

In `tests/content-rules.test.ts`, add `planLayout,` to the import list from `'../app/content/rules'` (keep alphabetical order, after `orderTldrFirst,`). Then append:

```ts
const list = (id: string, lines: string[]): Block => ({
  id,
  sourceIds: [],
  kind: 'list',
  ordered: false,
  items: lines.map((line, index) => [text(`${id}-${index}`, line)]),
});
const labelList = (id: string, label: string, lines: string[]): Block => ({
  id,
  sourceIds: [],
  kind: 'list',
  ordered: false,
  items: [[text(`${id}-label`, label), list(`${id}-nested`, lines)]],
});
const shaded = (id: string, value: string): Block =>
  p(id, [{ text: value, highlight: shade }]);
const kinds = (blocks: Block[]) =>
  planLayout(blocks).map((segment) => segment.kind);

describe('layout planning', () => {
  it('groups shaded blocks into callouts and starts a new one at each lead-in', () => {
    const segments = planLayout([
      text('a', 'Plain'),
      shaded('b', 'IMPORTANT: One'),
      shaded('c', 'continues'),
      shaded('d', 'Additional Notes: Two'),
    ]);
    expect(segments.map((segment) => segment.kind)).toEqual([
      'block',
      'callout',
      'callout',
    ]);
    expect(segments[1]).toMatchObject({
      tone: 'warning',
      blocks: [{ id: 'b' }, { id: 'c' }],
    });
    expect(segments[2]).toMatchObject({ tone: 'note' });
  });

  it('gives a callout after a TLDR heading the summary tone', () => {
    const segments = planLayout([
      heading('h', 'STAT VALUE TLDR'),
      shaded('a', 'A > B'),
    ]);
    expect(segments[1]).toMatchObject({ kind: 'callout', tone: 'summary' });
  });

  it('puts three or more short sections of the same shape in a grid', () => {
    const segments = planLayout([
      heading('h1', 'One'),
      list('l1', ['a', 'b']),
      heading('h2', 'Two'),
      list('l2', ['c']),
      heading('h3', 'Three'),
      list('l3', ['d']),
      shaded('n', 'Additional Notes: all'),
      text('t', 'After the grid'),
    ]);
    expect(segments.map((segment) => segment.kind)).toEqual([
      'sections',
      'callout',
      'block',
    ]);
    const [grid] = segments;
    expect(
      grid.kind === 'sections' &&
        grid.sections.map((section) => section.map((block) => block.id)),
    ).toEqual([
      ['h1', 'l1'],
      ['h2', 'l2'],
      ['h3', 'l3'],
    ]);
  });

  it('keeps two sections, or sections holding a figure, in normal flow', () => {
    expect(
      kinds([
        heading('h1', 'One'),
        list('l1', ['a']),
        heading('h2', 'Two'),
        list('l2', ['b']),
      ]),
    ).toEqual(['block', 'block', 'block', 'block']);
    const figure: Block = {
      id: 'f',
      sourceIds: [],
      kind: 'figure',
      figureId: 'figure-1',
    };
    expect(
      kinds([
        heading('h1', 'One'),
        list('l1', ['a']),
        heading('h2', 'Two'),
        figure,
        heading('h3', 'Three'),
        list('l3', ['b']),
        heading('h4', 'Four'),
        list('l4', ['c']),
      ]),
    ).toEqual(Array(8).fill('block'));
  });

  it('ends a grid at a section followed by other content', () => {
    expect(
      kinds([
        heading('h1', 'One'),
        list('l1', ['a']),
        text('x', 'A longer explanation that is not a list'),
        heading('h2', 'Two'),
        list('l2', ['b']),
        heading('h3', 'Three'),
        list('l3', ['c']),
        heading('h4', 'Four'),
        list('l4', ['d']),
      ]),
    ).toEqual(['block', 'block', 'block', 'sections']);
  });

  it('turns groups that start with a heading into grid sections', () => {
    const group = (id: string): Block => ({
      id,
      sourceIds: [],
      kind: 'group',
      blocks: [
        heading(`${id}-h`, id),
        labelList(`${id}-a`, 'Equip Effect', ['x', 'y']),
        labelList(`${id}-b`, 'Owned Effect', ['z']),
      ],
    });
    const segments = planLayout([group('g1'), group('g2'), group('g3')]);
    expect(segments).toHaveLength(1);
    expect(
      segments[0].kind === 'sections' &&
        segments[0].sections.map((section) => section[0].id),
    ).toEqual(['g1', 'g2', 'g3']);
  });

  it('puts two or more one-item label lists in a label grid', () => {
    expect(
      kinds([
        labelList('a', 'Chalice', ['Pantheon Stat', 'All Skills']),
        labelList('b', 'Parchment', ['Pantheon Stat']),
        text('t', 'After'),
      ]),
    ).toEqual(['labels', 'block']);
  });

  it('skips structure rules when asked but still groups callouts', () => {
    expect(
      planLayout(
        [
          labelList('a', 'One', ['x']),
          labelList('b', 'Two', ['y']),
          shaded('s', 'Note'),
        ],
        { structure: false },
      ).map((segment) => segment.kind),
    ).toEqual(['block', 'block', 'callout']);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/content-rules.test.ts`

Expected: FAIL, because `planLayout` is not exported.

- [ ] **Step 3: Implement the planner**

Append to `app/content/rules.ts`:

```ts
export type Segment =
  | { kind: 'block'; block: Block }
  | { kind: 'callout'; tone: CalloutTone; blocks: Block[] }
  | { kind: 'sections'; sections: Block[][] }
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
  for (let index = start; ; ) {
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
  if (!rest.length || rest.some((child) => child.kind !== 'list'))
    return false;
  let count = 0;
  for (const child of rest) {
    const lines = cardLines(child, 1);
    if (!lines) return false;
    count += lines.length;
  }
  return count > 0 && count <= maxLabelLines;
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
      segments.push({ kind: 'callout', tone, blocks: blocks.slice(index, end) });
      index = end;
      continue;
    }
    segments.push({ kind: 'block', block });
    index += 1;
  }
  return segments;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/content-rules.test.ts`

Expected: PASS for every test in the file.

- [ ] **Step 5: Checkpoint**

No commit.

### Task 3: Formula expressions carry formatting

**Files:**

- Modify: `app/content/types.ts:16`
- Modify: `app/content/reader.ts:38`
- Modify: `app/components/rich-content.tsx` (the `case 'formula':` block)
- Modify: `scripts/verify-static.mjs` (the `if (block.kind === 'formula')` block)
- Modify: `app/content/chapters/chapter-10.json`, `app/content/chapters/chapter-11.json` (via a one-off script)
- Modify: `tests/rich-content.test.tsx`, `tests/content-integrity.test.ts`
- Regenerate: `app/content/catalogue.json`

**Interfaces:**

- Produces: `Extract<Block, { kind: 'formula' }>` has `expression: Inline[]` and `explanation: Inline[]`. `blockInlineSegments(formula)` returns `[block.expression, block.explanation]`. The formula renderer omits an empty explanation.

- [ ] **Step 1: Write the failing test**

In `tests/rich-content.test.tsx`, change the formula fixture inside “shows literal formulas, notes, grouped blocks, and clickable figures” from `expression: '((A + B) × C) / D',` to `expression: [{ text: '((A + B) × C) / D' }],`. Then append:

```tsx
it('keeps formatting inside a formula and omits an empty explanation', () => {
  const blocks: Block[] = [
    {
      id: 'formula-styled',
      sourceIds: ['formula-styled'],
      kind: 'formula',
      expression: [
        { text: '(Pure × Boost) + ' },
        { text: 'Bonus', highlight: '#ffff00' },
      ],
      explanation: [],
    },
  ];
  const { container } = render(
    <RichContent blocks={blocks} figures={{}} sourceLinks={{}} />,
  );
  const pre = container.querySelector('pre');
  expect(pre).toHaveTextContent('(Pure × Boost) + Bonus');
  expect(pre?.querySelector('mark')).toHaveAttribute(
    'data-source-highlight',
    '#ffff00',
  );
  expect(container.querySelector('#formula-styled p')).toBeNull();
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/rich-content.test.tsx`

Expected: FAIL. The renderer prints the expression array as text and always renders an explanation paragraph.

- [ ] **Step 3: Change the type, reader and renderer**

In `app/content/types.ts` replace:

```ts
  | { kind: 'formula'; expression: string; explanation: Inline[] }
```

with:

```ts
  | { kind: 'formula'; expression: Inline[]; explanation: Inline[] }
```

In `app/content/reader.ts` replace:

```ts
      return [[{ text: block.expression }], block.explanation];
```

with:

```ts
      return [block.expression, block.explanation];
```

In `app/components/rich-content.tsx` replace the whole `case 'formula':` block with:

```tsx
      case 'formula':
        return (
          <Box
            as="section"
            id={block.id}
            key={block.id}
            p={{ base: '4', md: '5' }}
            layerStyle="wiki.panel"
          >
            <chakra.pre
              m="0"
              fontFamily="mono"
              fontSize="md"
              whiteSpace="pre-wrap"
              overflowWrap="anywhere"
              color="wiki.ink"
            >
              {renderInline(block.expression)}
            </chakra.pre>
            {inlineText(block.explanation).trim() ? (
              <Text
                mt="3"
                textStyle="wiki.body"
                maxW={inTable ? undefined : '65ch'}
              >
                {renderInline(block.explanation)}
              </Text>
            ) : null}
          </Box>
        );
```

- [ ] **Step 4: Migrate the five formula blocks**

Create `/tmp/claude-1000/-mnt-c-code-aion-wiki/1838fb46-3628-4ea4-a9df-ad1b820ce53a/scratchpad/migrate-formulas.mjs`:

```js
import { readFile, writeFile } from 'node:fs/promises';

const children = (block) =>
  block.kind === 'list'
    ? block.items.flat()
    : block.kind === 'table'
      ? block.rows.flat(2)
      : block.kind === 'group'
        ? block.blocks
        : [];

// Blocks whose expression was the editorial label keep their real formula in
// the explanation; every other expression becomes a single plain run.
function migrate(block) {
  if (block.kind === 'formula' && typeof block.expression === 'string') {
    if (block.expression === 'Source formula (verbatim)') {
      block.expression = block.explanation;
      block.explanation = [];
    } else {
      block.expression = [{ text: block.expression }];
    }
  }
  children(block).forEach(migrate);
}

for (const file of [
  'app/content/chapters/chapter-10.json',
  'app/content/chapters/chapter-11.json',
]) {
  const pages = JSON.parse(await readFile(file, 'utf8'));
  for (const page of pages) page.blocks.forEach(migrate);
  await writeFile(file, JSON.stringify(pages, null, 2) + '\n');
}
```

Run from the worktree root:

`PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin node /tmp/claude-1000/-mnt-c-code-aion-wiki/1838fb46-3628-4ea4-a9df-ad1b820ce53a/scratchpad/migrate-formulas.mjs`

Then run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npx prettier --write app/content/chapters/chapter-10.json app/content/chapters/chapter-11.json`

Confirm: `grep -c "Source formula (verbatim)" app/content/chapters/chapter-10.json app/content/chapters/chapter-11.json` prints `0` for both files.

- [ ] **Step 5: Update the integrity test fixtures and the static verifier**

In `tests/content-integrity.test.ts`:

- In “reads every nested block variant in document order and respects inline breaks”, change `expression: 'Attack × 2',` to `expression: [{ text: 'Attack × 2' }],`.
- In “validates formula and note source text rather than their editorial labels”, change `expression: 'Attack 150',` to `expression: [{ text: 'Attack 150' }],`.
- In the same test, change `guide.pages[0].blocks[0].expression = 'Attack';` to `guide.pages[0].blocks[0].expression = [{ text: 'Attack' }];`.

In `scripts/verify-static.mjs` replace:

```js
        if (block.kind === 'formula') {
          actual.expression = visibleText(element.querySelector('pre'));
          actual.explanation = renderedInline(element.querySelector('p'));
          hasText(element.querySelector('pre'), block.expression, block.id);
          hasText(
            element.querySelector('p'),
            inlineText(block.explanation),
            block.id,
          );
        }
```

with:

```js
        if (block.kind === 'formula') {
          actual.expression = renderedInline(element.querySelector('pre'));
          hasText(
            element.querySelector('pre'),
            inlineText(block.expression),
            block.id,
          );
          if (inlineText(block.explanation).trim()) {
            actual.explanation = renderedInline(element.querySelector('p'));
            hasText(
              element.querySelector('p'),
              inlineText(block.explanation),
              block.id,
            );
          } else {
            assert.equal(
              element.querySelector('p'),
              null,
              `${block.id}: empty formula explanation must not render`,
            );
            actual.explanation = [];
          }
        }
```

- [ ] **Step 6: Regenerate and run the focused checks**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run content:generate`

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run verify:content`

Expected: `Verified 1268 source blocks, 90 figure placements and 44 source/article pages.`

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/rich-content.test.tsx tests/content-integrity.test.ts`

Expected: PASS.

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run typecheck`

Expected: no errors.

- [ ] **Step 7: Checkpoint**

No commit. `grep -c "Source formula (verbatim)" app/content/catalogue.json` prints `0`.

### Task 4: Rich rendering for callouts, grids, value lines and tags

**Files:**

- Create: `app/components/rich-layouts.tsx`
- Modify: `app/components/rich-content.tsx` (full replacement below)
- Modify: `app/components/ui/theme.ts` (tokens and layer styles)
- Modify: `tests/rich-content.test.tsx` (three new tests)
- Modify: `README.md`, `DESIGN.md`

**Interfaces:**

- Consumes: `SOURCE_SHADE`, `planLayout`, `splitRuns`, `tagPhrases`, `valueLine`, `CalloutTone` and `InlineTag` from `rules.ts`; the formula shape from Task 3.
- Produces (in `rich-layouts.tsx`):
  - `quietShade` (a Chakra `css` object)
  - `Callout({ tone, children })`, which renders `div[role="note"][data-guide-callout=<tone>]`
  - `CardGrid({ kind: 'sections' | 'labels' | 'columns', children })`, which renders `[data-guide-grid=<kind>]`
  - `GridCard({ id?, list?, plain?, children })`, which renders `[data-guide-card]`
  - `InlineTag({ tag, children })`, which renders `span[data-guide-tag=<tag>]`
  - `ValueLine({ id, stat, equals, value })`, which renders `p#id[data-guide-value-line]`
- Theme adds colors `wiki.sourceShade`, `wiki.warning` and `wiki.tagBorder`, and layer styles `wiki.callout`, `wiki.gridCard`, `wiki.scope` and `wiki.todo`.

- [ ] **Step 1: Write the failing tests**

In `tests/rich-content.test.tsx` add `import { walkBlocks } from '../app/content/reader';` below the existing imports, then append:

```tsx
const shadedParagraph = (id: string, value: string): Block => ({
  id,
  sourceIds: [id],
  kind: 'paragraph',
  content: [{ text: value, highlight: '#f8f9fa' }],
});

it('renders the author’s note shading as a callout and keeps the source mark', () => {
  const { container } = render(
    <RichContent
      blocks={[
        shadedParagraph('n1', 'IMPORTANT: Lost on transfer'),
        shadedParagraph('n2', 'Second line'),
      ]}
      figures={{}}
      sourceLinks={{}}
    />,
  );
  const callout = screen.getByRole('note');
  expect(callout).toHaveAttribute('data-guide-callout', 'warning');
  expect(
    within(callout).getByText('IMPORTANT: Lost on transfer').closest('p'),
  ).toHaveAttribute('id', 'n1');
  expect(callout).toContainElement(container.querySelector('#n2'));
  expect(
    container.querySelectorAll('mark[data-source-highlight="#f8f9fa"]'),
  ).toHaveLength(2);
});

it('tags a qualifier in place, keeping its formatting and the paragraph text', () => {
  const { container } = render(
    <RichContent
      blocks={[
        {
          id: 'q',
          sourceIds: ['q'],
          kind: 'paragraph',
          content: [
            { text: 'Crafted 5% (not confirmed for ' },
            { text: 'Global)', strong: true },
          ],
        },
      ]}
      figures={{}}
      sourceLinks={{}}
    />,
  );
  const tag = container.querySelector('[data-guide-tag="scope"]');
  expect(tag).toHaveTextContent('(not confirmed for Global)');
  expect(tag?.querySelector('strong')).toHaveTextContent('Global)');
  expect(container.querySelector('#q')).toHaveTextContent(
    'Crafted 5% (not confirmed for Global)',
  );
});

it('lays out sections, label lists and value lines without changing block order', () => {
  const line = (id: string, value: string): Block => ({
    id,
    sourceIds: [id],
    kind: 'paragraph',
    content: [{ text: value }],
  });
  const list = (id: string, values: string[]): Block => ({
    id,
    sourceIds: [],
    kind: 'list',
    ordered: false,
    items: values.map((value, index) => [line(`${id}-${index}`, value)]),
  });
  const section = (id: string): Block[] => [
    {
      id,
      sourceIds: [id],
      kind: 'heading',
      level: 3,
      content: [{ text: `Section ${id}` }],
    },
    list(`${id}-list`, ['Short line']),
  ];
  const labelList = (id: string): Block => ({
    id,
    sourceIds: [],
    kind: 'list',
    ordered: false,
    items: [[line(`${id}-label`, `Label ${id}`), list(`${id}-nested`, ['Detail'])]],
  });
  // A paragraph ends the section grid; lists directly after a heading's list
  // belong to that heading's section, as they do in the source.
  const blocks: Block[] = [
    ...section('s1'),
    ...section('s2'),
    ...section('s3'),
    line('mid', 'Between the grids'),
    labelList('c1'),
    labelList('c2'),
    line('v', '1% Crit = 0.5%'),
  ];
  const { container } = render(
    <RichContent blocks={blocks} figures={{}} sourceLinks={{}} />,
  );
  expect(
    container.querySelectorAll(
      '[data-guide-grid="sections"] [data-guide-card]',
    ),
  ).toHaveLength(3);
  expect(
    container.querySelectorAll('[data-guide-grid="labels"] [data-guide-card]'),
  ).toHaveLength(2);
  expect(container.querySelector('#v')).toHaveAttribute(
    'data-guide-value-line',
  );
  expect(container.querySelector('#v')).toHaveTextContent('1% Crit = 0.5%');
  expect(
    [...container.querySelectorAll('[data-guide-content] [id]')].map(
      (node) => node.id,
    ),
  ).toEqual(walkBlocks(blocks).map((block) => block.id));
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/rich-content.test.tsx`

Expected: FAIL. There is no `role="note"` callout, no `data-guide-tag`, no grids and no value line.

- [ ] **Step 3: Add theme tokens and layer styles**

In `app/components/ui/theme.ts` replace:

```ts
          scrollbar: { value: '#52525B' },
```

with:

```ts
          scrollbar: { value: '#52525B' },
          // Google Docs' near-white note shading; callout edges keep it exactly.
          sourceShade: { value: '#F8F9FA' },
          warning: { value: '#FBBF24' },
          tagBorder: { value: '#3F3F46' },
```

Then replace:

```ts
          _active: { bg: 'wiki.accentSoft' },
        },
      },
    },
    recipes: {
```

with:

```ts
          _active: { bg: 'wiki.accentSoft' },
        },
      },
      'wiki.callout': {
        value: {
          bg: 'wiki.surface',
          color: 'wiki.ink',
          borderWidth: '1px',
          borderColor: 'wiki.border',
          borderInlineStartWidth: '3px',
          borderInlineStartColor: 'wiki.sourceShade',
          borderRadius: 'wiki.inset',
          px: '4',
          py: '3',
        },
      },
      'wiki.gridCard': {
        value: {
          bg: 'wiki.surface',
          borderWidth: '1px',
          borderColor: 'wiki.border',
          borderRadius: 'wiki.panel',
          p: '4',
        },
      },
      'wiki.scope': {
        value: {
          bg: 'wiki.raised',
          color: 'wiki.ink',
          borderWidth: '1px',
          borderColor: 'wiki.tagBorder',
          borderRadius: 'wiki.inset',
          px: '1',
          boxDecorationBreak: 'clone',
        },
      },
      'wiki.todo': { value: { color: 'wiki.muted', fontStyle: 'italic' } },
    },
    recipes: {
```

- [ ] **Step 4: Create the layout pieces**

Create `app/components/rich-layouts.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Box, Span, Text, chakra } from '@chakra-ui/react';
import type { CalloutTone, InlineTag as Tag } from '../content/rules';

/** Clears the author's note shading inside surfaces that already show it. */
export const quietShade = {
  '& mark[data-source-highlight="#f8f9fa"]': { bg: 'transparent' },
};

const iconPaths: Record<CalloutTone, string> = {
  warning: 'M10 3 2.5 16.5h15L10 3Zm0 5.5V12m0 2.2v.3',
  summary: 'M4 6h12M4 10h12M4 14h7',
  tip: 'M10 2.5v2M4.7 4.7l1.4 1.4m9.2-1.4-1.4 1.4M7 13.5a4 4 0 1 1 6 0V15H7v-1.5Zm1 4h4',
  question:
    'M7.6 7.6a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.4v.6m0 2.8v.2M10 17.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  note: 'M10 17.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM10 9v5m0-7.8v.3',
};

/** The author's shaded note as a quiet callout; its start edge keeps the source color. */
export function Callout({
  tone,
  children,
}: {
  tone: CalloutTone;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Box
      role="note"
      data-guide-callout={tone}
      layerStyle="wiki.callout"
      display="grid"
      gridTemplateColumns="1.25rem minmax(0, 1fr)"
      columnGap="3"
      maxW="65ch"
      css={quietShade}
    >
      <chakra.svg
        viewBox="0 0 20 20"
        w="5"
        h="5"
        mt="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        color={tone === 'warning' ? 'wiki.warning' : 'wiki.muted'}
        aria-hidden="true"
        focusable="false"
      >
        <path d={iconPaths[tone]} />
      </chakra.svg>
      <Box minW="0" spaceY="3">
        {children}
      </Box>
    </Box>
  );
}

/** Responsive grid for short sections, label cards, or columns inside a card. */
export function CardGrid({
  kind,
  children,
}: {
  kind: 'sections' | 'labels' | 'columns';
  children: ReactNode;
}): React.JSX.Element {
  const minimum =
    kind === 'columns' ? '9rem' : kind === 'labels' ? '14rem' : '12rem';
  return (
    <Box
      data-guide-grid={kind}
      display="grid"
      gap={kind === 'columns' ? '4' : '3'}
      gridTemplateColumns={{
        base: '1fr',
        sm: `repeat(auto-fill, minmax(${minimum}, 1fr))`,
      }}
    >
      {children}
    </Box>
  );
}

/** One card in a CardGrid. Label cards render as a one-item list, as in the source. */
export function GridCard({
  id,
  list = false,
  plain = false,
  children,
}: {
  id?: string;
  list?: boolean;
  plain?: boolean;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Box
      as={list ? 'ul' : 'div'}
      id={id}
      data-guide-card=""
      layerStyle={plain ? undefined : 'wiki.gridCard'}
      listStyleType="none"
      m="0"
      minW="0"
      spaceY="2"
    >
      {children}
    </Box>
  );
}

/** The guide's own qualifier or to-do words, marked in place. */
export function InlineTag({
  tag,
  children,
}: {
  tag: Tag;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Span
      data-guide-tag={tag}
      layerStyle={tag === 'scope' ? 'wiki.scope' : 'wiki.todo'}
    >
      {children}
    </Span>
  );
}

/** "1% Damage Boost = 0.35%" as a header: stat on the left, value large on the right. */
export function ValueLine({
  id,
  stat,
  equals,
  value,
}: {
  id: string;
  stat: ReactNode;
  equals: ReactNode;
  value: ReactNode;
}): React.JSX.Element {
  return (
    <Text
      id={id}
      data-guide-value-line=""
      display="flex"
      flexWrap="wrap"
      alignItems="baseline"
      columnGap="2"
      rowGap="1"
      maxW="65ch"
      pt="5"
      mt="10"
      borderTopWidth="1px"
      borderColor="wiki.border"
      fontSize="lg"
      fontWeight="semibold"
      lineHeight="1.35"
      color="wiki.ink"
    >
      <Span flex="1 1 12rem" minW="0">
        {stat}
      </Span>
      <Span color="wiki.muted" fontWeight="normal">
        {equals}
      </Span>
      <Span
        fontSize="2xl"
        fontVariantNumeric="tabular-nums"
        letterSpacing="-0.02em"
      >
        {value}
      </Span>
    </Text>
  );
}
```

- [ ] **Step 5: Replace the renderer**

Replace the whole of `app/components/rich-content.tsx` with:

```tsx
import type { ReactNode } from 'react';
import {
  Box,
  Em,
  Flex,
  Heading,
  Link,
  List,
  Mark,
  Span,
  Strong,
  Table,
  Text,
  chakra,
} from '@chakra-ui/react';
import { inlineText, normalizeSourceUrl, walkBlocks } from '../content/reader';
import {
  SOURCE_SHADE,
  planLayout,
  splitRuns,
  tagPhrases,
  valueLine,
} from '../content/rules';
import type { Block, Figure, Inline } from '../content/types';
import { AnnotationSwatch, GuideFigure } from './guide-figure';
import {
  Callout,
  CardGrid,
  GridCard,
  InlineTag,
  ValueLine,
  quietShade,
} from './rich-layouts';

type Props = {
  blocks: Block[];
  figures: Record<string, Figure>;
  sourceLinks: Record<string, string>;
};

/** Where a block renders. Table cells and cards use compact type. */
type Context = { inTable?: boolean; inCard?: boolean; inCallout?: boolean };

function formattedPart(part: Inline, key: string): ReactNode {
  let content: ReactNode = part.text;
  if (part.strong) content = <Strong>{content}</Strong>;
  if (part.emphasis) content = <Em>{content}</Em>;
  if (part.underline) content = <chakra.u>{content}</chakra.u>;
  if (part.highlight) {
    const backgroundColor =
      /^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/i.test(part.highlight)
        ? part.highlight
        : undefined;
    // The author's near-white note shading would glare on the dark theme.
    // Callouts and headings clear it; anywhere else it stays subtle.
    const shade = backgroundColor?.toLowerCase() === SOURCE_SHADE;
    content = (
      <Mark
        bg={shade ? 'wiki.raised' : backgroundColor}
        whiteSpace="normal"
        color={shade ? 'inherit' : backgroundColor ? 'black' : undefined}
        data-source-highlight={backgroundColor}
      >
        {content}
      </Mark>
    );
  }
  return (
    <Span key={key}>
      {content}
      {part.breakAfter && <br />}
    </Span>
  );
}

export function RichContent({
  blocks,
  figures,
  sourceLinks,
}: Props): React.JSX.Element {
  // Headings explained by a screenshot marker repeat its color square. The
  // heading text (or source list number) already names the marker.
  const markers = new Map<string, { label: string; color: string }[]>();
  for (const block of walkBlocks(blocks)) {
    if (block.kind !== 'figure') continue;
    for (const annotation of figures[block.figureId]?.annotations ?? []) {
      const list = markers.get(annotation.target) ?? [];
      list.push({ label: annotation.label, color: annotation.color });
      markers.set(annotation.target, list);
    }
  }

  function renderRuns(parts: Inline[], prefix: string): ReactNode[] {
    const runs: ReactNode[] = [];
    for (let index = 0; index < parts.length; ) {
      const part = parts[index];
      if (!part.href) {
        runs.push(formattedPart(part, `${prefix}${index}`));
        index += 1;
        continue;
      }
      const start = index;
      while (index < parts.length && parts[index].href === part.href)
        index += 1;
      const linkedParts = parts.slice(start, index);
      const content = linkedParts.map((linked, offset) =>
        formattedPart(linked, `${prefix}${start + offset}`),
      );
      const mappedHref = Object.hasOwn(sourceLinks, part.href)
        ? sourceLinks[part.href]
        : undefined;
      const href = normalizeSourceUrl(
        typeof mappedHref === 'string' ? mappedHref : part.href,
      );
      runs.push(
        href && linkedParts.some((linked) => linked.text.trim()) ? (
          <Link
            key={`${prefix}${start}`}
            href={href}
            display="inline"
            color="wiki.accent"
            _hover={{ color: 'wiki.accentHover' }}
            textDecoration="underline"
          >
            {content}
          </Link>
        ) : (
          <Span key={`${prefix}${start}`}>{content}</Span>
        ),
      );
    }
    return runs;
  }

  // The guide's own qualifiers and to-do notes become inline tags; text is unchanged.
  function renderInline(parts: Inline[]): ReactNode[] {
    return tagPhrases(parts).flatMap((segment, index) => {
      const runs = renderRuns(segment.parts, `${index}-`);
      return segment.tag
        ? [
            <InlineTag key={`tag-${index}`} tag={segment.tag}>
              {runs}
            </InlineTag>,
          ]
        : runs;
    });
  }

  function renderBlocks(children: Block[], context: Context = {}): ReactNode[] {
    // A callout already shows the shading, so its content is not planned again.
    if (context.inCallout)
      return children.map((child) => renderBlock(child, context));
    return planLayout(children, { structure: !context.inTable }).map(
      (segment) => {
        switch (segment.kind) {
          case 'block':
            return renderBlock(segment.block, context);
          case 'callout':
            return (
              <Callout
                key={`callout-${segment.blocks[0].id}`}
                tone={segment.tone}
              >
                {segment.blocks.map((block) =>
                  renderBlock(block, { ...context, inCallout: true }),
                )}
              </Callout>
            );
          case 'sections':
            return (
              <CardGrid
                key={`sections-${segment.sections[0][0].id}`}
                kind="sections"
              >
                {segment.sections.map((section) => {
                  const [first, ...rest] = section;
                  if (first.kind === 'group') {
                    const [heading, ...content] = first.blocks;
                    return (
                      <GridCard key={first.id} id={first.id}>
                        {renderBlock(heading, { inCard: true })}
                        {renderBlocks(content, { inCard: true })}
                      </GridCard>
                    );
                  }
                  return (
                    <GridCard key={first.id}>
                      {renderBlock(first, { inCard: true })}
                      {renderBlocks(rest, { inCard: true })}
                    </GridCard>
                  );
                })}
              </CardGrid>
            );
          case 'labels':
            return (
              <CardGrid
                key={`labels-${segment.lists[0].id}`}
                kind={context.inCard ? 'columns' : 'labels'}
              >
                {segment.lists.map((list) => {
                  if (list.kind !== 'list') return renderBlock(list, context);
                  const [label, ...rest] = list.items[0];
                  return (
                    <GridCard
                      key={list.id}
                      id={list.id}
                      list
                      plain={context.inCard}
                    >
                      <Box as="li" spaceY="2">
                        <Box fontWeight="semibold">
                          {renderBlock(label, { inCard: true })}
                        </Box>
                        {renderBlocks(rest, { inCard: true })}
                      </Box>
                    </GridCard>
                  );
                })}
              </CardGrid>
            );
        }
      },
    );
  }

  function renderBlock(block: Block, context: Context = {}): ReactNode {
    const compact = Boolean(context.inTable || context.inCard);
    switch (block.kind) {
      case 'paragraph': {
        const value =
          compact || context.inCallout ? null : valueLine(block.content);
        if (value) {
          const [stat, equals, amount] = splitRuns(block.content, [
            value.equals,
            value.value,
          ]);
          return (
            <ValueLine
              key={block.id}
              id={block.id}
              stat={renderInline(stat)}
              equals={renderInline(equals)}
              value={renderInline(amount)}
            />
          );
        }
        return (
          <Text
            id={block.id}
            key={block.id}
            textStyle={compact ? undefined : 'wiki.body'}
            fontSize={compact ? 'md' : undefined}
            lineHeight={compact ? '1.6' : undefined}
            maxW={compact || context.inCallout ? undefined : '65ch'}
          >
            {renderInline(block.content)}
          </Text>
        );
      }
      case 'heading': {
        const headingMarkers = markers.get(block.id) ?? [];
        const heading = (
          <Heading
            as={`h${block.level}` as 'h2' | 'h3' | 'h4'}
            id={block.id}
            key={block.id}
            textStyle={
              block.level === 2 && !context.inCard ? 'wiki.section' : undefined
            }
            fontSize={
              context.inCard
                ? '17px'
                : block.level === 3
                  ? '22px'
                  : block.level === 4
                    ? '19px'
                    : undefined
            }
            lineHeight="1.3"
            color="wiki.ink"
            maxW={compact ? undefined : '65ch'}
            mt={
              headingMarkers.length || context.inCard
                ? '0'
                : block.level === 2
                  ? '12'
                  : '8'
            }
            mb={headingMarkers.length ? '0' : context.inCard ? '2' : '3'}
            scrollMarginTop="6"
            css={quietShade}
          >
            {renderInline(block.content)}
          </Heading>
        );
        if (!headingMarkers.length) return heading;
        // Squares sit beside the heading, so its text stays the source's own.
        return (
          <Flex
            key={block.id}
            data-guide-heading-markers=""
            align="center"
            flexWrap="wrap"
            gap="3"
            mt={block.level === 2 ? '12' : '8'}
            mb="3"
          >
            {headingMarkers.map((marker) => (
              <AnnotationSwatch key={marker.label} color={marker.color} />
            ))}
            {heading}
          </Flex>
        );
      }
      case 'list': {
        // A shaded one-item list is the callout itself, so it drops its bullet.
        const bare = Boolean(context.inCallout) && block.items.length === 1;
        const items = block.items.map((item, index) => (
          <List.Item key={`${block.id}-item-${index}`}>
            {renderBlocks(item, context)}
          </List.Item>
        ));
        return block.ordered ? (
          <List.Root
            asChild
            key={block.id}
            listStyleType={bare ? 'none' : 'decimal'}
            ps={bare ? '0' : compact ? '5' : '6'}
            spaceY={compact ? '1' : '2'}
            maxW={compact || context.inCallout ? undefined : '65ch'}
            textStyle={compact ? undefined : 'wiki.body'}
            fontSize={compact ? 'md' : undefined}
            color="wiki.ink"
          >
            <chakra.ol
              id={block.id}
              start={block.start}
              aria-label="Numbered guide list"
            >
              {items}
            </chakra.ol>
          </List.Root>
        ) : (
          <List.Root
            as="ul"
            id={block.id}
            key={block.id}
            listStyleType={bare ? 'none' : 'disc'}
            ps={bare ? '0' : compact ? '5' : '6'}
            spaceY={compact ? '1' : '2'}
            maxW={compact || context.inCallout ? undefined : '65ch'}
            textStyle={compact ? undefined : 'wiki.body'}
            fontSize={compact ? 'md' : undefined}
            color="wiki.ink"
          >
            {items}
          </List.Root>
        );
      }
      case 'table':
        return (
          <Table.ScrollArea
            id={block.id}
            key={block.id}
            tabIndex={0}
            role="region"
            aria-label={block.caption}
            data-guide-table-scroll=""
            maxW="100%"
            borderWidth="1px"
            borderColor="wiki.border"
            borderRadius="wiki.panel"
            overflowX="auto"
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'wiki.accent',
              outlineOffset: '2px',
            }}
          >
            <Table.Root
              size="md"
              variant="line"
              minW={block.columns.length > 3 ? 'max-content' : undefined}
              tableLayout={block.columns.length === 2 ? 'fixed' : 'auto'}
              width="full"
              fontVariantNumeric="tabular-nums"
            >
              <Table.Caption
                captionSide="top"
                whiteSpace="normal"
                overflowWrap="anywhere"
                color="wiki.muted"
                textStyle="wiki.caption"
                textAlign="start"
                px="3"
                py="2"
              >
                {block.caption}
              </Table.Caption>
              <Table.Header>
                <Table.Row>
                  {block.columns.map((column, index) => (
                    <Table.ColumnHeader
                      key={index}
                      scope="col"
                      width={
                        block.columns.length === 2 && index === 0
                          ? { base: '7rem', md: '22%' }
                          : undefined
                      }
                      bg="wiki.accentSoft"
                      color="wiki.ink"
                      px="3"
                      py="3"
                      borderBottomWidth="1px"
                      borderColor="wiki.border"
                      whiteSpace="normal"
                    >
                      {renderInline(column)}
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {block.rows.map((row, rowIndex) => (
                  <Table.Row
                    key={rowIndex}
                    borderBottomWidth="1px"
                    borderColor="wiki.border"
                  >
                    {row.map((cell, cellIndex) => (
                      <Table.Cell
                        key={cellIndex}
                        verticalAlign="top"
                        px="3"
                        py="3"
                        color="wiki.ink"
                        maxW="36rem"
                        whiteSpace="normal"
                        overflowWrap="anywhere"
                      >
                        {renderBlocks(cell, { inTable: true })}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        );
      case 'formula':
        return (
          <Box
            as="section"
            id={block.id}
            key={block.id}
            p={{ base: '4', md: '5' }}
            layerStyle="wiki.panel"
          >
            <chakra.pre
              m="0"
              fontFamily="mono"
              fontSize="md"
              whiteSpace="pre-wrap"
              overflowWrap="anywhere"
              color="wiki.ink"
            >
              {renderInline(block.expression)}
            </chakra.pre>
            {inlineText(block.explanation).trim() ? (
              <Text
                mt="3"
                textStyle="wiki.body"
                maxW={compact ? undefined : '65ch'}
              >
                {renderInline(block.explanation)}
              </Text>
            ) : null}
          </Box>
        );
      case 'note':
        return (
          <Box
            as="aside"
            id={block.id}
            key={block.id}
            p={{ base: '4', md: '5' }}
            bg="wiki.surface"
            borderStartWidth="3px"
            borderColor="wiki.accentBorder"
            borderRadius="wiki.inset"
            maxW={compact ? undefined : '65ch'}
            color="wiki.ink"
          >
            <Strong>{block.label}</Strong>
            <Text mt="1" textStyle="wiki.body">
              {renderInline(block.content)}
            </Text>
          </Box>
        );
      case 'figure': {
        const figure = figures[block.figureId];
        if (!figure)
          return (
            <Text id={block.id} key={block.id}>
              Image unavailable: {block.figureId}
            </Text>
          );
        return (
          <Box id={block.id} key={block.id} maxW="100%">
            <GuideFigure figure={figure} />
          </Box>
        );
      }
      case 'group': {
        const [first, middle, last] = block.blocks;
        // The source places "result ⬅️ ingredients" screenshots side by side.
        const arrowPair =
          block.blocks.length === 3 &&
          first.kind === 'figure' &&
          last.kind === 'figure' &&
          middle.kind === 'paragraph' &&
          /^\s*(?:⬅️|⬅|←)\s*$/u.test(inlineText(middle.content));
        if (arrowPair)
          return (
            <Flex
              id={block.id}
              key={block.id}
              data-guide-figure-pair=""
              direction={{ base: 'column', md: 'row' }}
              align="center"
              gap={{ base: '0', md: '4' }}
            >
              {block.blocks.map((child, index) =>
                index === 1 ? (
                  <Box
                    key={child.id}
                    flexShrink="0"
                    fontSize="2xl"
                    transform={{ base: 'rotate(90deg)', md: 'none' }}
                  >
                    {renderBlock(child, context)}
                  </Box>
                ) : (
                  <Box key={child.id} flex="1 1 0" minW="0" maxW="100%">
                    {renderBlock(child, context)}
                  </Box>
                ),
              )}
            </Flex>
          );
        return (
          <Box id={block.id} key={block.id} spaceY={{ base: '5', md: '6' }}>
            {renderBlocks(block.blocks, context)}
          </Box>
        );
      }
    }
  }

  return (
    <Box
      data-guide-content=""
      spaceY={{ base: '5', md: '6' }}
      minW="0"
      overflowWrap="anywhere"
      color="wiki.ink"
    >
      {renderBlocks(blocks)}
    </Box>
  );
}
```

- [ ] **Step 6: Run the rendering tests**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/rich-content.test.tsx tests/guide-figure.test.tsx tests/content-rules.test.ts`

Expected: PASS, including every pre-existing test in those files.

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run typecheck && PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run lint`

Expected: no errors or warnings.

- [ ] **Step 7: Document the highlight rule and the renderer**

In `README.md` replace this sentence:

```text
Source highlight colors are never replaced by theme accents.
```

with:

```text
Yellow and other source highlights keep their exact captured colors. The author's near-white `#f8f9fa` note shading renders as a callout whose start edge keeps that exact color, instead of a white bar on the dark theme.
```

In `README.md` replace this sentence:

```text
Source highlights retain their exact captured colors and readable text; they are content rather than theme tokens.
```

with:

```text
Source highlights stay in the DOM as `mark` elements carrying their exact captured color in `data-source-highlight`; they are content rather than theme tokens.
```

In `DESIGN.md` replace this sentence:

```text
Teal marks navigation and interactions; source highlight colors remain exact content with black foregrounds.
```

with:

```text
Teal marks navigation and interactions. Yellow source highlights remain exact content with black foregrounds. The author's near-white `#f8f9fa` note shading renders as a callout (`wiki.callout`): charcoal surface, body text in `wiki.ink`, and a 3px start edge in the exact `wiki.sourceShade`. Warning icons use `wiki.warning`; qualifier tags use `wiki.tagBorder`.
```

In `DESIGN.md`, after the bullet that starts `` - `GuidePageView`, `ArticleContents`, `RichContent`, and `GuideFigure` retain ``, add this bullet:

```markdown
- `RichContent` applies the content rules in `app/content/rules.ts`. Fully shaded notes become `Callout`s whose icon follows the author's lead-in (IMPORTANT, TLDR, BEGINNER NOTE, QUICK FAQ, Additional Notes). Three or more short sections of the same shape become a `CardGrid` of `GridCard`s. Two or more one-item label lists become label cards, or columns inside a card. Whole-paragraph "1% X = Y%" lines become `ValueLine` headers. The guide's own qualifier phrases and to-do notes become `InlineTag`s. Rules key on content, never on block IDs, so they re-apply after a Google Doc import, and layouts never reorder blocks.
```

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npx prettier --check README.md DESIGN.md`

Expected: `All matched files use Prettier code style!` If not, run the same command with `--write` and re-read the result.

- [ ] **Step 8: Checkpoint**

No commit.

### Task 5: Article pages with TLDR first, small figures and chapter-aware previous/next

**Files:**

- Modify: `app/routes/article.tsx`
- Modify: `app/components/guide-figure.tsx`
- Modify: `scripts/verify-static.mjs`
- Create: `tests/article-page.test.tsx`
- Modify: `tests/guide-figure.test.tsx`
- Modify: `DESIGN.md`

**Interfaces:**

- Consumes: `orderTldrFirst` and `isSmallFigure` from Task 1; `normalizeSourceUrl` from `app/content/reader.ts`.
- Produces: `GuidePageView` passes `orderTldrFirst(page.blocks)` to both `ArticleContents` and `RichContent`. `verify-static` expects `walkBlocks(orderTldrFirst(page.blocks))` as the DOM order.

- [ ] **Step 1: Write the failing tests**

Create `tests/article-page.test.tsx`:

```tsx
import { render, screen } from './render';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { GuidePageView } from '../app/routes/article';
import type { GuidePage } from '../app/content/types';

vi.mock('../app/content/wiki', () => {
  const entry = (slug: string, title: string, category: string) => ({
    slug,
    title,
    category,
    summary: '',
    status: 'source-backed',
    sourceUrl: '',
    searchText: '',
    headings: [],
  });
  return {
    categories: [
      { slug: 'gear', title: 'Gear', description: '' },
      { slug: 'skills', title: 'Skills', description: '' },
    ],
    articles: [
      entry('weapons', 'Weapons', 'gear'),
      entry('armor', 'Armor', 'gear'),
      entry('active', 'Active skills', 'skills'),
    ],
  };
});
vi.mock('../app/content/repository', () => ({
  figureById: {},
  sourceLinks: {},
  getPage: () => undefined,
  pagePath: (slug: string) => `/articles/${slug}`,
}));

const page: GuidePage = {
  slug: 'armor',
  title: 'Armor',
  category: 'gear',
  summary: 'Armor summary',
  status: 'source-backed',
  sourceUrl: 'https://example.com/guide',
  blocks: [
    {
      id: 'body',
      sourceIds: ['body'],
      kind: 'paragraph',
      content: [{ text: 'Slots and stats' }],
    },
    {
      id: 'tldr',
      sourceIds: ['tldr'],
      kind: 'paragraph',
      content: [{ text: 'TLDR: Defensive', highlight: '#f8f9fa' }],
    },
  ],
};

it('shows the author’s TLDR first and labels a link into another chapter', () => {
  const { container } = render(
    <MemoryRouter>
      <GuidePageView page={page} />
    </MemoryRouter>,
  );
  expect(
    [...container.querySelectorAll('[data-guide-content] [id]')].map(
      (node) => node.id,
    ),
  ).toEqual(['tldr', 'body']);
  expect(
    screen.getByRole('link', { name: /Next chapter · Skills/ }),
  ).toHaveAttribute('href', '/articles/active');
  expect(
    screen.getByRole('link', { name: /Previous: Weapons/ }),
  ).not.toHaveTextContent('Previous chapter');
});
```

Append to `tests/guide-figure.test.tsx`:

```tsx
it('renders an icon-sized original as a plain image without the viewer', () => {
  const icon: Figure = {
    ...figure,
    id: 'figure-icon',
    width: 52,
    height: 53,
    alt: 'Slot icon',
  };
  const { container } = render(<GuideFigure figure={icon} />);
  const image = screen.getByRole('img', { name: 'Slot icon' });
  expect(image).toHaveAttribute('data-guide-primary-image');
  expect(image).toHaveAttribute('width', '52');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(container.querySelector('figure#figure-icon')).toContainElement(
    image,
  );
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/article-page.test.tsx tests/guide-figure.test.tsx`

Expected: FAIL. The order is `['body', 'tldr']`, there is no “Next chapter” label, and the icon renders inside a viewer button.

- [ ] **Step 3: Implement TLDR ordering and chapter labels**

In `app/routes/article.tsx`:

- Add `import { useMemo } from 'react';` as the first import.
- Add `import { orderTldrFirst } from '../content/rules';` after the `repository` import.
- In `GuidePageView`, after `const next = index >= 0 ? articles[index + 1] : undefined;` add:

```tsx
  const blocks = useMemo(() => orderTldrFirst(page.blocks), [page.blocks]);
  const chapterTitle = (slug: string | null) =>
    categories.find((item) => item.slug === slug)?.title;
```

- Replace `<ArticleContents blocks={page.blocks} />` with `<ArticleContents blocks={blocks} />`.
- In the `RichContent` element, replace `blocks={page.blocks}` with `blocks={blocks}`.
- Replace the previous link element:

```tsx
              <Link
                asChild
                color="wiki.ink"
                borderWidth="1px"
                borderColor="wiki.border"
                borderRadius="wiki.control"
                minH="11"
                px="4"
                py="2"
                _hover={{ color: 'wiki.accentHover' }}
                fontWeight="medium"
              >
                <RouterLink to={pagePath(previous.slug)} rel="prev">
                  ← Previous: {previous.title}
                </RouterLink>
              </Link>
```

with:

```tsx
              <Link
                asChild
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
                color="wiki.ink"
                borderWidth="1px"
                borderColor="wiki.border"
                borderRadius="wiki.control"
                minH="11"
                px="4"
                py="2"
                _hover={{ color: 'wiki.accentHover' }}
                fontWeight="medium"
              >
                <RouterLink to={pagePath(previous.slug)} rel="prev">
                  {previous.category !== page.category && (
                    <Text
                      as="span"
                      display="block"
                      textStyle="wiki.caption"
                      color="wiki.muted"
                      fontWeight="normal"
                    >
                      Previous chapter · {chapterTitle(previous.category)}
                    </Text>
                  )}{' '}
                  ← Previous: {previous.title}
                </RouterLink>
              </Link>
```

- Replace the next link element:

```tsx
              <Link
                asChild
                color="wiki.ink"
                borderWidth="1px"
                borderColor="wiki.border"
                borderRadius="wiki.control"
                minH="11"
                px="4"
                py="2"
                _hover={{ color: 'wiki.accentHover' }}
                fontWeight="medium"
                textAlign={{ sm: 'right' }}
              >
                <RouterLink to={pagePath(next.slug)} rel="next">
                  Next: {next.title} →
                </RouterLink>
              </Link>
```

with:

```tsx
              <Link
                asChild
                display="flex"
                flexDirection="column"
                alignItems={{ base: 'flex-start', sm: 'flex-end' }}
                color="wiki.ink"
                borderWidth="1px"
                borderColor="wiki.border"
                borderRadius="wiki.control"
                minH="11"
                px="4"
                py="2"
                _hover={{ color: 'wiki.accentHover' }}
                fontWeight="medium"
                textAlign={{ sm: 'right' }}
              >
                <RouterLink to={pagePath(next.slug)} rel="next">
                  {next.category !== page.category && (
                    <Text
                      as="span"
                      display="block"
                      textStyle="wiki.caption"
                      color="wiki.muted"
                      fontWeight="normal"
                    >
                      Next chapter · {chapterTitle(next.category)}
                    </Text>
                  )}{' '}
                  Next: {next.title} →
                </RouterLink>
              </Link>
```

- [ ] **Step 4: Render small figures without the viewer**

In `app/components/guide-figure.tsx` replace the import lines:

```tsx
import { Badge, Box, Flex, Link, List, chakra } from '@chakra-ui/react';
import type { Figure } from '../content/types';
import { ImageViewer } from './image-viewer';
```

with:

```tsx
import {
  Badge,
  Box,
  Flex,
  Image,
  Link,
  List,
  Text,
  chakra,
} from '@chakra-ui/react';
import { normalizeSourceUrl } from '../content/reader';
import { isSmallFigure } from '../content/rules';
import type { Figure } from '../content/types';
import { ImageViewer } from './image-viewer';
```

Then replace:

```tsx
  const annotations = figure.annotations ?? [];
  return (
    <chakra.figure
      id={figure.id}
      data-guide-figure=""
      my={{ base: '6', md: '8' }}
      maxW="100%"
      minW="0"
    >
      <ImageViewer figure={figure} />
```

with:

```tsx
  const annotations = figure.annotations ?? [];
  const small = isSmallFigure(figure);
  const smallSrc = small ? normalizeSourceUrl(figure.src) : null;
  return (
    <chakra.figure
      id={figure.id}
      data-guide-figure=""
      my={small ? '2' : { base: '6', md: '8' }}
      maxW="100%"
      minW="0"
    >
      {!small ? (
        <ImageViewer figure={figure} />
      ) : smallSrc ? (
        <Image
          data-guide-primary-image=""
          src={smallSrc}
          alt={figure.alt}
          htmlWidth={figure.width}
          htmlHeight={figure.height}
          loading="lazy"
          display="block"
          borderRadius="wiki.inset"
        />
      ) : (
        <Text>Image unavailable: {figure.alt}</Text>
      )}
```

- [ ] **Step 5: Teach the static verifier the TLDR order**

In `scripts/verify-static.mjs` add `import { orderTldrFirst } from '../app/content/rules.ts';` after the `reader.ts` import. Then replace:

```js
      const expectedOrder = walkBlocks(page.blocks).map((block) => block.id);
```

with:

```js
      // Articles show the author's TLDR first (app/content/rules.ts).
      const expectedOrder = walkBlocks(orderTldrFirst(page.blocks)).map(
        (block) => block.id,
      );
```

- [ ] **Step 6: Run the tests, then a full build**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/article-page.test.tsx tests/guide-figure.test.tsx`

Expected: PASS.

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run build`

Expected: the build finishes and `verify:static` prints `Verified static guide: {"routes":57,...}`. This run also exercises the Task 3 formula checks.

- [ ] **Step 7: Document**

In `DESIGN.md`, after the bullet that starts `- Article headers show the chapter eyebrow`, add:

```markdown
- Articles show the author's TLDR first: `orderTldrFirst` moves TLDR paragraphs, and any heading naming TLDR with its section, directly under the header. The static verifier expects that order. Previous/next links name the chapter when they cross into another one.
```

At the end of the bullet that starts `` - `ImageViewer` remains a clickable image ``, append: ` Figures of 64px or less on both sides render as plain images without the viewer.`

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npx prettier --check DESIGN.md`

- [ ] **Step 8: Checkpoint**

No commit.

### Task 6: Contents disclosure

**Files:**

- Modify: `app/components/article-contents.tsx` (full replacement below)
- Modify: `tests/article-contents.test.tsx`
- Modify: `DESIGN.md`

**Interfaces:**

- Consumes: `valueLine` from Task 1.
- Produces: `ArticleContents({ blocks })` renders `nav[aria-label="On this page"]` holding a `details` element. Its summary reads “On this page · N”. The disclosure opens automatically while `(min-width: 80em)` matches. The component returns `null` when there is at most one entry. Entries are headings, plus value lines at level 4.

- [ ] **Step 1: Write the failing tests**

In `tests/article-contents.test.tsx`:

- Change the first import line to `import { fireEvent, waitFor, within } from '@testing-library/react';`.
- Replace `afterEach(() => vi.restoreAllMocks());` with:

```tsx
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
```

Then append:

```tsx
it('hides the contents box when it would list one entry', () => {
  render(<ArticleContents blocks={[blocks[0]]} />);
  expect(
    screen.queryByRole('navigation', { name: 'On this page' }),
  ).not.toBeInTheDocument();
});

it('lists value lines under their heading in a closed disclosure by default', () => {
  const withValue: Block[] = [
    blocks[0],
    {
      id: 'value',
      sourceIds: [],
      kind: 'paragraph',
      content: [{ text: '1% Crit = 0.5%' }],
    },
    blocks[2],
  ];
  render(<ArticleContents blocks={withValue} />);
  const nav = screen.getByRole('navigation', { name: 'On this page' });
  expect(nav.querySelector('details')).not.toHaveAttribute('open');
  expect(within(nav).getByText('On this page · 3')).toBeInTheDocument();
  expect(
    within(nav).getByRole('link', { name: '1% Crit' }).closest('ul')
      ?.parentElement,
  ).toHaveTextContent('Overview');
});

it('opens the disclosure on wide screens', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  render(<ArticleContents blocks={blocks} />);
  await waitFor(() =>
    expect(
      screen
        .getByRole('navigation', { name: 'On this page' })
        .querySelector('details'),
    ).toHaveAttribute('open'),
  );
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/article-contents.test.tsx`

Expected: FAIL. The box still renders with one entry, and there is no `details` or value-line entry.

- [ ] **Step 3: Replace the component**

Replace the whole of `app/components/article-contents.tsx` with:

```tsx
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Box, Link, Text, chakra } from '@chakra-ui/react';
import { inlineText, walkBlocks } from '../content/reader';
import { valueLine } from '../content/rules';
import type { Block } from '../content/types';

type HeadingItem = {
  id: string;
  title: string;
  level: number;
  children: HeadingItem[];
};

/** Chakra's `xl` breakpoint, where the contents box becomes the sticky rail. */
const wideScreen = '(min-width: 80em)';

function useWideScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const query = window.matchMedia(wideScreen);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia(wideScreen).matches,
    () => false,
  );
}

export function ArticleContents({
  blocks,
}: {
  blocks: Block[];
}): React.JSX.Element | null {
  const headings = useMemo(
    () =>
      walkBlocks(blocks).flatMap((block): HeadingItem[] => {
        if (block.kind === 'heading')
          return [
            {
              id: block.id,
              title: inlineText(block.content),
              level: block.level,
              children: [],
            },
          ];
        const value =
          block.kind === 'paragraph' ? valueLine(block.content) : null;
        return value
          ? [{ id: block.id, title: value.stat, level: 4, children: [] }]
          : [];
      }),
    [blocks],
  );
  const [activeId, setActiveId] = useState<string>();
  const wide = useWideScreen();
  const [toggled, setToggled] = useState<boolean>();
  const open = toggled ?? wide;

  useEffect(() => {
    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: HTMLElement | undefined = elements[0];
      // Anchors land 24px from the top; allow a little rounding tolerance.
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= 32) current = element;
        else break;
      }
      if (
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2
      ) {
        current = elements.at(-1);
      }
      setActiveId(current?.id);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(schedule);
    observer?.observe(document.body);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      observer?.disconnect();
    };
  }, [headings]);
  if (headings.length <= 1) return null;

  const roots: HeadingItem[] = [];
  const ancestors: HeadingItem[] = [];
  for (const sourceHeading of headings) {
    const heading: HeadingItem = { ...sourceHeading, children: [] };
    while (
      ancestors.length &&
      ancestors[ancestors.length - 1].level >= heading.level
    )
      ancestors.pop();
    (ancestors.at(-1)?.children ?? roots).push(heading);
    ancestors.push(heading);
  }

  function renderItems(
    items: HeadingItem[],
    nested = false,
  ): React.JSX.Element {
    return (
      <Box as="ul" listStyleType="none" m="0" ps={nested ? '4' : '0'}>
        {items.map((item) => (
          <Box as="li" key={item.id}>
            <Link
              href={`#${item.id}`}
              display="flex"
              alignItems="center"
              minH="11"
              py="2"
              px="3"
              borderWidth="1px"
              borderRadius="wiki.control"
              borderColor={
                activeId === item.id ? 'wiki.accentBorder' : 'transparent'
              }
              bg={activeId === item.id ? 'wiki.accentSoft' : 'transparent'}
              fontWeight={activeId === item.id ? 'semibold' : 'normal'}
              aria-current={activeId === item.id ? 'location' : undefined}
              textStyle="wiki.caption"
              lineHeight="1.5"
              color={activeId === item.id ? 'wiki.accent' : 'wiki.muted'}
              overflowWrap="anywhere"
              _hover={{
                color: 'wiki.accent',
                bg: 'wiki.raised',
                textDecoration: 'none',
              }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'wiki.accent',
                outlineOffset: '2px',
              }}
            >
              {item.title}
            </Link>
            {item.children.length > 0 && renderItems(item.children, true)}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      as="nav"
      aria-label="On this page"
      my={{ base: '7', xl: '0' }}
      p="4"
      layerStyle="wiki.panel"
      minW="0"
    >
      <chakra.details
        open={open}
        onToggle={(event) => setToggled(event.currentTarget.open)}
      >
        <chakra.summary
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap="3"
          minH="11"
          px="1"
          cursor="pointer"
          listStyleType="none"
          color="wiki.accent"
          borderRadius="wiki.control"
          css={{ '&::-webkit-details-marker': { display: 'none' } }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'wiki.accent',
            outlineOffset: '2px',
          }}
        >
          <Text
            as="span"
            textStyle="wiki.eyebrow"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            On this page · {headings.length}
          </Text>
          <Box
            as="span"
            aria-hidden="true"
            fontSize="xs"
            transition="transform 120ms ease"
            transform={open ? 'rotate(180deg)' : undefined}
            _motionReduce={{ transition: 'none' }}
          >
            ▾
          </Box>
        </chakra.summary>
        <Box mt="2">{renderItems(roots)}</Box>
      </chakra.details>
    </Box>
  );
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/article-contents.test.tsx tests/rich-content.test.tsx tests/article-page.test.tsx`

Expected: PASS. This includes the existing scroll-tracking test and the rich-content contents test, whose links stay reachable inside the closed disclosure under jsdom.

- [ ] **Step 5: Document**

In `DESIGN.md` replace this text:

```text
mobile uses chapter rows and inline article contents.
```

with:

```text
mobile uses chapter rows. The article contents box is a native `details` disclosure, "On this page · N": closed by default, opened as the sticky rail from `xl`, and hidden when it would list one entry.
```

Then replace:

```text
Contents are generated from actual headings, with full-row active styling.
```

with:

```text
Contents list actual headings and value lines, with full-row active styling.
```

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npx prettier --check DESIGN.md`

- [ ] **Step 6: Checkpoint**

No commit.

### Task 7: Chapter overview pages, cleaner cards and sidebar articles

**Files:**

- Modify: `app/routes/category.tsx` (full replacement below)
- Modify: `app/components/article-card.tsx`
- Modify: `app/components/chapter-navigation.tsx`
- Create: `tests/chapter-pages.test.tsx`
- Modify: `DESIGN.md`

**Interfaces:**

- Consumes: `articles` and `categories` from `app/content/wiki.ts`.
- Produces:
  - `CategoryRoute` renders `ol[aria-label="Articles in this chapter"]` with one link per article, plus `nav[aria-label="Chapter navigation"]` with previous and next chapter links.
  - `ChapterList({ showArticles?: boolean })` lists the active chapter's articles under its row when `showArticles` is set, with the current article marked `aria-current="page"`.
  - `ChapterNavigation` passes `showArticles`.

- [ ] **Step 1: Write the failing tests**

Create `tests/chapter-pages.test.tsx`:

```tsx
import { render, screen, within } from './render';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import CategoryRoute from '../app/routes/category';
import { ChapterList } from '../app/components/chapter-navigation';

vi.mock('../app/content/wiki', () => ({
  categories: [
    { slug: 'gear', title: 'Gear', description: 'Gear chapter' },
    { slug: 'skills', title: 'Skills', description: 'Skills chapter' },
  ],
  articles: [
    {
      slug: 'weapons',
      title: 'Weapons',
      category: 'gear',
      summary: 'Weapon summary',
      status: 'source-backed',
    },
    {
      slug: 'armor',
      title: 'Armor',
      category: 'gear',
      summary: 'Armor summary',
      status: 'source-backed',
    },
    {
      slug: 'active',
      title: 'Active skills',
      category: 'skills',
      summary: 'Skill summary',
      status: 'source-backed',
    },
  ],
}));

it('shows a chapter as an ordered overview without search', () => {
  render(
    <MemoryRouter initialEntries={['/categories/gear']}>
      <Routes>
        <Route path="/categories/:slug" element={<CategoryRoute />} />
      </Routes>
    </MemoryRouter>,
  );
  const list = screen.getByRole('list', { name: 'Articles in this chapter' });
  expect(
    within(list)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href')),
  ).toEqual(['/articles/weapons', '/articles/armor']);
  expect(within(list).getByText('Armor summary')).toBeVisible();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Next chapter/ })).toHaveAttribute(
    'href',
    '/categories/skills',
  );
});

it('lists the current chapter’s articles under its row and marks the current one', () => {
  render(
    <MemoryRouter initialEntries={['/articles/armor']}>
      <ChapterList showArticles />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Armor' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('link', { name: 'Weapons' })).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'Active skills' }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/chapter-pages.test.tsx`

Expected: FAIL. The chapter page has a search box and no named list, and `ChapterList` has no article links.

- [ ] **Step 3: Replace the chapter route**

Replace the whole of `app/routes/category.tsx` with:

```tsx
import {
  Box,
  Breadcrumb,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink, useParams } from 'react-router';
import { NotFound } from '../components/not-found';
import { articles, categories } from '../content/wiki';

export function meta({ params }: { params: { slug?: string } }) {
  const category = categories.find(({ slug }) => slug === params.slug);
  return category
    ? [
        { title: `${category.title} | Aion 2 Wiki` },
        { name: 'description', content: category.description },
      ]
    : [{ title: 'Page not found | Aion 2 Wiki' }];
}

const number = (position: number) => String(position + 1).padStart(2, '0');

export default function CategoryRoute(): React.JSX.Element {
  const { slug } = useParams();
  const category = categories.find((item) => item.slug === slug);

  if (!category) return <NotFound />;
  const index = categories.indexOf(category);
  const previous = categories[index - 1];
  const next = categories[index + 1];
  const chapterArticles = articles.filter(
    (article) => article.category === category.slug,
  );

  return (
    <Stack gap={{ base: '8', md: '10' }} maxW="44rem">
      <Breadcrumb.Root
        aria-label="Breadcrumb"
        color="wiki.muted"
        textStyle="wiki.caption"
      >
        <Breadcrumb.List flexWrap="wrap">
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild color="wiki.accent">
              <RouterLink to="/">Discover</RouterLink>
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink color="wiki.ink">
              {category.title}
            </Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
      <Box as="header">
        <Stack gap="3">
          <Text textStyle="wiki.label" color="wiki.accent">
            Chapter {number(index)}
          </Text>
          <Heading as="h1" textStyle="wiki.title" color="wiki.ink">
            {category.title}
          </Heading>
          <Text textStyle="wiki.body" color="wiki.muted">
            {category.description}
          </Text>
        </Stack>
      </Box>
      <Box
        as="ol"
        aria-label="Articles in this chapter"
        listStyleType="none"
        m="0"
        p="0"
      >
        {chapterArticles.map((article, position) => (
          <Box
            as="li"
            key={article.slug}
            display="grid"
            gridTemplateColumns="2.5rem minmax(0, 1fr)"
            columnGap="3"
            py="4"
            borderTopWidth="1px"
            borderColor="wiki.border"
          >
            <Text
              as="span"
              color="wiki.muted"
              fontSize="sm"
              fontVariantNumeric="tabular-nums"
              pt="1"
            >
              {number(position)}
            </Text>
            <Stack gap="1" minW="0">
              <Link
                asChild
                color="wiki.ink"
                fontSize="lg"
                fontWeight="semibold"
                lineHeight="1.35"
                _hover={{ color: 'wiki.accentHover' }}
              >
                <RouterLink to={`/articles/${article.slug}`}>
                  {article.title}
                </RouterLink>
              </Link>
              <Text textStyle="wiki.caption" color="wiki.muted">
                {article.summary}
              </Text>
            </Stack>
          </Box>
        ))}
      </Box>
      {(previous || next) && (
        <Flex
          as="nav"
          aria-label="Chapter navigation"
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          gap="4"
          pt="6"
          borderTopWidth="1px"
          borderColor="wiki.border"
        >
          {previous ? (
            <Link
              asChild
              display="flex"
              flexDirection="column"
              alignItems="flex-start"
              color="wiki.ink"
              borderWidth="1px"
              borderColor="wiki.border"
              borderRadius="wiki.control"
              minH="11"
              px="4"
              py="2"
              fontWeight="medium"
              _hover={{ color: 'wiki.accentHover' }}
            >
              <RouterLink to={`/categories/${previous.slug}`} rel="prev">
                <Text
                  as="span"
                  textStyle="wiki.caption"
                  color="wiki.muted"
                  fontWeight="normal"
                >
                  Previous chapter
                </Text>{' '}
                ← {number(index - 1)} {previous.title}
              </RouterLink>
            </Link>
          ) : (
            <Box />
          )}
          {next && (
            <Link
              asChild
              display="flex"
              flexDirection="column"
              alignItems={{ base: 'flex-start', sm: 'flex-end' }}
              color="wiki.ink"
              borderWidth="1px"
              borderColor="wiki.border"
              borderRadius="wiki.control"
              minH="11"
              px="4"
              py="2"
              fontWeight="medium"
              textAlign={{ sm: 'right' }}
              _hover={{ color: 'wiki.accentHover' }}
            >
              <RouterLink to={`/categories/${next.slug}`} rel="next">
                <Text
                  as="span"
                  textStyle="wiki.caption"
                  color="wiki.muted"
                  fontWeight="normal"
                >
                  Next chapter
                </Text>{' '}
                {number(index + 1)} {next.title} →
              </RouterLink>
            </Link>
          )}
        </Flex>
      )}
    </Stack>
  );
}
```

- [ ] **Step 4: Simplify the article card**

In `app/components/article-card.tsx` replace the import `import { Box, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react';` with `import { Box, Heading, Link, Stack, Text } from '@chakra-ui/react';`. Then replace:

```tsx
            <Flex align="start" justify="space-between" gap="4">
              <Text textStyle="wiki.label" color="wiki.muted">
                {category?.title}
              </Text>
              <Text as="span" aria-hidden="true" color="wiki.accent">
                ↗
              </Text>
            </Flex>
```

with:

```tsx
            <Text textStyle="wiki.label" color="wiki.muted">
              {category?.title}
            </Text>
```

and replace:

```tsx
            <Text textStyle="wiki.caption" color="wiki.muted" mt="1">
              {article.status === 'source-pending'
                ? 'Source pending'
                : 'From Kanon’s guide'}
            </Text>
```

with:

```tsx
            {article.status === 'source-pending' && (
              <Text textStyle="wiki.caption" color="wiki.muted" mt="1">
                Not written yet
              </Text>
            )}
```

- [ ] **Step 5: List the current chapter's articles in the sidebar**

In `app/components/chapter-navigation.tsx` replace:

```tsx
export function ChapterList(): React.JSX.Element {
```

with:

```tsx
export function ChapterList({
  showArticles = false,
}: {
  showArticles?: boolean;
}): React.JSX.Element {
```

Then replace:

```tsx
                <Text as="span" minW="0">
                  {category.title}
                </Text>
              </RouterLink>
            </Link>
          </Box>
```

with:

```tsx
                <Text as="span" minW="0">
                  {category.title}
                </Text>
              </RouterLink>
            </Link>
            {showArticles && active && (
              <Box
                as="ul"
                listStyleType="none"
                m="0"
                mt="1"
                ms="9"
                ps="2"
                borderStartWidth="1px"
                borderColor="wiki.border"
              >
                {articles
                  .filter((article) => article.category === category.slug)
                  .map((article) => {
                    const isCurrent = pathname === `/articles/${article.slug}`;
                    return (
                      <Box as="li" key={article.slug}>
                        <Link
                          asChild
                          display="flex"
                          alignItems="center"
                          minH="11"
                          px="2"
                          py="1"
                          fontSize="0.8125rem"
                          lineHeight="1.45"
                          borderRadius="wiki.control"
                          color={isCurrent ? 'wiki.ink' : 'wiki.muted'}
                          fontWeight={isCurrent ? 'semibold' : 'normal'}
                          aria-current={isCurrent ? 'page' : undefined}
                          _hover={{
                            color: 'wiki.accent',
                            bg: 'wiki.raised',
                            textDecoration: 'none',
                          }}
                        >
                          <RouterLink to={`/articles/${article.slug}`}>
                            {article.title}
                          </RouterLink>
                        </Link>
                      </Box>
                    );
                  })}
              </Box>
            )}
          </Box>
```

In `ChapterNavigation`, replace `<ChapterList />` with `<ChapterList showArticles />`.

- [ ] **Step 6: Run the tests**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/chapter-pages.test.tsx tests/wiki-directory.test.tsx`

Expected: PASS.

- [ ] **Step 7: Document**

In `DESIGN.md`:

- Replace `` `ChapterList` serves both the sidebar and phone directory. `` with `` `ChapterList` serves both the sidebar and phone directory; in the sidebar it also lists the current chapter's articles under the active row. ``
- Replace `` `WikiDirectory` owns local search, `` with `` `WikiDirectory` owns the home page's local search, ``
- Replace `Category URLs remain durable browse destinations.` with `Chapter pages are overviews: the chapter's articles in order with their summaries, then previous/next chapter links. They have no search.`
- Replace `` `ArticleCard` and `wiki.card` share result/chapter card surfaces. `` with `` `ArticleCard` and `wiki.card` share search-result and home chapter card surfaces. Cards show chapter, title and summary; pending articles say Not written yet. ``

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npx prettier --check DESIGN.md`

- [ ] **Step 8: Checkpoint**

No commit.

### Task 8: Search spelling variants and title punctuation

**Files:**

- Modify: `app/components/wiki-directory.tsx`
- Modify: `tests/wiki-directory.test.tsx`
- Modify: `app/content/chapters/chapter-05.json`, `app/content/chapters/chapter-11.json` (titles only)
- Regenerate: `app/content/catalogue.json`
- Modify: `DESIGN.md`

**Interfaces:**

- Consumes: `normalizeSearch` from Task 1.
- Produces: the home search matches `normalizeSearch(article.searchText).includes(normalizeSearch(query.trim()))`.

- [ ] **Step 1: Write the failing test**

In `tests/wiki-directory.test.tsx`, change the mocked Recipes entry from `searchText: 'Recipes materials',` to `searchText: 'Recipes materials Erroded Wings',`. Then append:

```tsx
it('finds the guide’s spelling variants of a word', async () => {
  const user = userEvent.setup();
  renderDirectory();
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'eroded',
  );
  expect(screen.getByRole('link', { name: /Recipes/ })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /Armor/ }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/wiki-directory.test.tsx`

Expected: FAIL, with “No articles found” for “eroded”.

- [ ] **Step 3: Fold spelling variants in search**

In `app/components/wiki-directory.tsx`:

- Add `import { normalizeSearch } from '../content/rules';` after the `wiki` import.
- Replace `  const normalizedQuery = query.trim().toLocaleLowerCase();` with `  const normalizedQuery = normalizeSearch(query.trim());`.
- Replace `      article.searchText.toLocaleLowerCase().includes(normalizedQuery),` with `      normalizeSearch(article.searchText).includes(normalizedQuery),`.

- [ ] **Step 4: Restore punctuation in three titles**

In `app/content/chapters/chapter-05.json` replace `"title": "Soul Binding Bind Sync and Reset",` with `"title": "Soul Binding: Bind, Sync and Reset",`.

In `app/content/chapters/chapter-11.json`:

- Replace `"title": "Accuracy Block and Critical Hit",` with `"title": "Accuracy, Block and Critical Hit",`.
- Replace `"title": "Damage Tolerance Endurance and Combat Speed",` with `"title": "Damage Tolerance, Endurance and Combat Speed",`.

Leave `content/source/taxonomy.json` unchanged; its titles are frozen by the baseline digest test.

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run content:generate`

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm test -- tests/wiki-directory.test.tsx tests/source-baseline.test.ts`

Expected: PASS.

- [ ] **Step 6: Document**

In `DESIGN.md` replace `They have no search.` with `They have no search. Home search folds the guide's spelling variants, such as Erroded and Eroded.`

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npx prettier --check DESIGN.md`

- [ ] **Step 7: Checkpoint**

No commit.

### Task 9: Full verification and visual review

**Files:**

- Create (outside the repo): `/tmp/claude-1000/-mnt-c-code-aion-wiki/1838fb46-3628-4ea4-a9df-ad1b820ce53a/scratchpad/phase1-review.mjs`
- Output (ignored): `.local-tools/qa/phase1/`
- Modify: `docs/superpowers/specs/2026-09-25-new-player-reading-phase1-design.md` (status line)

- [ ] **Step 1: Run the required gates**

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run check`

Expected: `Generated content is current.`, `Verified 1268 source blocks, 90 figure placements and 44 source/article pages.`, lint and format clean, typecheck clean, and all tests passing.

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run build`

Expected: `Verified static guide: {"routes":57,...}`.

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin npm run verify:browser`

Expected: `Browser smoke passed: navigation, search reset, article layouts, 404 and no-JS reading.` plus the reduced-motion and viewer checks.

- [ ] **Step 2: Capture review screenshots and measure overflow**

Create `/tmp/claude-1000/-mnt-c-code-aion-wiki/1838fb46-3628-4ea4-a9df-ad1b820ce53a/scratchpad/phase1-review.mjs`:

```js
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';

const root = '/mnt/c/code/aion-wiki/.claude/worktrees/new-player-phase1';
const require = createRequire(`${root}/package.json`);
const { chromium } = require('playwright');
const servePackage = require.resolve('serve/package.json');
const serveBin = resolve(
  dirname(servePackage),
  JSON.parse(readFileSync(servePackage, 'utf8')).bin.serve,
);
const out = `${root}/.local-tools/qa/phase1`;
mkdirSync(out, { recursive: true });
const server = spawn(
  process.execPath,
  [serveBin, `${root}/build/client`, '-l', 'tcp://127.0.0.1:4395', '--no-clipboard'],
  { stdio: 'ignore' },
);
await new Promise((done) => setTimeout(done, 2500));
const routes = [
  '/articles/armor',
  '/articles/gear-anatomy-and-stat-layers',
  '/articles/global-stat-priorities-by-equipment',
  '/articles/raid-accuracy-and-critical-hit-requirements',
  '/articles/wing-stat-catalog',
  '/articles/offensive-stat-values-and-attack-comparisons',
  '/articles/five-card-and-eight-card-set-setups',
  '/articles/pantheon-stats-and-statues',
  '/articles/kr-class-wing-rankings-and-positional-faq',
  '/categories/a-closer-look',
  '/source',
];
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:4395${route}`, {
        waitUntil: 'networkidle',
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      if (overflow) console.log(`OVERFLOW ${width}px ${route}`);
      if (width === 320) continue;
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      const name = route.slice(1).replaceAll('/', '_');
      for (let y = 0, part = 0; y < height; y += 1600, part += 1)
        await page.screenshot({
          path: `${out}/${name}@${width}-${String(part).padStart(2, '0')}.png`,
          fullPage: true,
          clip: { x: 0, y, width, height: Math.min(1600, height - y) },
        });
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`Screenshots in ${out}`);
```

Run: `PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/home/rings/.local/bin:/usr/bin:/bin node /tmp/claude-1000/-mnt-c-code-aion-wiki/1838fb46-3628-4ea4-a9df-ad1b820ce53a/scratchpad/phase1-review.mjs`

Expected: no `OVERFLOW` lines, and `Screenshots in …/.local-tools/qa/phase1`.

- [ ] **Step 3: Review the screenshots against the spec**

Open the first segments of each page at 1440px and 390px. Check:

- Callouts are dark with a light start edge and no white bars. The Armor TLDR sits directly under the header.
- Raid requirements, Global stat priorities, KR wing usage and the wing catalog render as card grids. The raid “Additional Notes” and the KR FAQ follow their grids.
- Pantheon stats, Arcana cards and the five- and eight-card sets render as label cards. Wing cards show Equip and Owned columns.
- The ten offensive values render as value headers; the contents box lists them under “End-Game (KR) Damage Efficiency Numbers”.
- Chapter 02 is a numbered overview with no search box. The sidebar lists chapter 02’s articles with the current one marked.
- Qualifier tags and to-do notes read naturally, and slot icons appear without frames.

For any defect, write a failing test in the owning task's test file, fix it, and rerun that task's focused tests.

- [ ] **Step 4: Rerun the gates after any fix**

If Step 3 changed code, rerun Step 1’s three commands.

- [ ] **Step 5: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-25-new-player-reading-phase1-design.md` replace `Status: written for review; not yet approved.` with `Status: approved and implemented on the feature/new-player-phase1 branch; awaiting the user's review and commit.`

- [ ] **Step 6: Checkpoint**

No commit. Report the gate outputs, the overflow result and the screenshot folder to the user.
