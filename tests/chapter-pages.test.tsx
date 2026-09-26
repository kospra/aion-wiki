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
      sourceUrl: '',
      searchText: '',
      headings: [],
    },
    {
      slug: 'armor',
      title: 'Armor',
      category: 'gear',
      summary: 'Armor summary',
      status: 'source-backed',
      sourceUrl: '',
      searchText: '',
      headings: [],
    },
    {
      slug: 'active',
      title: 'Active skills',
      category: 'skills',
      summary: 'Skill summary',
      status: 'source-backed',
      sourceUrl: '',
      searchText: '',
      headings: [],
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

it('marks the same article when the path ends in a slash, as prerendered pages do', () => {
  render(
    <MemoryRouter initialEntries={['/articles/armor/']}>
      <ChapterList showArticles />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Armor' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
