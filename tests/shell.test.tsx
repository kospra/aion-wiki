import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { NotFound } from '../app/components/not-found';
import { SiteHeader } from '../app/components/site-header';
import { categories } from '../app/content/wiki';
import Home from '../app/routes/home';

it('exposes an accessible home link and skip link', () => {
  render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: 'Aion 2 Wiki' })).toHaveAttribute(
    'href',
    '/',
  );
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    '#main-content',
  );
  expect(
    screen.getByRole('navigation', { name: 'Main navigation' }),
  ).toBeInTheDocument();
});

it('includes a newly added category in main navigation', () => {
  categories.push({
    slug: 'crafting',
    title: 'Crafting',
    description: 'Crafting guides.',
  });

  try {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Crafting' })).toHaveAttribute(
      'href',
      '/categories/crafting',
    );
  } finally {
    categories.pop();
  }
});
it('offers a way home from an unknown page', () => {
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { name: 'Page not found' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Return to the homepage' }),
  ).toHaveAttribute('href', '/');
});

it('introduces the wiki on the homepage', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { level: 1, name: 'Aion 2 Wiki' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Browse by category' }),
  ).toBeInTheDocument();
});

it('labels every homepage category card as sample content', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  const categorySection = screen.getByRole('region', {
    name: 'Browse by category',
  });
  const categoryLinks = within(categorySection).getAllByRole('link');
  expect(categoryLinks).toHaveLength(3);
  for (const link of categoryLinks) {
    expect(within(link).getByText('Sample content')).toBeVisible();
  }
});
