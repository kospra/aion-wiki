import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, it } from 'vitest';
import ArticleRoute from '../app/routes/article';
import CategoryRoute from '../app/routes/category';

function renderPath(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/articles/:slug', Component: ArticleRoute },
      { path: '/categories/:slug', Component: CategoryRoute },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

it('shows a known article with a sample notice', () => {
  renderPath('/articles/choosing-your-class');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Choosing your class' }),
  ).toBeVisible();
  expect(screen.getByText('Sample content')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Classes' })).toHaveAttribute(
    'href',
    '/categories/classes',
  );
});

it('shows the selected category and its articles', () => {
  renderPath('/categories/exploration');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Exploration' }),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: /Exploration guide format/ }),
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /Choosing your class/ }),
  ).not.toBeInTheDocument();
});

it.each(['/articles/missing-entry', '/categories/missing-category'])(
  'offers a home link for invalid content at %s',
  (path) => {
    renderPath(path);

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Return to the homepage' }),
    ).toHaveAttribute('href', '/');
  },
);
