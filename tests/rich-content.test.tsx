import { render, screen, within } from './render';
import { expect, it } from 'vitest';
import { ArticleContents } from '../app/components/article-contents';
import { RichContent } from '../app/components/rich-content';
import type { Block, Figure } from '../app/content/types';

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
  caption: 'Equipment stat layers',
  mappings: [],
  screenshotOnly: [],
  uncertainties: [],
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

it('shows literal formulas, uncertain notes, group labels, and clickable figures', () => {
  const blocks: Block[] = [
    {
      id: 'block0011',
      sourceIds: [],
      kind: 'group',
      label: 'Damage calculation',
      blocks: [
        {
          id: 'block0012',
          sourceIds: ['block0012'],
          kind: 'formula',
          expression: '((A + B) × C) / D',
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

  expect(
    screen.getByRole('group', { name: 'Damage calculation' }),
  ).toBeVisible();
  expect(container.querySelector('pre')).toHaveTextContent('((A + B) × C) / D');
  expect(screen.getByText('The value is unknown.')).toBeVisible();
  expect(screen.getByText('Source uncertainty')).toBeVisible();
  expect(
    screen.getByRole('button', { name: /Equipment stats screenshot/ }),
  ).toContainElement(
    screen.getByRole('img', { name: 'Equipment stats screenshot' }),
  );
  expect(screen.getByText('Equipment stat layers')).toBeVisible();
});

it('gives repeated heading titles their distinct source-derived ids and matching nested contents targets', () => {
  const blocks: Block[] = [
    {
      id: 'block0020',
      sourceIds: [],
      kind: 'group',
      label: 'Regional priorities',
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
