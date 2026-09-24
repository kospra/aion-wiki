import catalogue from './catalogue.json' with { type: 'json' };
import type { CatalogueEntry } from './types';

export type Category = {
  slug: string;
  title: string;
  description: string;
};

export const categories: Category[] = catalogue.categories;
export const articles: CatalogueEntry[] =
  catalogue.articles as CatalogueEntry[];
export const staticPaths = [
  '/',
  '/source',
  ...categories.map((category) => `/categories/${category.slug}`),
  ...articles.map((article) => `/articles/${article.slug}`),
];
