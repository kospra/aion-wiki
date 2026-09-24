import { expect, it } from 'vitest';
import { buildPassageLabels } from '../app/content/passage-labels';
import type { GuidePage } from '../app/content/types';

it('labels exact destinations with headings or readable passage previews', () => {
  const page: GuidePage = {
    slug: 'gear',
    title: 'Gear guide',
    category: 'gear',
    summary: 'Gear guide',
    status: 'source-backed',
    sourceUrl: 'https://example.com/guide',
    qualifiers: [],
    blocks: [
      {
        kind: 'heading',
        id: 'enhancement',
        content: [{ text: 'Enhancement and amplification' }],
        level: 2,
        sourceIds: [],
      },
      {
        kind: 'paragraph',
        id: 'cost',
        content: [{ text: 'Each upgrade requires enhancement stones.' }],
        sourceIds: [],
      },
    ],
  };
  const labels = buildPassageLabels([page], () => '/articles/gear');
  expect(labels['/articles/gear#enhancement']).toBe(
    'Enhancement and amplification',
  );
  expect(labels['/articles/gear#cost']).toBe(
    'Each upgrade requires enhancement stones.',
  );
  expect(labels['/articles/gear']).toBe('Gear guide');
});
