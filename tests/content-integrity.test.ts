import { describe, expect, it } from 'vitest';
import {
  inlineText,
  normalizeSourceUrl,
  pageText,
  walkBlocks,
} from '../app/content/reader';
import type { Block } from '../app/content/types';
import { validateGuide } from '../scripts/content-integrity';
import { validGuide } from './fixtures/guide-contract';

const copy = () => structuredClone(validGuide);
const paragraph = (guide: typeof validGuide, id = 'attack') => {
  const top = guide.pages[0].blocks;
  const list = top[1];
  const table = top[2];
  const block =
    id === 'global' && list.kind === 'list'
      ? list.items[0][0]
      : id === 'value' && table.kind === 'table'
        ? table.rows[0][0][0]
        : top.find((block) => block.id === id);
  if (block?.kind !== 'paragraph') throw new Error('Fixture shape changed');
  return block;
};

describe('source fidelity', () => {
  it('accepts preserved visible content, list start, table, figure, and justified spacing', () => {
    expect(validateGuide(validGuide)).toEqual([]);
  });

  it('detects an omitted percentage even when a figure caption repeats it', () => {
    const broken = copy();
    paragraph(broken).content = [{ text: 'Attack 150' }];
    broken.figures[0].caption += ' 5%';
    expect(validateGuide(broken).join(' ')).toMatch(/5%|numeric/);
  });

  it('detects changed regional meaning with unchanged numeric counts', () => {
    const broken = copy();
    paragraph(broken, 'global').content[0].text = 'Asia';
    expect(validateGuide(broken).join(' ')).toMatch(/s2.*text|Global/);
  });

  it('detects loss of a repeated numeric occurrence', () => {
    const broken = copy();
    paragraph(broken, 'global').content[1].text = ' 150 then';
    expect(validateGuide(broken).join(' ')).toMatch(/numeric.*150/);
  });

  it('does not accept raw source text hidden in arbitrary metadata', () => {
    const broken = copy();
    Object.assign(paragraph(broken), {
      content: [{ text: 'Attack' }],
      rawSourceText: 'Attack 150 and 5%',
    });
    expect(validateGuide(broken).join(' ')).toMatch(/s1.*text|numeric/);
  });

  it('does not let repeated context replace missing primary content', () => {
    const broken = copy();
    broken.pages[0].blocks.push({
      ...structuredClone(paragraph(broken)),
      id: 'context-copy',
    });
    paragraph(broken).content = [{ text: 'Attack' }];
    expect(validateGuide(broken).join(' ')).toMatch(/s1.*text|numeric/);
  });

  it.each(['underline', 'strong', 'highlight'] as const)(
    'detects discarded %s semantics',
    (style) => {
      const broken = copy();
      const run =
        style === 'underline'
          ? paragraph(broken).content[1]
          : paragraph(broken, 'global').content[0];
      delete run[style];
      expect(validateGuide(broken).join(' ')).toMatch(/formatting/);
    },
  );

  it('accepts preserved styling split across inline runs and normalized whitespace', () => {
    const guide = copy();
    paragraph(guide).content = [
      { text: 'Attack  150\nand ' },
      { text: '5', underline: true },
      { text: '%', underline: true },
    ];
    expect(validateGuide(guide)).toEqual([]);
  });

  it('accepts a source paragraph split into attributed table cells in source order', () => {
    const guide = copy();
    guide.pages[0].blocks[0] = {
      id: 'attack-table',
      sourceIds: ['s1'],
      kind: 'table',
      caption: 'Attack comparison',
      columns: [],
      rows: [
        [
          [
            {
              id: 'a',
              sourceIds: ['s1'],
              kind: 'paragraph',
              content: [{ text: 'Attack 150' }],
            },
          ],
          [
            {
              id: 'b',
              sourceIds: ['s1'],
              kind: 'paragraph',
              content: [{ text: 'and 5%', underline: true }],
            },
          ],
        ],
      ],
    };
    guide.coverage[0].primary!.blockIds = ['attack-table', 'a', 'b'];
    expect(validateGuide(guide)).toEqual([]);
    const cell = guide.pages[0].blocks[0];
    if (cell.kind !== 'table') throw new Error('Fixture shape changed');
    cell.rows[0][1] = [];
    expect(validateGuide(guide).join(' ')).toMatch(/5%|numeric/);
  });

  it('does not borrow a numeric occurrence from an editorial table caption or other source', () => {
    const guide = copy();
    paragraph(guide, 'value').content = [{ text: 'Value' }];
    const table = guide.pages[0].blocks[2];
    if (table.kind !== 'table') throw new Error('Fixture shape changed');
    table.caption = 'Value 32%';
    guide.coverage[2].primary!.blockIds = ['values'];
    table.sourceIds = ['s3'];
    table.rows[0][0].push({
      id: 'editorial',
      sourceIds: [],
      kind: 'figure',
      figureId: 'figure-1',
    });
    expect(validateGuide(guide).join(' ')).toMatch(/numeric.*32/);
  });

  it('rejects a changed generated list number', () => {
    const guide = copy();
    const list = guide.pages[0].blocks[1];
    if (list.kind !== 'list') throw new Error('Fixture shape changed');
    list.start = 1;
    expect(validateGuide(guide).join(' ')).toMatch(/list.*7/);
  });

  it.each([
    'missing',
    'reason',
    'substantive',
    'dead-primary',
    'duplicate',
  ] as const)('rejects %s coverage', (mutation) => {
    const guide = copy();
    if (mutation === 'missing') guide.coverage.pop();
    if (mutation === 'reason') guide.coverage[4].reason = '  ';
    if (mutation === 'substantive')
      guide.coverage[0] = {
        sourceId: 's1',
        disposition: 'layout-only',
        reason: 'Omitted prose',
      };
    if (mutation === 'dead-primary')
      guide.coverage[0].primary!.blockIds = ['absent'];
    if (mutation === 'duplicate') guide.coverage.push(guide.coverage[0]);
    expect(validateGuide(guide).length).toBeGreaterThan(0);
  });
});

describe('figures and destinations', () => {
  it.each([
    'missing',
    'placement',
    'hash',
    'dimensions',
    'source',
    'linked-text',
  ] as const)('rejects broken figure %s', (mutation) => {
    const guide = copy();
    if (mutation === 'missing') guide.figures = [];
    if (mutation === 'placement') guide.pages[0].blocks.splice(3, 1);
    if (mutation === 'hash') guide.figures[0].sha256 = 'wrong';
    if (mutation === 'dimensions') guide.figures[0].width = 10;
    if (mutation === 'source') guide.figures[0].sourceId = 's1';
    if (mutation === 'linked-text')
      guide.figures[0].mappings[0].textSourceIds = ['absent'];
    expect(validateGuide(guide).join(' ')).toMatch(/figure/);
  });

  it('rejects duplicate visible anchors', () => {
    const guide = copy();
    guide.pages[0].blocks[5].id = 'attack';
    expect(validateGuide(guide).join(' ')).toMatch(/duplicate.*anchor/);
  });

  it('rejects dead local anchors, including editorial links', () => {
    const guide = copy();
    guide.pages[0].blocks.push({
      id: 'extra',
      sourceIds: [],
      kind: 'paragraph',
      content: [{ text: 'More', href: '/articles/gear#absent' }],
    });
    expect(validateGuide(guide).join(' ')).toMatch(/anchor|destination/);
  });

  it('resolves source links rewritten to another article', () => {
    const guide = copy();
    const details = guide.pages[0].blocks.pop()!;
    guide.pages.push({ ...guide.pages[0], slug: 'details', blocks: [details] });
    guide.coverage[6].primary!.pageSlug = 'details';
    paragraph(guide, 'references').content[1].href =
      '/articles/details#details';
    expect(validateGuide(guide)).toEqual([]);
    paragraph(guide, 'references').content[1].href = '/articles/gear#attack';
    expect(validateGuide(guide).join(' ')).toMatch(/link/);
  });

  it('only permits omitted external destinations when explicitly supplied for group validation', () => {
    const guide = copy();
    guide.pages[0].blocks.pop();
    guide.coverage.pop();
    paragraph(guide, 'references').content[1].href = '/articles/other#details';
    expect(validateGuide(guide).length).toBeGreaterThan(0);
    guide.externalDestinations = { s7: '/articles/other#details' };
    expect(validateGuide(guide)).toEqual([]);
  });

  it('rejects unsafe page and inline URLs', () => {
    const guide = copy();
    guide.pages[0].sourceUrl = 'javascript:alert(1)';
    paragraph(guide).content[0].href = 'data:text/html,unsafe';
    expect(validateGuide(guide).join(' ')).toMatch(/unsafe/);
  });
});

describe('shared reading helpers', () => {
  it('decodes Google wrappers without dropping video timestamps', () => {
    expect(
      normalizeSourceUrl(
        'https://www.google.com/url?q=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc%26t%3D90&sa=D',
      ),
    ).toBe('https://www.youtube.com/watch?v=abc&t=90');
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.test',
    '/\\evil.test',
    'https://www.google.com/url?q=javascript%3Aalert(1)',
    'https://',
  ])('rejects unsafe or malformed URL %s', (url) => {
    expect(normalizeSourceUrl(url)).toBeNull();
  });
  it('reads every nested block variant in document order and respects inline breaks', () => {
    const blocks: Block[] = [
      {
        id: 'group',
        sourceIds: [],
        kind: 'group',
        label: 'Example group',
        blocks: [
          ...copy().pages[0].blocks,
          {
            id: 'formula',
            sourceIds: [],
            kind: 'formula',
            expression: 'Attack × 2',
            explanation: [
              { text: 'Double', breakAfter: true },
              { text: 'Attack' },
            ],
          },
          {
            id: 'note',
            sourceIds: [],
            kind: 'note',
            label: 'Source note',
            tone: 'uncertain',
            content: [{ text: 'Unknown cap' }],
          },
        ],
      },
    ];
    expect(walkBlocks(blocks).map((block) => block.id)).toEqual([
      'group',
      'attack',
      'priorities',
      'global',
      'values',
      'value',
      'screenshot',
      'references',
      'details',
      'formula',
      'note',
    ]);
    expect(
      inlineText([{ text: 'one', breakAfter: true }, { text: 'two' }]),
    ).toBe('one\ntwo');
    const guide = copy();
    guide.pages[0].blocks = blocks;
    const text = pageText(guide.pages[0], [
      ...guide.figures,
      { ...guide.figures[0], id: 'unrelated', caption: 'UNRELATED IMAGE' },
    ]);
    for (const expected of [
      'Example group',
      'Attack 150',
      'Stat',
      'Examples',
      'Attack × 2',
      'Double\nAttack',
      'Unknown cap',
      'Stat row',
      'green',
      '32%',
      'Value illustrated',
    ])
      expect(text).toContain(expected);
    expect(text).not.toContain('UNRELATED IMAGE');
  });
});

describe('captured-source edge cases', () => {
  it('groups adjacent identical links whose captured runs contain only NBSP', () => {
    const guide = copy();
    guide.baseline.blocks[5].links = [
      { label: '\u00a0', href: '#h.details' },
      { label: 'details', href: '#h.details' },
      { label: '\u00a0', href: '#h.details' },
      guide.baseline.blocks[5].links[1],
    ];
    expect(validateGuide(guide)).toEqual([]);
    paragraph(guide, 'references').content[1].href = undefined;
    expect(validateGuide(guide).join(' ')).toMatch(/link/);
  });

  it('requires an explicit layout-only reason for an empty source block', () => {
    const guide = copy();
    guide.pages[0].blocks.push({
      id: 'empty',
      sourceIds: ['s5'],
      kind: 'paragraph',
      content: [],
    });
    guide.coverage[4] = {
      sourceId: 's5',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['empty'] },
    };
    expect(validateGuide(guide).join(' ')).toMatch(/layout-only/);
  });

  it('does not exempt a missing anchor on an included page using externalDestinations', () => {
    const guide = copy();
    guide.pages[0].blocks.pop();
    guide.coverage.pop();
    guide.externalDestinations = { s7: '/articles/gear#details' };
    expect(validateGuide(guide).join(' ')).toMatch(/external|anchor/);
  });

  it('preserves a source number within a larger value instead of accepting a substring', () => {
    const guide = copy();
    paragraph(guide).content[0].text = 'Attack 1150 and ';
    expect(validateGuide(guide).join(' ')).toMatch(/numeric.*150/);
  });

  it('validates the exact repeated styled occurrence', () => {
    const guide = copy();
    guide.baseline.blocks[1].formatting.push(
      { text: '150', underline: true },
      { text: '150', underline: true },
    );
    paragraph(guide, 'global').content = [
      paragraph(guide, 'global').content[0],
      { text: ' 150', underline: true },
      { text: ' then 150' },
    ];
    expect(validateGuide(guide).join(' ')).toMatch(/formatting.*150/);
  });

  it('validates formula and note source text rather than their editorial labels', () => {
    const guide = copy();
    guide.pages[0].blocks[0] = {
      id: 'attack',
      sourceIds: ['s1'],
      kind: 'formula',
      expression: 'Attack 150',
      explanation: [{ text: 'and 5%', underline: true }],
    };
    guide.pages[0].blocks[5] = {
      id: 'details',
      sourceIds: ['s7'],
      kind: 'note',
      label: 'Source note',
      tone: 'context',
      content: [{ text: 'Details' }],
    };
    expect(validateGuide(guide)).toEqual([]);
    guide.pages[0].blocks[0].expression = 'Attack';
    expect(validateGuide(guide).join(' ')).toMatch(/numeric.*150/);
  });

  it('allows two audited placements sharing identical original image bytes', () => {
    const guide = copy();
    guide.baseline.blocks.push({
      id: 's8',
      text: '',
      numbers: [],
      figureIds: ['figure-2'],
      links: [],
      formatting: [],
    });
    guide.baseline.figures.push({
      ...guide.baseline.figures[0],
      id: 'figure-2',
      sourceId: 's8',
    });
    guide.figures.push({ ...guide.figures[0], id: 'figure-2', sourceId: 's8' });
    guide.pages[0].blocks.push({
      id: 'second',
      sourceIds: ['s8'],
      kind: 'figure',
      figureId: 'figure-2',
    });
    guide.coverage.push({
      sourceId: 's8',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['second'] },
    });
    expect(validateGuide(guide)).toEqual([]);
    guide.pages[0].blocks.pop();
    expect(validateGuide(guide).join(' ')).toMatch(/figure-2/);
  });
});
