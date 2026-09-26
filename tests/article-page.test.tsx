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
      { slug: 'first', title: 'Chapter One', description: '' },
      { slug: 'second', title: 'Chapter Two', description: '' },
    ],
    articles: [
      entry('alpha', 'Alpha', 'first'),
      entry('beta', 'Beta', 'first'),
      entry('gamma', 'Gamma', 'second'),
    ],
  };
});

const page: GuidePage = {
  slug: 'beta',
  title: 'Beta',
  category: 'first',
  summary: 'Beta summary',
  status: 'source-backed',
  sourceUrl: 'https://example.com/guide',
  blocks: [
    {
      id: 'body',
      sourceIds: ['body'],
      kind: 'paragraph',
      content: [{ text: 'Body text' }],
    },
    {
      id: 'tldr',
      sourceIds: ['tldr'],
      kind: 'paragraph',
      content: [{ text: 'TLDR: Short answer', highlight: '#f8f9fa' }],
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
    screen.getByRole('link', { name: /Next chapter · Chapter Two/ }),
  ).toHaveAttribute('href', '/articles/gamma');
  expect(
    screen.getByRole('link', { name: /Previous: Alpha/ }),
  ).not.toHaveTextContent('Previous chapter');
});

it('starts each article with its contents box closed', () => {
  const withSections = (slug: string): GuidePage => ({
    ...page,
    slug,
    blocks: ['One', 'Two'].map((title, index) => ({
      id: `${slug}-${index}`,
      sourceIds: [],
      kind: 'heading',
      level: 2,
      content: [{ text: title }],
    })),
  });
  const view = (slug: string) => (
    <MemoryRouter>
      <GuidePageView page={withSections(slug)} />
    </MemoryRouter>
  );
  const details = () =>
    screen
      .getByRole('navigation', { name: 'On this page' })
      .querySelector('details');
  const { rerender } = render(view('beta'));
  details()!.open = true;
  rerender(view('alpha'));
  expect(details()).not.toHaveAttribute('open');
});
