import { render, screen } from './render';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { WikiDirectory } from '../app/components/wiki-directory';
import Home from '../app/routes/home';
import { SiteHeader } from '../app/components/site-header';

vi.mock('../app/content/wiki', () => ({
  categories: [
    { slug: 'gear', title: 'Gear', description: '' },
    { slug: 'crafting', title: 'Crafting', description: '' },
  ],
  articles: [
    {
      slug: 'armor',
      title: 'Armor',
      category: 'gear',
      summary: 'Armor guide',
      status: 'source-backed',
      searchText: 'Armor body-only phrase figure-only detail',
    },
    {
      slug: 'recipes',
      title: 'Recipes',
      category: 'crafting',
      summary: 'Crafting guide',
      status: 'source-backed',
      searchText: 'Recipes materials Erroded Wings',
    },
  ],
}));

function renderDirectory(initialCategory = 'all', discover = false) {
  render(
    <MemoryRouter>
      <WikiDirectory initialCategory={initialCategory} discover={discover} />
    </MemoryRouter>,
  );
}

it('searches indexed body text regardless of case or surrounding spaces', async () => {
  const user = userEvent.setup();
  renderDirectory();
  expect(screen.getByRole('status')).toHaveTextContent('2 articles found');
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Filter by category' }),
    'gear',
  );
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    '  BODY-ONLY PHRASE  ',
  );
  expect(
    screen.getByRole('link', {
      name: /Armor/,
    }),
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /Recipes/ }),
  ).not.toBeInTheDocument();
});

it('finds screenshot-only facts and combines them with chapter filters', async () => {
  const user = userEvent.setup();
  renderDirectory();
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'figure-only detail',
  );
  expect(screen.getByRole('link', { name: /Armor/ })).toBeVisible();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Filter by category' }),
    'crafting',
  );
  expect(screen.getByText('No articles found')).toBeVisible();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Filter by category' }),
    'gear',
  );
  expect(screen.getByRole('link', { name: /Armor/ })).toBeVisible();
});

it('clears search and chapter filters after an empty result', async () => {
  const user = userEvent.setup();
  renderDirectory('gear');
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'zzzz-unmatched',
  );
  expect(screen.getByText('No articles found')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('2 articles found');
});

it('clears a search immediately and returns focus to the search field', async () => {
  const user = userEvent.setup();
  renderDirectory();
  const search = screen.getByRole('searchbox', { name: 'Search articles' });
  await user.type(search, 'materials');
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(search).toHaveValue('');
  expect(search).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('2 articles found');
});

it('switches from chapter browsing to article search and back', async () => {
  const user = userEvent.setup();
  renderDirectory('all', true);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  const search = screen.getByRole('searchbox', { name: 'Search articles' });
  await user.type(search, 'body-only');
  expect(screen.getByRole('link', { name: /Armor/ })).toHaveAttribute(
    'href',
    '/articles/armor',
  );
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(
    screen
      .getAllByRole('link', { name: /Gear/ })
      .every((link) => link.getAttribute('href') === '/categories/gear'),
  ).toBe(true);
});

it('returns to chapter browsing when Chapters is selected during a home search', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SiteHeader />
      <Home />
    </MemoryRouter>,
  );
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'materials',
  );
  expect(screen.getByRole('status')).toHaveTextContent('1 article found');
  await user.click(screen.getByRole('link', { name: 'Chapters' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(document.getElementById('chapters')).not.toBeNull();
});

it('finds the guide’s spelling variants of a word', async () => {
  const user = userEvent.setup();
  renderDirectory();
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'eroded',
  );
  expect(screen.getByRole('link', { name: /Recipes/ })).toBeVisible();
  expect(screen.queryByRole('link', { name: /Armor/ })).not.toBeInTheDocument();
});

it('keeps matching a variant spelling while it is typed', async () => {
  const user = userEvent.setup();
  renderDirectory();
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'errode',
  );
  expect(screen.getByRole('link', { name: /Recipes/ })).toBeVisible();
});
