import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, it } from 'vitest';
import ArticleRoute from '../app/routes/article';
import CategoryRoute from '../app/routes/category';
import SourceRoute from '../app/routes/source';
import {
  figures,
  getPage,
  pages,
  sourceLinks,
} from '../app/content/repository';
import baseline from '../content/source/baseline.json';
import coverageA from '../content/coverage/group-a.json';
import coverageB from '../content/coverage/group-b.json';
import coverageC from '../content/coverage/group-c.json';
import { validateGuide } from '../scripts/content-integrity';
import type { CoverageEntry, SourceBaseline } from '../app/content/types';

function renderPath(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/source', Component: SourceRoute },
      { path: '/articles/:slug', Component: ArticleRoute },
      { path: '/categories/:slug', Component: CategoryRoute },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

it('loads 44 full pages and resolves original cross-article anchors and video timestamps', () => {
  expect(pages).toHaveLength(44);
  expect(getPage('class-passives')?.status).toBe('source-pending');
  expect(sourceLinks['block-0408']).toContain('#block-0408');
  expect(sourceLinks['#h.u6i0vc6bqc0l']).toBe(sourceLinks['block-0408']);
  expect(sourceLinks['#h.u6i0vc6bqc0l']).toContain('/articles/');
  const wrapped =
    'https://www.google.com/url?q=https://youtu.be/XFdyimL2_Mk?si%3DnLHur9uEroXt3v6l%26t%3D377&sa=D&source=editors&ust=1790212444478255&usg=AOvVaw1Aeqfoi7ZjngWIDzvyuTDP';
  expect(sourceLinks[wrapped]).toContain('t=377');
});

it('renders source overview, attribution, and a source link', () => {
  renderPath('/source');
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'About the source and author',
    }),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: /Original source document/ }),
  ).toHaveAttribute('href', expect.stringContaining('docs.google.com'));
  expect(
    screen.getByRole('navigation', { name: 'On this page' }),
  ).toBeInTheDocument();
});

it('renders article breadcrumbs, TOC, rich body, source status, and next boundary', () => {
  renderPath('/articles/gear-anatomy-and-stat-layers');
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Gear anatomy and stat layers',
    }),
  ).toBeVisible();
  expect(
    within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole(
      'link',
      { name: 'Gear and basics explained' },
    ),
  ).toHaveAttribute('href', '/categories/gear-and-basics-explained');
  expect(
    screen.getByRole('navigation', { name: 'On this page' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /Next: Pantheon stats and statues/ }),
  ).toHaveAttribute('href', '/articles/pantheon-stats-and-statues');
  expect(
    screen.queryByRole('link', { name: /Previous:/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /Original source document/ }),
  ).toBeInTheDocument();
  expect(document.getElementById('block-0027')).toBeInTheDocument();
});

it('shows pending chapter disclosure and previous boundary', () => {
  renderPath('/articles/class-passives');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Class Passives' }),
  ).toBeVisible();
  expect(screen.getAllByText(/Coming soon/).length).toBeGreaterThan(0);
  expect(screen.getByText(/source pending/i)).toBeVisible();
  expect(
    screen.getByRole('link', {
      name: /Previous: Damage formula and Pure Attack/,
    }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Next:/ })).not.toBeInTheDocument();
});

it('shows selected chapter and its articles', () => {
  renderPath('/categories/pet-genus');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Pet Genus' }),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: /Insight levels and efficient analysis/ }),
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /Growth and amplification/ }),
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
it('validates the assembled full guide without external destinations', () => {
  const coverage = [
    ...coverageA,
    ...coverageB,
    ...coverageC,
  ] as CoverageEntry[];
  expect(
    validateGuide({
      baseline: baseline as SourceBaseline,
      pages,
      figures,
      coverage,
    }),
  ).toEqual([]);
});
