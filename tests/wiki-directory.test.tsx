import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { WikiDirectory } from '../app/components/wiki-directory';

it('combines normalized title search with a category filter', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <WikiDirectory />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: 'Classes' }));
  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    '  CHOOSING  ',
  );

  expect(
    screen.getByRole('link', { name: /Choosing your class/ }),
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /Welcome to the wiki/ }),
  ).not.toBeInTheDocument();
});

it('recovers from an empty result by clearing both filters', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <WikiDirectory initialCategory="classes" />
    </MemoryRouter>,
  );

  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'zzzz-unmatched',
  );
  expect(screen.getByText('No articles found')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));

  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(
    screen.getByRole('link', { name: /Welcome to the wiki/ }),
  ).toBeVisible();
});

it('finds articles by summary text', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <WikiDirectory />
    </MemoryRouter>,
  );

  await user.type(
    screen.getByRole('searchbox', { name: 'Search articles' }),
    'compare playstyles',
  );

  expect(
    screen.getByRole('link', { name: /Choosing your class/ }),
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /Welcome to the wiki/ }),
  ).not.toBeInTheDocument();
});
