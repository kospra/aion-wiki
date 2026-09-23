import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { NotFound } from '../app/components/not-found';
import { SiteHeader } from '../app/components/site-header';
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
  render(<Home />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Aion 2 Wiki' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/sample content is coming soon/i),
  ).toBeInTheDocument();
});
