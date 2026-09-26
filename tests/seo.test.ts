// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  canonicalUrl,
  createIndexability,
  renderRobots,
  renderSitemap,
  siteOrigin,
} from '../app/seo';

describe('canonical URLs', () => {
  it('use the site origin, one trailing slash and no query or hash', () => {
    expect(canonicalUrl('/')).toBe(`${siteOrigin}/`);
    expect(canonicalUrl('/articles/alpha')).toBe(
      `${siteOrigin}/articles/alpha/`,
    );
    expect(canonicalUrl('/articles/alpha//?q=1#top')).toBe(
      `${siteOrigin}/articles/alpha/`,
    );
  });
});

describe('indexability', () => {
  const isIndexable = createIndexability({
    categories: [{ slug: 'written' }, { slug: 'mixed' }, { slug: 'pending' }],
    articles: [
      { slug: 'alpha', category: 'written', status: 'source-backed' },
      { slug: 'beta', category: 'mixed', status: 'source-uncertain' },
      { slug: 'gamma', category: 'mixed', status: 'source-pending' },
      { slug: 'delta', category: 'pending', status: 'source-pending' },
    ],
  });

  it('keeps written pages and the chapters that hold them', () => {
    for (const path of [
      '/',
      '/source/',
      '/articles/alpha',
      '/articles/beta/',
      '/categories/written',
      '/categories/mixed/?q=1',
    ])
      expect(isIndexable(path), path).toBe(true);
  });

  it('leaves out placeholders, chapters of placeholders and unknown paths', () => {
    for (const path of [
      '/articles/gamma',
      '/categories/pending',
      '/articles/missing',
      '/categories/missing',
      '/articles/alpha/extra',
      '/elsewhere',
    ])
      expect(isIndexable(path), path).toBe(false);
  });
});

describe('sitemap and robots.txt', () => {
  it('lists escaped absolute URLs and nothing else', () => {
    const xml = renderSitemap([`${siteOrigin}/`, `${siteOrigin}/a&b/`]);
    expect(xml).toContain(`<loc>${siteOrigin}/</loc>`);
    expect(xml).toContain(`<loc>${siteOrigin}/a&amp;b/</loc>`);
    expect(xml).not.toMatch(/lastmod|priority|changefreq/);
  });

  it('allows crawling and names the sitemap', () => {
    const robots = renderRobots();
    expect(robots).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });
});
