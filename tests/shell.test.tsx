import { render, screen, waitFor, within } from './render';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { NotFound } from '../app/components/not-found';
import { SiteHeader } from '../app/components/site-header';
import { categories, staticPaths } from '../app/content/wiki';
import Home from '../app/routes/home';

it('offers the full chapter index and source link through a keyboard-accessible control', async () => {
  const user = userEvent.setup();
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
  const toggle = screen.getByRole('button', { name: /browse chapters/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const control = screen.getByRole('group', { name: 'Browse chapters' });
  expect(
    within(control).getByRole('link', { name: /01 Gear and basics explained/ }),
  ).toHaveAttribute('href', '/categories/gear-and-basics-explained');
  expect(
    within(control).getByRole('link', { name: /12 Class Passives/ }),
  ).toHaveAttribute('href', '/categories/class-passives');
  expect(
    within(control).getByRole('link', { name: /About the source/ }),
  ).toHaveAttribute('href', '/source');
  await user.click(
    within(control).getByRole('link', { name: /01 Gear and basics explained/ }),
  );
  await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
});

it('derives navigation from a newly added category', async () => {
  const user = userEvent.setup();
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
    await user.click(screen.getByRole('button', { name: /browse chapters/i }));
    expect(
      within(screen.getByRole('group', { name: 'Browse chapters' })).getByRole(
        'link',
        { name: /13 Crafting/ },
      ),
    ).toHaveAttribute('href', '/categories/crafting');
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
