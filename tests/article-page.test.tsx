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
