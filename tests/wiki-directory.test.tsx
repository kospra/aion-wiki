import { render, screen } from './render';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { WikiDirectory } from '../app/components/wiki-directory';

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
      qualifiers: [],
      searchText: 'Armor body-only phrase figure-only detail',
    },
    {
      slug: 'recipes',
      title: 'Recipes',
      category: 'crafting',
      summary: 'Crafting guide',
      status: 'source-backed',
      qualifiers: [],
      searchText: 'Recipes materials',
    },
  ],
}));

function renderDirectory(initialCategory = 'all') {
  render(
    <MemoryRouter>
      <WikiDirectory initialCategory={initialCategory} />
    </MemoryRouter>,
  );
}

it('searches indexed body text regardless of case or surrounding spaces', async () => {
  const user = userEvent.setup();
  renderDirectory();
  expect(screen.getByRole('status')).toHaveTextContent('2 articles found');
  await user.click(screen.getByRole('button', { name: 'Gear' }));
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
  await user.click(screen.getByRole('button', { name: 'Crafting' }));
  expect(screen.getByText('No articles found')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Gear' }));
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
