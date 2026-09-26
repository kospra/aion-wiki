import { render, screen, within } from './render';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import CategoryRoute from '../app/routes/category';
import { ChapterList } from '../app/components/chapter-navigation';

vi.mock('../app/content/wiki', () => {
  const entry = (slug: string, title: string, category: string) => ({
    slug,
    title,
    category,
    summary: `${title} summary`,
    status: 'source-backed',
    sourceUrl: '',
    searchText: '',
    headings: [],
  });
  return {
    categories: [
      { slug: 'first', title: 'Chapter One', description: 'First chapter' },
      { slug: 'second', title: 'Chapter Two', description: 'Second chapter' },
    ],
    articles: [
      entry('alpha', 'Alpha', 'first'),
      entry('beta', 'Beta', 'first'),
      entry('gamma', 'Gamma', 'second'),
    ],
  };
});

it('shows a chapter as an ordered overview without search', () => {
  render(
    <MemoryRouter initialEntries={['/categories/first']}>
      <Routes>
        <Route path="/categories/:slug" element={<CategoryRoute />} />
      </Routes>
    </MemoryRouter>,
  );
  const list = screen.getByRole('list', { name: 'Articles in this chapter' });
  // Safari drops list semantics from lists styled without markers.
  expect(list).toHaveAttribute('role', 'list');
  expect(
    within(list)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href')),
  ).toEqual(['/articles/alpha', '/articles/beta']);
  expect(within(list).getByText('Beta summary')).toBeVisible();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Next chapter/ })).toHaveAttribute(
    'href',
    '/categories/second',
  );
});

it('lists the current chapter’s articles under its row and marks the current one', () => {
  render(
    <MemoryRouter initialEntries={['/articles/beta']}>
      <ChapterList showArticles />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Beta' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('link', { name: 'Alpha' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Gamma' })).not.toBeInTheDocument();
  for (const list of document.querySelectorAll('ul'))
    expect(list).toHaveAttribute('role', 'list');
});

it('marks the same article when the path ends in a slash, as prerendered pages do', () => {
  render(
    <MemoryRouter initialEntries={['/articles/beta/']}>
      <ChapterList showArticles />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Beta' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
