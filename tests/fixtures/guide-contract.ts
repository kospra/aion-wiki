import type {
  CoverageEntry,
  Figure,
  GuidePage,
  SourceBaseline,
} from '../../app/content/types';

// Independent literals: expected source facts must never be derived from pages.
export const validGuide: {
  baseline: SourceBaseline;
  pages: GuidePage[];
  figures: Figure[];
  coverage: CoverageEntry[];
  externalDestinations?: Record<string, string>;
} = {
  baseline: {
    fingerprints: { html: 'captured-html', docx: 'captured-docx' },
    blocks: [
      {
        id: 's1',
        text: 'Attack 150 and 5%',
        numbers: ['150', '5'],
        figureIds: [],
        links: [],
        formatting: [{ text: '5%', start: 15, end: 17, underline: true }],
      },
      {
        id: 's2',
        text: 'Global 150 then 150',
        numbers: ['150', '150'],
        figureIds: [],
        listStart: 7,
        links: [],
        formatting: [
          {
            text: 'Global',
            start: 0,
            end: 6,
            strong: true,
            highlight: '#ffff00',
          },
        ],
      },
      {
        id: 's3',
        text: 'Value 32%',
        numbers: ['32'],
        figureIds: [],
        links: [],
        formatting: [],
      },
      {
        id: 's4',
        text: '',
        numbers: [],
        figureIds: ['figure-1'],
        links: [],
        formatting: [],
      },
      {
        id: 's5',
        text: '',
        numbers: [],
        figureIds: [],
        links: [],
        formatting: [],
      },
      {
        id: 's6',
        text: 'See details and video',
        numbers: [],
        figureIds: [],
        links: [
          { label: 'details', href: '#h.details' },
          {
            label: 'video',
            href: 'https://www.google.com/url?q=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc%26t%3D90&sa=D',
          },
        ],
        formatting: [],
      },
      {
        id: 's7',
        text: 'Details',
        numbers: [],
        figureIds: [],
        anchor: 'h.details',
        links: [],
        formatting: [],
      },
    ],
    figures: [
      {
        id: 'figure-1',
        sourceId: 's4',
        src: '/images/guide/abc.png',
        sha256: 'abc',
        width: 640,
        height: 900,
      },
    ],
  },
  pages: [
    {
      slug: 'gear',
      title: 'Gear',
      category: 'basics',
      summary: 'A source example',
      status: 'source-backed',
      sourceUrl: 'https://docs.google.com/document/d/example/edit',
      blocks: [
        {
          id: 'attack',
          sourceIds: ['s1'],
          kind: 'paragraph',
          content: [
            { text: 'Attack 150 and ' },
            { text: '5%', underline: true },
          ],
        },
        {
          id: 'priorities',
          sourceIds: [],
          kind: 'list',
          ordered: true,
          start: 7,
          items: [
            [
              {
                id: 'global',
                sourceIds: ['s2'],
                kind: 'paragraph',
                content: [
                  { text: 'Global', strong: true, highlight: '#ffff00' },
                  { text: ' 150 then 150' },
                ],
              },
            ],
          ],
        },
        {
          id: 'values',
          sourceIds: [],
          kind: 'table',
          caption: 'Examples',
          columns: [[{ text: 'Stat' }]],
          rows: [
            [
              [
                {
                  id: 'value',
                  sourceIds: ['s3'],
                  kind: 'paragraph',
                  content: [{ text: 'Value 32%' }],
                },
              ],
            ],
          ],
        },
        {
          id: 'screenshot',
          sourceIds: ['s4'],
          kind: 'figure',
          figureId: 'figure-1',
        },
        {
          id: 'references',
          sourceIds: ['s6'],
          kind: 'paragraph',
          content: [
            { text: 'See ' },
            { text: 'details', href: '#details' },
            { text: ' and ' },
            { text: 'video', href: 'https://www.youtube.com/watch?v=abc&t=90' },
          ],
        },
        {
          id: 'details',
          sourceIds: ['s7'],
          kind: 'heading',
          level: 2,
          content: [{ text: 'Details' }],
        },
      ],
    },
  ],
  figures: [
    {
      id: 'figure-1',
      sourceId: 's4',
      src: '/images/guide/abc.png',
      sha256: 'abc',
      width: 640,
      height: 900,
      alt: 'Example stat panel',
    },
  ],
  coverage: [
    {
      sourceId: 's1',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['attack'] },
    },
    {
      sourceId: 's2',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['global'] },
    },
    {
      sourceId: 's3',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['value'] },
    },
    {
      sourceId: 's4',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['screenshot'] },
    },
    {
      sourceId: 's5',
      disposition: 'layout-only',
      reason: 'Empty paragraph used for document spacing.',
    },
    {
      sourceId: 's6',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['references'] },
    },
    {
      sourceId: 's7',
      disposition: 'rendered',
      primary: { pageSlug: 'gear', blockIds: ['details'] },
    },
  ],
};
