// @vitest-environment node
import type { MetaDescriptor } from 'react-router';
import { describe, expect, it } from 'vitest';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  canonicalUrl,
  createIndexability,
  notFoundMeta,
  pageMeta,
  renderRobots,
  renderSitemap,
  siteOrigin,
} from '../app/seo';

const entry = (meta: MetaDescriptor[], key: string, value: string) =>
  meta.find((item) => (item as Record<string, unknown>)[key] === value) as
    Record<string, unknown> | undefined;
const structuredData = (meta: MetaDescriptor[]) =>
  meta.filter((item) => 'script:ld+json' in item);

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

describe('page metadata', () => {
  it('gives an indexable page a canonical link that matches og:url', () => {
    const meta = pageMeta({
      path: '/',
      title: 'Home | Site',
      description: 'About the site.',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Thing' }],
    });
    const canonical = entry(meta, 'rel', 'canonical');
    expect(canonical?.href).toBe(`${siteOrigin}/`);
    expect(entry(meta, 'property', 'og:url')?.content).toBe(canonical?.href);
    expect(entry(meta, 'property', 'og:image')?.content).toMatch(
      new RegExp(`^${siteOrigin}/`),
    );
    expect(entry(meta, 'name', 'robots')?.content).not.toMatch(/noindex/);
    expect(structuredData(meta)).toHaveLength(1);
  });

  it('marks other pages noindex without a canonical link or structured data', () => {
    for (const meta of [
      pageMeta({
        path: '/articles/not-a-page',
        title: 'Missing',
        description: 'Missing.',
        jsonLd: [{ '@type': 'Thing' }],
      }),
      notFoundMeta(),
    ]) {
      expect(entry(meta, 'name', 'robots')?.content).toBe('noindex');
      expect(entry(meta, 'rel', 'canonical')).toBeUndefined();
      expect(structuredData(meta)).toHaveLength(0);
    }
  });
});

describe('structured data', () => {
  it('numbers breadcrumbs from one and leaves the last URL to the page', () => {
    const { itemListElement } = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Chapter', path: '/categories/c' },
      { name: 'Article', path: '/articles/a' },
    ]) as { itemListElement: Record<string, unknown>[] };
    expect(itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(itemListElement.map((item) => item.item)).toEqual([
      `${siteOrigin}/`,
      `${siteOrigin}/categories/c/`,
      undefined,
    ]);
  });

  it('lists each article figure of at least 50,000 pixels once, as an absolute URL', () => {
    const article = (
      figures: { src: string; width: number; height: number }[],
    ) =>
      articleJsonLd({
        path: '/articles/a',
        title: 'A',
        description: 'About A.',
        sourceUrl: 'https://example.com/guide',
        figures,
      });
    expect(
      article([
        { src: '/images/big.png', width: 500, height: 100 },
        { src: '/images/icon.png', width: 52, height: 53 },
        { src: '/images/big.png', width: 500, height: 100 },
      ]).image,
    ).toEqual([`${siteOrigin}/images/big.png`]);
    expect(article([])).not.toHaveProperty('image');
  });
});
