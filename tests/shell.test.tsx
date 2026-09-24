import { render, screen, within } from './render';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { NotFound } from '../app/components/not-found';
import { SiteHeader } from '../app/components/site-header';
import { categories, staticPaths } from '../app/content/wiki';
import Home from '../app/routes/home';

it('offers the full chapter index and source link through a keyboard-accessible control', () => {
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
  const control = screen.getByRole('group', { name: 'Browse chapters' });
  expect(
    within(control).getByRole('link', { name: /01 Gear and basics explained/ }),
  ).toHaveAttribute('href', '/categories/gear-and-basics-explained');
  expect(
    within(control).getByRole('link', { name: /12 Class Passives/ }),
  ).toHaveAttribute('href', '/categories/class-passives');
  expect(
    screen.getByRole('link', { name: /About the source/ }),
  ).toHaveAttribute('href', '/source');
});

it('derives navigation from a newly added category', () => {
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
    expect(screen.getByRole('link', { name: /13 Crafting/ })).toHaveAttribute(
      'href',
      '/categories/crafting',
    );
  } finally {
    categories.pop();
  }
});

it('offers recovery from an unknown page', () => {
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Return to the homepage' }),
  ).toHaveAttribute('href', '/');
});

it('introduces the complete sourced guide without sample labels', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole('heading', { level: 1, name: 'Aion 2 Wiki' }),
  ).toBeVisible();
  const chapterSection = screen.getByRole('region', {
    name: 'Browse by category',
  });
  expect(within(chapterSection).getAllByRole('link')).toHaveLength(12);
  expect(screen.queryByText('Sample content')).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /About the source/ }),
  ).toHaveAttribute('href', '/source');
  expect(staticPaths).toHaveLength(57);
  expect(staticPaths).toContain('/source');
});
