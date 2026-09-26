import { describe, expect, it } from 'vitest';
import {
  isShadedBlock,
  isShadedRuns,
  isSmallFigure,
  leadInTone,
  matchesSearch,
  normalizeSearch,
  orderTldrFirst,
  planLayout,
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

  it('matches text as typed or with variants folded, so a variant typed partway still matches', () => {
    expect(matchesSearch('Erroded Wings', 'errode')).toBe(true);
    expect(matchesSearch('Primal Vigore', 'vigore')).toBe(true);
    expect(matchesSearch('Eroded Wings', 'Erroded')).toBe(true);
    expect(matchesSearch('Recipes', 'wings')).toBe(false);
  });
});

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
    expect(segments[0]).toMatchObject({ columns: true });
  });

  it('notes only grids whose cards hold label columns', () => {
    expect(
      planLayout([
        heading('h1', 'One'),
        list('l1', ['a']),
        heading('h2', 'Two'),
        list('l2', ['b']),
        heading('h3', 'Three'),
        list('l3', ['c']),
      ])[0],
    ).toMatchObject({ kind: 'sections', columns: false });
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
