import type { CatalogueEntry } from './content/types.ts';
import { articles, categories, staticPaths } from './content/wiki.ts';

// Everything search engines and link previews read comes from this module.
// Imports carry .ts extensions so scripts/verify-static.mjs can load it in Node.
export const siteOrigin = 'https://aion2simple.wiki';
export const siteName = 'Aion 2 Wiki';
export const siteLanguage = 'en';
export const shareCard = {
  path: '/images/share-card.png',
  width: 1200,
  height: 630,
  alt: 'Aion 2 Wiki: Aion 2, explained.',
};
export const guideAuthor = { name: 'Kanon', path: '/source' };

/** Netlify serves each prerendered route as a directory, so its URL ends in a slash. */
export function canonicalUrl(path: string): string {
  const { pathname } = new URL(path, siteOrigin);
  return `${siteOrigin}${pathname.replace(/\/+$/, '')}/`;
}

export type IndexCatalogue = {
  categories: { slug: string }[];
  articles: Pick<CatalogueEntry, 'slug' | 'category' | 'status'>[];
};

/** Placeholder articles, and chapters holding only placeholders, stay out of search. */
export function createIndexability(
  catalogue: IndexCatalogue,
): (path: string) => boolean {
  const written = catalogue.articles.filter(
    (article) => article.status !== 'source-pending',
  );
  return (path) => {
    const route = new URL(path, siteOrigin).pathname.replace(/\/+$/, '') || '/';
    if (route === '/' || route === '/source') return true;
    const [, section, slug, ...rest] = route.split('/');
    if (!slug || rest.length > 0) return false;
    if (section === 'articles')
      return written.some((article) => article.slug === slug);
    if (section === 'categories')
      return (
        catalogue.categories.some((category) => category.slug === slug) &&
        written.some((article) => article.category === slug)
      );
    return false;
  };
}

export const isIndexable = createIndexability({ categories, articles });

export function sitemapUrls(): string[] {
  return staticPaths.filter((path) => isIndexable(path)).map(canonicalUrl);
}

const xmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/** Google ignores priority and changefreq, and no page records an accurate lastmod. */
export function renderSitemap(urls: string[]): string {
  const entries = urls.map(
    (url) =>
      `  <url><loc>${url.replace(/[&<>"']/g, (character) => xmlEntities[character])}</loc></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

export function renderRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`;
}
