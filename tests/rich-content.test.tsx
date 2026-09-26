import { render, screen, within } from './render';
import { expect, it } from 'vitest';
import { ArticleContents } from '../app/components/article-contents';
import { RichContent } from '../app/components/rich-content';
import type { Block, Figure } from '../app/content/types';
import { walkBlocks } from '../app/content/reader';

const paragraph = (id: string, text: string): Block => ({
  id,
  sourceIds: [id],
  kind: 'paragraph',
  content: [{ text }],
});

const figure: Figure = {
  id: 'figure-1',
  sourceId: 'block0042',
  src: '/images/guide/original.png',
  sha256: 'example',
  width: 800,
  height: 1200,
  alt: 'Equipment stats screenshot',
};

it('renders source text as inert text with inline emphasis, highlighting, underlining, and safe links', () => {
  const blocks: Block[] = [
    {
      id: 'block0001',
      sourceIds: ['block0001'],
      kind: 'paragraph',
      content: [
        { text: '<script>alert(1)</script> ' },
        { text: 'strong', strong: true },
        { text: ' italic', emphasis: true },
        { text: ' underlined', underline: true },
        { text: ' yellow', highlight: '#ffff00' },
        { text: ' details', href: '#source-heading', breakAfter: true },
        {
          text: 'video',
          href: 'https://www.google.com/url?q=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc%26t%3D90&sa=D',
        },
      ],
    },
  ];
  const { container } = render(
    <RichContent
      blocks={blocks}
      figures={{}}
      sourceLinks={{ '#source-heading': '/articles/gear#block0002' }}
    />,
  );

  expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeVisible();
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('strong')).toHaveTextContent('strong');
  expect(container.querySelector('em')?.textContent).toBe(' italic');
  expect(container.querySelector('u')?.textContent).toBe(' underlined');
  const highlight = container.querySelector('mark');
  expect(highlight?.textContent).toBe(' yellow');
  expect(highlight).toHaveAttribute('data-source-highlight', '#ffff00');
  expect(getComputedStyle(highlight!).backgroundColor).toBe('rgb(255, 255, 0)');
  expect(getComputedStyle(highlight!).whiteSpace).toBe('normal');
  expect(screen.getByRole('link', { name: 'details' })).toHaveAttribute(
    'href',
    '/articles/gear#block0002',
  );
  expect(screen.getByRole('link', { name: 'video' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=abc&t=90',
  );
  expect(container.querySelector('br')).toBeInTheDocument();
});

it('keeps unsafe links visible as text without creating a clickable element', () => {
  const blocks: Block[] = [
    {
      id: 'block0003',
      sourceIds: ['block0003'],
      kind: 'paragraph',
      content: [
        { text: 'unsafe', href: 'javascript:alert(1)' },
        { text: ' control', href: 'https://example.com/\\evil' },
        { text: ' safe', href: 'https://example.com/guide' },
      ],
    },
  ];
  render(<RichContent blocks={blocks} figures={{}} sourceLinks={{}} />);

  expect(document.getElementById('block0003')).toHaveTextContent(
    'unsafe control safe',
  );
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'safe' })).toHaveAttribute(
    'href',
    'https://example.com/guide',
  );
});

it.each(['constructor', '__proto__'])(
  'keeps inherited-key href %s visible and inert while resolving an owned source link',
  (unsafeHref) => {
    const blocks: Block[] = [
      {
        id: 'block0003a',
        sourceIds: ['block0003a'],
        kind: 'paragraph',
        content: [
          { text: 'Unsafe reference', href: unsafeHref },
          { text: ' and ' },
          { text: 'valid reference', href: '#source-heading' },
        ],
      },
    ];
    render(
      <RichContent
        blocks={blocks}
        figures={{}}
        sourceLinks={{ '#source-heading': '/articles/gear#block0002' }}
      />,
    );

    expect(document.getElementById('block0003a')).toHaveTextContent(
      'Unsafe reference and valid reference',
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.getByRole('link', { name: 'valid reference' }),
    ).toHaveAttribute('href', '/articles/gear#block0002');
  },
);

it('keeps ordered list numbering and nested source blocks', () => {
  const blocks: Block[] = [
    {
      id: 'block0004',
      sourceIds: [],
      kind: 'list',
      ordered: true,
      start: 7,
      items: [
        [
          paragraph('block0005', 'Seventh item'),
          {
            id: 'block0006',
            sourceIds: [],
            kind: 'list',
            ordered: false,
            items: [[paragraph('block0007', 'Nested point')]],
          },
        ],
      ],
    },
  ];
  const { container } = render(
    <RichContent blocks={blocks} figures={{}} sourceLinks={{}} />,
  );
  const ordered = screen.getByRole('list', { name: 'Numbered guide list' });

  expect(ordered).toHaveAttribute('start', '7');
  expect(
    within(ordered).getByText('Seventh item').closest('p'),
  ).toHaveAttribute('id', 'block0005');
  expect(
    within(ordered).getByText('Nested point').closest('p'),
  ).toHaveAttribute('id', 'block0007');
  expect(container.querySelector('ul')).toBeInTheDocument();
});

it('renders captioned tables with column headers and labeled horizontal scrolling', () => {
  const blocks: Block[] = [
    {
      id: 'block0008',
      sourceIds: ['block0008'],
      kind: 'table',
      caption: 'Regional values',
      columns: [[{ text: 'Region' }], [{ text: 'Attack' }]],
      rows: [
        [[paragraph('block0009', 'Global')], [paragraph('block0010', '150')]],
      ],
    },
  ];
  render(<RichContent blocks={blocks} figures={{}} sourceLinks={{}} />);

  const region = screen.getByRole('region', { name: 'Regional values' });
  expect(region).toHaveAttribute('tabindex', '0');
  expect(
    within(region).getByRole('table', { name: 'Regional values' }),
  ).toBeVisible();
  expect(
    within(region).getByRole('columnheader', { name: 'Region' }),
  ).toHaveAttribute('scope', 'col');
  expect(
    within(region).getByRole('columnheader', { name: 'Attack' }),
  ).toHaveAttribute('scope', 'col');
  expect(within(region).getByText('150').closest('p')).toHaveAttribute(
    'id',
    'block0010',
  );
});

it('shows literal formulas, notes, grouped blocks, and clickable figures', () => {
  const blocks: Block[] = [
    {
      id: 'block0011',
      sourceIds: [],
      kind: 'group',
      blocks: [
        {
          id: 'block0012',
          sourceIds: ['block0012'],
          kind: 'formula',
          expression: [{ text: '((A + B) × C) / D' }],
          explanation: [{ text: 'Before mitigation.' }],
        },
        {
          id: 'block0013',
          sourceIds: ['block0013'],
          kind: 'note',
          tone: 'uncertain',
          label: 'Source uncertainty',
          content: [{ text: 'The value is unknown.' }],
        },
        {
          id: 'block0014',
          sourceIds: ['block0042'],
          kind: 'figure',
          figureId: 'figure-1',
        },
      ],
    },
  ];
  const { container } = render(
    <RichContent
      blocks={blocks}
      figures={{ 'figure-1': figure }}
      sourceLinks={{}}
    />,
  );

  expect(container.querySelector('#block0011')).toContainElement(
    container.querySelector('#block0012'),
  );
  expect(container.querySelector('pre')).toHaveTextContent('((A + B) × C) / D');
  expect(screen.getByText('The value is unknown.')).toBeVisible();
  expect(screen.getByText('Source uncertainty')).toBeVisible();
  expect(
    screen.getByRole('button', { name: /Equipment stats screenshot/ }),
  ).toContainElement(
    screen.getByRole('img', { name: 'Equipment stats screenshot' }),
  );
});

it('gives repeated heading titles their distinct source-derived ids and matching nested contents targets', () => {
  const blocks: Block[] = [
    {
      id: 'block0020',
      sourceIds: [],
      kind: 'group',
      blocks: [
        {
          id: 'block0021',
          sourceIds: ['block0021'],
          kind: 'heading',
          level: 2,
          content: [{ text: 'Global' }],
        },
        {
          id: 'block0022',
          sourceIds: ['block0022'],
          kind: 'heading',
          level: 3,
          content: [{ text: 'Attack' }],
        },
        {
          id: 'block0023',
          sourceIds: ['block0023'],
          kind: 'heading',
          level: 4,
          content: [{ text: 'Global' }],
        },
      ],
    },
  ];
  const { container } = render(
    <>
      <ArticleContents blocks={blocks} />
      <RichContent blocks={blocks} figures={{}} sourceLinks={{}} />
    </>,
  );
  const contents = screen.getByRole('navigation', { name: 'On this page' });
  // Below the wide breakpoint the list shows once its disclosure is open.
  contents.querySelector('details')!.open = true;

  expect(
    screen.getByRole('heading', { name: 'Global', level: 2 }),
  ).toHaveAttribute('id', 'block0021');
  expect(
    screen.getByRole('heading', { name: 'Global', level: 4 }),
  ).toHaveAttribute('id', 'block0023');
  expect(
    within(contents)
      .getAllByRole('link', { name: 'Global' })
      .map((link) => link.getAttribute('href')),
  ).toEqual(['#block0021', '#block0023']);
  for (const link of within(contents).getAllByRole('link')) {
    expect(
      container.querySelector(link.getAttribute('href')!),
    ).toBeInTheDocument();
  }
  expect(
    within(contents).getByRole('link', { name: 'Attack' }).closest('ul')
      ?.parentElement?.textContent,
  ).toContain('Global');
});

it('does not emit empty anchors for whitespace-only link spans adjacent to the same target', () => {
  const blocks: Block[] = [
    {
      id: 'block0424',
      sourceIds: ['block0424'],
      kind: 'paragraph',
      content: [
        { text: '\u00a0', href: 'https://example.com/video' },
        { text: 'Watch video', href: 'https://example.com/video' },
        { text: '\u00a0', href: 'https://example.com/video' },
      ],
    },
  ];
  render(<RichContent blocks={blocks} figures={{}} sourceLinks={{}} />);

  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Watch video' })).toHaveAttribute(
    'href',
    'https://example.com/video',
  );
});

it('repeats a screenshot marker color beside the heading it links to, leaving the heading text unchanged', () => {
  const blocks: Block[] = [
    {
      id: 'block0030',
      sourceIds: ['block0042'],
      kind: 'figure',
      figureId: 'figure-1',
    },
    {
      id: 'block0031',
      sourceIds: ['block0031'],
      kind: 'heading',
      level: 2,
      content: [{ text: 'Base Stats' }],
    },
  ];
  const { container } = render(
    <RichContent
      blocks={blocks}
      figures={{
        'figure-1': {
          ...figure,
          annotations: [
            {
              label: '2',
              title: 'Base Stats',
              color: 'white',
              target: 'block0031',
            },
          ],
        },
      }}
      sourceLinks={{}}
    />,
  );
  const heading = screen.getByRole('heading', { name: 'Base Stats', level: 2 });
  expect(heading).toHaveTextContent(/^Base Stats$/);
  const wrapper = container.querySelector('[data-guide-heading-markers]');
  expect(wrapper).toContainElement(heading);
  expect(
    within(wrapper as HTMLElement).queryByText('2'),
  ).not.toBeInTheDocument();
  expect(
    wrapper?.querySelector('[data-guide-color-swatch]'),
  ).toBeInTheDocument();
});

it('keeps formatting inside a formula and omits an empty explanation', () => {
  const blocks: Block[] = [
    {
      id: 'formula-styled',
      sourceIds: ['formula-styled'],
      kind: 'formula',
      expression: [{ text: '(A × B) + ' }, { text: 'C', highlight: '#ffff00' }],
      explanation: [],
    },
  ];
  const { container } = render(
    <RichContent blocks={blocks} figures={{}} sourceLinks={{}} />,
  );
  const pre = container.querySelector('pre');
  expect(pre).toHaveTextContent('(A × B) + C');
  expect(pre?.querySelector('mark')).toHaveAttribute(
    'data-source-highlight',
    '#ffff00',
  );
  expect(container.querySelector('#formula-styled p')).toBeNull();
});

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
        shadedParagraph('n1', 'IMPORTANT: Keep this'),
        shadedParagraph('n2', 'Second line'),
      ]}
      figures={{}}
      sourceLinks={{}}
    />,
  );
  const callout = screen.getByRole('note');
  expect(callout).toHaveAttribute('data-guide-callout', 'warning');
  expect(
    within(callout).getByText('IMPORTANT: Keep this').closest('p'),
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
            { text: 'Value 5% (not confirmed for ' },
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
    'Value 5% (not confirmed for Global)',
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
    items: [
      [line(`${id}-label`, `Label ${id}`), list(`${id}-nested`, ['Detail'])],
    ],
  });
  const group = (id: string): Block => ({
    id,
    sourceIds: [],
    kind: 'group',
    blocks: [
      {
        id: `${id}-heading`,
        sourceIds: [],
        kind: 'heading',
        level: 3,
        content: [{ text: `Group ${id}` }],
      },
      labelList(`${id}-a`),
      labelList(`${id}-b`),
    ],
  });
  // A paragraph ends the section grid; lists directly after a heading's list
  // belong to that heading's section, as they do in the source. A shaded note
  // after the last section speaks for the grid and follows it as a callout.
  const blocks: Block[] = [
    ...section('s1'),
    ...section('s2'),
    ...section('s3'),
    shadedParagraph('n', 'Additional Notes: For every section'),
    line('mid', 'Between the grids'),
    labelList('c1'),
    labelList('c2'),
    group('g1'),
    group('g2'),
    group('g3'),
    line('v', '1% Speed = 0.5%'),
  ];
  const { container } = render(
    <RichContent blocks={blocks} figures={{}} sourceLinks={{}} />,
  );
  const [sections, groups] = container.querySelectorAll<HTMLElement>(
    '[data-guide-grid="sections"]',
  );
  expect(sections.querySelectorAll(':scope > [data-guide-card]')).toHaveLength(
    3,
  );
  expect(groups.querySelectorAll('[data-guide-grid="columns"]')).toHaveLength(
    3,
  );
  expect(container.querySelector('[role="note"] #n')).not.toBeNull();
  expect(
    container.querySelectorAll('[data-guide-grid="labels"] [data-guide-card]'),
  ).toHaveLength(2);
  for (const card of container.querySelectorAll(
    '[data-guide-grid="labels"] [data-guide-card], [data-guide-grid="columns"] [data-guide-card]',
  ))
    expect(card).toHaveAttribute('role', 'list');
  expect(container.querySelector('#v')).toHaveAttribute(
    'data-guide-value-line',
  );
  expect(container.querySelector('#v')).toHaveTextContent('1% Speed = 0.5%');
  expect(
    [...container.querySelectorAll('[data-guide-content] [id]')].map(
      (node) => node.id,
    ),
  ).toEqual(walkBlocks(blocks).map((block) => block.id));
});

it('keeps the number of a numbered note inside a callout', () => {
  const { container } = render(
    <RichContent
      blocks={[
        {
          id: 'numbered',
          sourceIds: [],
          kind: 'list',
          ordered: true,
          start: 3,
          items: [[shadedParagraph('numbered-item', 'IMPORTANT: Keep this')]],
        },
      ]}
      figures={{}}
      sourceLinks={{}}
    />,
  );
  const list = container.querySelector('ol#numbered');
  expect(list?.closest('[role="note"]')).not.toBeNull();
  expect(list).toHaveAttribute('start', '3');
  expect(getComputedStyle(list!).listStyleType).toBe('decimal');
});
