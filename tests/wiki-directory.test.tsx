import { render, screen } from './render';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { WikiDirectory } from '../app/components/wiki-directory';
import { articles, categories } from '../app/content/wiki';

function renderDirectory(initialCategory = 'all') {
  render(
    <MemoryRouter>
      <WikiDirectory initialCategory={initialCategory} />
    </MemoryRouter>,
  );
}

it('indexes all 43 articles and searches body-only stat prose with chapter filtering', async () => {
  expect(articles).toHaveLength(43);
  expect(categories).toHaveLength(12);
  const user = userEvent.setup();
  renderDirectory();
  expect(screen.getByRole('status')).toHaveTextContent('43 articles found');
  await user.click(screen.getByRole('button', { name: 'How stats work' }));
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    '  FRONT/BACK DAMAGE BOOST  ',
  );
  expect(
    screen.getByRole('link', {
      name: /Stat efficiency and diminishing returns/,
    }),
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /Gear anatomy and stat layers/ }),
  ).not.toBeInTheDocument();
});

it('finds screenshot-only facts and combines them with chapter filters', async () => {
  const user = userEvent.setup();
  renderDirectory();
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'Keyboard shortcut F',
  );
  expect(
    screen.getByRole('link', { name: /Growth and amplification/ }),
  ).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Wings' }));
  expect(screen.getByText('No articles found')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Enhancement' }));
  expect(
    screen.getByRole('link', { name: /Growth and amplification/ }),
  ).toBeVisible();
});

it('clears search and chapter filters after an empty result', async () => {
  const user = userEvent.setup();
  renderDirectory('class-passives');
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'zzzz-unmatched',
  );
  expect(screen.getByText('No articles found')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('43 articles found');
});
