import type { MetaDescriptor } from 'react-router';
import type { CatalogueEntry, Figure } from './content/types.ts';
import { articles, categories, staticPaths } from './content/wiki.ts';

// Everything search engines and link previews read comes from this module.
// Imports carry .ts extensions so scripts/verify-static.mjs can load it in Node.
export const siteOrigin = 'https://aion2simple.wiki';
export const siteName = 'Aion 2 Wiki';
// The domain's own name, so Google can pair the brand with "aion2simple".
export const siteAlternateNames = ['Aion 2 Simple Wiki', 'aion2simple.wiki'];
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

/** Topic first, then the words people search with: "<topic> – Aion 2 Guide | Aion 2 Wiki". */
export function guideTitle(topic: string): string {
  return `${topic} – Aion 2 Guide | ${siteName}`;
}

export type JsonLd = Record<string, unknown>;

const schemaContext = 'https://schema.org';
// Google's minimum size for structured-data images, as width × height.
const minImagePixels = 50_000;

/** Title, description, canonical link, link previews and structured data for one page. */
export function pageMeta({
  path,
  title,
  description,
  type = 'website',
  jsonLd = [],
}: {
  path: string;
  title: string;
  description: string;
  type?: 'website' | 'article';
  jsonLd?: JsonLd[];
}): MetaDescriptor[] {
  const url = canonicalUrl(path);
  const indexable = isIndexable(path);
  return [
    { title },
    { name: 'description', content: description },
    ...(indexable
      ? [
          { tagName: 'link', rel: 'canonical', href: url },
          { name: 'robots', content: 'max-image-preview:large' },
        ]
      : [{ name: 'robots', content: 'noindex' }]),
    { property: 'og:site_name', content: siteName },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: `${siteOrigin}${shareCard.path}` },
    { property: 'og:image:width', content: String(shareCard.width) },
    { property: 'og:image:height', content: String(shareCard.height) },
    { property: 'og:image:alt', content: shareCard.alt },
    { name: 'twitter:card', content: 'summary_large_image' },
    ...(indexable ? jsonLd.map((data) => ({ 'script:ld+json': data })) : []),
  ];
}

export function notFoundMeta(): MetaDescriptor[] {
  return [
    { title: `Page not found | ${siteName}` },
    { name: 'robots', content: 'noindex' },
  ];
}

/** Google reads the site name from WebSite data on the home page. */
export function websiteJsonLd(description: string): JsonLd {
  return {
    '@context': schemaContext,
    '@type': 'WebSite',
    name: siteName,
    alternateName: siteAlternateNames,
    url: canonicalUrl('/'),
    inLanguage: siteLanguage,
    description,
  };
}

/** The visible breadcrumb trail. Google takes the last item's URL from the page. */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
): JsonLd {
  return {
    '@context': schemaContext,
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(({ name, path }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      ...(index < trail.length - 1 ? { item: canonicalUrl(path) } : {}),
    })),
  };
}

export function articleJsonLd({
  path,
  title,
  description,
  sourceUrl,
  figures,
}: {
  path: string;
  title: string;
  description: string;
  sourceUrl: string;
  figures: Pick<Figure, 'src' | 'width' | 'height'>[];
}): JsonLd {
  const url = canonicalUrl(path);
  const images = [
    ...new Set(
      figures
        .filter(({ width, height }) => width * height >= minImagePixels)
        .map(({ src }) => new URL(src, siteOrigin).href),
    ),
  ];
  return {
    '@context': schemaContext,
    '@type': 'Article',
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: siteLanguage,
    isPartOf: { '@type': 'WebSite', name: siteName, url: canonicalUrl('/') },
    author: {
      '@type': 'Person',
      name: guideAuthor.name,
      url: canonicalUrl(guideAuthor.path),
    },
    isBasedOn: sourceUrl,
    ...(images.length > 0 ? { image: images } : {}),
  };
}
