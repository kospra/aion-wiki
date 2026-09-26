# Search visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every page of `https://aion2simple.wiki` a canonical URL, link-preview tags and structured data. Publish a sitemap and `robots.txt`, and keep placeholder pages out of search.

**Architecture:**

- One module, `app/seo.ts`, owns the origin, the canonical-URL and indexability rules, the page metadata, the JSON-LD builders and the sitemap/robots renderers.
- Route `meta` exports call it.
- `scripts/prepare-static.mjs` writes `sitemap.xml` and `robots.txt` after the React Router build.
- `scripts/verify-static.mjs` fails the build unless page heads and the sitemap agree.
- A one-off Playwright script renders the committed share card.

**Tech Stack:** React Router 8.4 (static prerender, `meta` exports), TypeScript 6, Vitest 5, jsdom 30, Playwright 1.63, Node 24.21.0, npm 12.1.0.

**Spec:** `docs/superpowers/specs/2026-09-26-search-visibility-design.md`

## Global Constraints

- Content untouched: guide text, titles, summaries, links and figures stay as they are. Page titles and descriptions keep their current strings.
- Static and deterministic: everything is written into `build/client` at build time from committed files. There is no runtime code, build timestamp or git-history input.
- One source of truth: the origin, site name, author and share card are defined once, in `app/seo.ts`.
- Light pages stay light: `app/seo.ts` may import `app/content/wiki.ts` but never `app/content/repository.ts`.
- `app/seo.ts` imports carry explicit `.ts` extensions and it contains no JSX, so plain Node can import it.
- Checks only grow: the integrity and static validators keep every guarantee.
- Tests assert generic behavior with small fixtures, never article wording, game values or catalogue counts (`AGENTS.md`).
- Origin `https://aion2simple.wiki`, site name "Aion 2 Wiki", author "Kanon" (`/source`), share card `/images/share-card.png` at 1200×630.
- Commits carry no Claude attribution. Nothing is pushed or deployed.

## Environment

- Edit files only in the worktree `WT=/mnt/c/code/aion-wiki/.claude/worktrees/search-visibility`, and run git there.
- Run npm only in the Linux mirror `MIRROR=/tmp/claude-1000/-mnt-c-code-aion-wiki/61d1f285-f0df-40bf-8f03-5200514fd75d/scratchpad/sv-mirror`. Builds on `/mnt/c` time out, and the main checkout's `node_modules` are Windows-native.
- Every `Run:` line means: sync, then run the command in the mirror with Node 24.21.0 first on `PATH`:

  ```bash
  rsync -a --delete --exclude=/node_modules --exclude=/build --exclude=/.react-router --exclude=/.git --exclude=/.local-tools --exclude=/coverage "$WT/" "$MIRROR/"
  cd "$MIRROR" && PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/usr/bin:/bin <command>
  ```

- **Format** with the mirror's Prettier aimed at worktree files, then sync:

  ```bash
  cd "$MIRROR" && PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/usr/bin:/bin npx prettier --write <worktree paths>
  ```

- **Before every commit**, `rsync -anci <same excludes> "$WT/" "$MIRROR/" | grep '^>f'` prints nothing. The tree that was verified is then the tree that gets committed.

## Review Focus

1. **Route variants:** a query, hash, doubled slash or missing trailing slash must still give the page's one canonical URL. Task 1 pins it.
2. **Mixed chapters:** a chapter holding written and placeholder articles stays indexable; only chapters of placeholders drop out. Task 1 pins it.
3. **Unknown slugs and the 404 route:** they get `noindex` and never a canonical link or structured data. Task 2 pins it.
4. **Tiny or repeated figures:** icons below 50,000 pixels are not Article images, and a figure used twice is listed once. Task 2 pins it.
5. **HTML at `/robots.txt` or `/sitemap.xml`:** a host SPA fallback or soft 404 there must fail the deployment smoke check. Task 5 pins it.

---

### Task 1: Canonical URLs, indexability, sitemap and robots.txt

**Files:**

- Create: `app/seo.ts`
- Create: `tests/seo.test.ts`

**Interfaces:**

- Consumes: `articles`, `categories`, `staticPaths` from `app/content/wiki.ts`; `CatalogueEntry` from `app/content/types.ts`.
- Produces:
  - `siteOrigin: string`, `siteName: string`, `siteLanguage: string`
  - `shareCard: { path: string; width: number; height: number; alt: string }`
  - `guideAuthor: { name: string; path: string }`
  - `canonicalUrl(path: string): string`
  - `type IndexCatalogue = { categories: { slug: string }[]; articles: Pick<CatalogueEntry, 'slug' | 'category' | 'status'>[] }`
  - `createIndexability(catalogue: IndexCatalogue): (path: string) => boolean`
  - `isIndexable(path: string): boolean`
  - `sitemapUrls(): string[]`
  - `renderSitemap(urls: string[]): string`
  - `renderRobots(): string`

- [ ] **Step 1: Write the failing tests**

Create `tests/seo.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/seo.test.ts`
Expected: FAIL, because `../app/seo` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `app/seo.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/seo.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Format, lint and type-check**

Format `app/seo.ts` and `tests/seo.test.ts`. Then run: `npx eslint app/seo.ts tests/seo.test.ts --max-warnings 0 && npm run typecheck`
Expected: no output from ESLint, and `tsc` exits 0.

- [ ] **Step 6: Commit**

```bash
git -C "$WT" add app/seo.ts tests/seo.test.ts
git -C "$WT" commit -m "Add canonical URLs, indexability and sitemap rendering"
```

---

### Task 2: Page metadata and structured data

**Files:**

- Modify: `app/seo.ts`, adding the builders at the end
- Modify: `tests/seo.test.ts`

**Interfaces:**

- Consumes: everything Task 1 produces; `MetaDescriptor` from `react-router`; `Figure` from `app/content/types.ts`.
- Produces:
  - `type JsonLd = Record<string, unknown>`
  - `pageMeta(options: { path: string; title: string; description: string; type?: 'website' | 'article'; jsonLd?: JsonLd[] }): MetaDescriptor[]`
  - `notFoundMeta(): MetaDescriptor[]`
  - `websiteJsonLd(description: string): JsonLd`
  - `breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd`
  - `articleJsonLd(options: { path: string; title: string; description: string; sourceUrl: string; figures: Pick<Figure, 'src' | 'width' | 'height'>[] }): JsonLd`

- [ ] **Step 1: Write the failing tests**

In `tests/seo.test.ts`, replace the import block with:

```ts
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
    | Record<string, unknown>
    | undefined;
const structuredData = (meta: MetaDescriptor[]) =>
  meta.filter((item) => 'script:ld+json' in item);
```

Append:

```ts
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
    const article = (figures: { src: string; width: number; height: number }[]) =>
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/seo.test.ts`
Expected: FAIL, because `pageMeta`, `notFoundMeta`, `breadcrumbJsonLd` and `articleJsonLd` are not exported (`is not a function`).

- [ ] **Step 3: Write the implementation**

In `app/seo.ts`, replace the first import line with:

```ts
import type { MetaDescriptor } from 'react-router';
import type { CatalogueEntry, Figure } from './content/types.ts';
```

Append to `app/seo.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/seo.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Format, lint and type-check**

Format both files. Then run: `npx eslint app/seo.ts tests/seo.test.ts --max-warnings 0 && npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git -C "$WT" add app/seo.ts tests/seo.test.ts
git -C "$WT" commit -m "Add page metadata and structured data builders"
```

---

### Task 3: Share card

**Files:**

- Create: `scripts/render-share-card.mjs`
- Create: `public/images/share-card.png`, generated and committed
- Modify: `DESIGN.md`, adding a Components bullet

**Interfaces:**

- Consumes: nothing from earlier tasks. `shareCard.path` in `app/seo.ts` names the output file.
- Produces: `public/images/share-card.png`, 1200×630 and under 200 KB, which Task 4's static checks require.

- [ ] **Step 1: Write the script**

Create `scripts/render-share-card.mjs`:

```js
/* global document */
// Renders the 1200×630 link-preview card (og:image) from the site's own copy
// and DESIGN.md colors. Run it by hand after `npx playwright install chromium`:
//   node scripts/render-share-card.mjs
// Builds never run it; the PNG is committed.
import assert from 'node:assert/strict';
import console from 'node:console';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const output = 'public/images/share-card.png';
const require = createRequire(import.meta.url);
const font = await readFile(
  require.resolve(
    '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  ),
);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'Inter Variable';
        font-weight: 100 900;
        src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');
      }
      * { box-sizing: border-box; margin: 0; }
      body {
        width: 1200px;
        height: 630px;
        padding: 80px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #000000;
        color: #fafafa;
        font-family: 'Inter Variable', sans-serif;
      }
      .wordmark { font-size: 32px; font-weight: 600; }
      .eyebrow { color: #5eead4; font-size: 22px; font-weight: 600; letter-spacing: 0.12em; }
      h1 { margin: 12px 0 20px; font-size: 104px; font-weight: 600; line-height: 1.05; letter-spacing: -0.02em; }
      .lede { color: #a1a1aa; font-size: 34px; }
      .domain { color: #5eead4; font-size: 28px; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="wordmark">AION 2 / WIKI</div>
    <div>
      <div class="eyebrow">THE COMMUNITY FIELD GUIDE</div>
      <h1>Aion 2, explained.</h1>
      <div class="lede">Equipment, progression and combat.</div>
    </div>
    <div class="domain">aion2simple.wiki</div>
  </body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  const interLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (face) =>
        face.family.replace(/["']/g, '') === 'Inter Variable' &&
        face.status === 'loaded',
    );
  });
  assert.ok(interLoaded, 'Inter Variable did not load');
  await page.screenshot({ path: output, type: 'png' });
} finally {
  await browser.close();
}
const { size } = await stat(output);
assert.ok(size < 200 * 1024, `${output} is ${size} bytes; keep it under 200 KB`);
console.log(`Wrote ${output} (${size} bytes)`);
```

- [ ] **Step 2: Render the card and bring it back to the worktree**

Run: `node scripts/render-share-card.mjs`
Expected: `Wrote public/images/share-card.png (<bytes> bytes)`, under 204800 bytes.

Then copy the file back and check its dimensions:

```bash
cp "$MIRROR/public/images/share-card.png" "$WT/public/images/share-card.png"
file "$WT/public/images/share-card.png"
```

Expected: `PNG image data, 1200 x 630`.

- [ ] **Step 3: Look at the card**

Open `$WT/public/images/share-card.png`. Check four things:

- all text is in Inter and inside the central 1200×600 band;
- the wordmark sits top-left, the eyebrow, heading and lede sit in the middle, and the domain sits bottom-left;
- nothing is clipped;
- colors match DESIGN.md: black canvas, near-white text, gray lede and teal accents.

If anything is off, adjust the CSS in the script and repeat Step 2.

- [ ] **Step 4: Record the card in DESIGN.md**

In `DESIGN.md` → `## Components`, add this bullet after the `Pending content, source overview, errors and 404…` bullet:

```markdown
- The share card `public/images/share-card.png` is the 1200×630 link preview (`og:image`) for every page; `app/seo.ts` points to it. On the black canvas it repeats existing copy: the "AION 2 / WIKI" wordmark, the teal "THE COMMUNITY FIELD GUIDE" eyebrow, "Aion 2, explained.", "Equipment, progression and combat." in muted gray, and the domain in teal, in Inter Variable with 80px margins. Rerender it with `node scripts/render-share-card.mjs` (needs Playwright Chromium) when that copy or the palette changes; builds never run it.
```

- [ ] **Step 5: Format and lint**

Format `scripts/render-share-card.mjs` and `DESIGN.md`. Then run: `npx eslint scripts/render-share-card.mjs --max-warnings 0 && npx prettier --check scripts/render-share-card.mjs DESIGN.md`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git -C "$WT" add scripts/render-share-card.mjs public/images/share-card.png DESIGN.md
git -C "$WT" commit -m "Add the link-preview share card"
```

---

### Task 4: Search metadata in the static build

**Files:**

- Modify: `tests/static-publish-root.test.mjs`, in the fixture file list
- Modify: `scripts/verify-static.mjs`: the import, `allowedTopLevel`, a new `checkSearchMetadata`, the route loop, sitemap/robots checks and the result log
- Modify: `app/routes/home.tsx`, `category.tsx`, `article.tsx`, `source.tsx` and `not-found.tsx`, in their `meta` exports
- Modify: `scripts/prepare-static.mjs`
- Modify: `netlify.toml`

**Interfaces:**

- Consumes: `canonicalUrl`, `isIndexable`, `siteOrigin`, `sitemapUrls`, `renderSitemap`, `renderRobots` (Task 1); `pageMeta`, `notFoundMeta`, `websiteJsonLd`, `breadcrumbJsonLd`, `articleJsonLd` (Task 2); `public/images/share-card.png` (Task 3); `walkBlocks` from `app/content/reader.ts`; `getPage`, `figureById`, `pagePath` from `app/content/repository.ts`.
- Produces: `build/client/sitemap.xml` and `build/client/robots.txt`, which Task 5's live smoke check expects after a deploy.

- [ ] **Step 1: Write the failing publish-root test**

In `tests/static-publish-root.test.mjs`, change the fixture file list in `beforeEach` to:

```js
  for (const file of [
    '404.html',
    '__spa-fallback.html',
    'favicon.svg',
    'index.html',
    'robots.txt',
    'sitemap.xml',
  ])
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/static-publish-root.test.mjs`
Expected: FAIL in "accepts a normal static publish root…" with `Forbidden publish artifact: …robots.txt`.

- [ ] **Step 3: Allow the two files**

In `scripts/verify-static.mjs` → `verifyPublishRoot`, make `allowedTopLevel`:

```js
  const allowedTopLevel = new Set([
    '404.html',
    '__spa-fallback.html',
    'favicon.svg',
    'index.html',
    'robots.txt',
    'sitemap.xml',
    'articles',
    'assets',
    'categories',
    'images',
    'source',
  ]);
```

Run: `npm test -- tests/static-publish-root.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 4: Add the build checks**

In `scripts/verify-static.mjs`, add after the `validateGuide` import:

```js
import { canonicalUrl, isIndexable, siteOrigin } from '../app/seo.ts';
```

Add above `verifyPublishRoot`:

```js
// Search engines see one canonical URL per indexable page and noindex on every
// other page; link previews need an absolute image on the site's own origin.
function checkSearchMetadata(route, document) {
  const url = canonicalUrl(route);
  const indexable = isIndexable(route);
  const canonical = [
    ...document.querySelectorAll('link[rel="canonical"]'),
  ].map((link) => link.getAttribute('href'));
  const robots =
    document.querySelector('meta[name="robots"]')?.getAttribute('content') ??
    '';
  if (indexable) {
    assert.deepEqual(canonical, [url], `${route}: canonical link`);
    assert.doesNotMatch(robots, /noindex/, `${route}: indexable but noindex`);
  } else {
    assert.deepEqual(canonical, [], `${route}: noindex page with canonical`);
    assert.match(robots, /noindex/, `${route}: missing noindex`);
  }
  assert.equal(
    document
      .querySelector('meta[property="og:url"]')
      ?.getAttribute('content'),
    url,
    `${route}: og:url`,
  );
  const image =
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content') ?? '';
  assert.ok(image.startsWith(`${siteOrigin}/`), `${route}: og:image origin`);
  for (const script of document.querySelectorAll(
    'script[type="application/ld+json"]',
  ))
    for (const item of [JSON.parse(script.textContent)].flat())
      assert.equal(
        item['@context'],
        'https://schema.org',
        `${route}: structured data context`,
      );
  return { indexed: indexable ? url : undefined, image: new URL(image).pathname };
}
```

In `verifyStatic`, declare `const indexedUrls = new Set();` next to `const assetPaths = new Set();`. In the route loop, directly after `documents.set(route, document);`, add:

```js
    const search = checkSearchMetadata(route, document);
    if (search.indexed) indexedUrls.add(search.indexed);
    assetPaths.add(search.image);
```

After the `for (const figure of input.figures)` hash loop, add:

```js
  const sitemap = new JSDOM(await readFile(join(root, 'sitemap.xml'), 'utf8'), {
    contentType: 'application/xml',
  }).window;
  const urlset = sitemap.document.documentElement;
  assert.equal(urlset.localName, 'urlset', 'Sitemap root');
  assert.equal(
    urlset.namespaceURI,
    'http://www.sitemaps.org/schemas/sitemap/0.9',
    'Sitemap namespace',
  );
  const sitemapLocs = [...urlset.getElementsByTagName('loc')].map((loc) =>
    loc.textContent.trim(),
  );
  sitemap.close();
  assert.equal(
    new Set(sitemapLocs).size,
    sitemapLocs.length,
    'Sitemap URLs must be unique',
  );
  assert.deepEqual(
    new Set(sitemapLocs),
    indexedUrls,
    'Sitemap must list exactly the indexable canonical URLs',
  );
  const robots = await readFile(join(root, 'robots.txt'), 'utf8');
  assert.ok(
    robots.split('\n').includes(`Sitemap: ${siteOrigin}/sitemap.xml`),
    'robots.txt must name the sitemap',
  );
  assert.doesNotMatch(
    robots,
    /^Disallow:\s*\/\s*$/m,
    'robots.txt must not block the site',
  );
```

Change the result object to:

```js
  const result = {
    routes: documents.size,
    blocks: checkedBlocks,
    figures: input.figures.length,
    localAssets: assetPaths.size,
    sitemapUrls: sitemapLocs.length,
  };
```

- [ ] **Step 5: Run the build to verify it fails**

Run: `npm run build`
Expected: FAIL in `verify:static`, with `/: canonical link`, because no route emits a canonical link yet.

- [ ] **Step 6: Wire the routes**

Change `app/routes/home.tsx` to:

```tsx
import { WikiDirectory } from '../components/wiki-directory';
import { useLocation } from 'react-router';
import { pageMeta, websiteJsonLd } from '../seo';

const description =
  'An Aion 2 progression reference based on Kanon’s guide: gear, enhancement, Arcana, Daevanion, Genus and damage formulas.';

export function meta() {
  return pageMeta({
    path: '/',
    title: 'Aion 2 Wiki | Kanon guide reference',
    description,
    jsonLd: [websiteJsonLd(description)],
  });
}

export default function Home(): React.JSX.Element {
  const location = useLocation();
  return <WikiDirectory key={location.key} discover />;
}
```

In `app/routes/category.tsx`, add `import { breadcrumbJsonLd, notFoundMeta, pageMeta } from '../seo';` after the `wiki` import, and replace `meta` with:

```tsx
export function meta({ params }: { params: { slug?: string } }) {
  const category = categories.find(({ slug }) => slug === params.slug);
  if (!category) return notFoundMeta();
  const path = `/categories/${category.slug}`;
  return pageMeta({
    path,
    title: `${category.title} | Aion 2 Wiki`,
    description: category.description,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Discover', path: '/' },
        { name: category.title, path },
      ]),
    ],
  });
}
```

In `app/routes/article.tsx`:

- add `import { walkBlocks } from '../content/reader';`;
- add `import { articleJsonLd, breadcrumbJsonLd, notFoundMeta, pageMeta } from '../seo';`;
- replace `meta` with:

```tsx
export function meta({ params }: { params: { slug?: string } }) {
  const page = params.slug ? getPage(params.slug) : undefined;
  const category = categories.find((item) => item.slug === page?.category);
  if (!page || !category) return notFoundMeta();
  const path = pagePath(page.slug);
  const figures = walkBlocks(page.blocks).flatMap((block) =>
    block.kind === 'figure' && figureById[block.figureId]
      ? [figureById[block.figureId]]
      : [],
  );
  return pageMeta({
    path,
    title: `${page.title} | Aion 2 Wiki`,
    description: page.summary,
    type: 'article',
    jsonLd: [
      articleJsonLd({
        path,
        title: page.title,
        description: page.summary,
        sourceUrl: page.sourceUrl,
        figures,
      }),
      breadcrumbJsonLd([
        { name: 'Discover', path: '/' },
        { name: category.title, path: `/categories/${category.slug}` },
        { name: page.title, path },
      ]),
    ],
  });
}
```

Change `app/routes/source.tsx` to:

```tsx
import { GuidePageView } from './article';
import { getPage } from '../content/repository';
import { breadcrumbJsonLd, pageMeta } from '../seo';

export function meta() {
  const page = getPage('about-the-source-and-author');
  return pageMeta({
    path: '/source',
    title: 'About the source and author | Aion 2 Wiki',
    description: page?.summary ?? 'Source attribution and context.',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Discover', path: '/' },
        { name: page?.title ?? 'About the source and author', path: '/source' },
      ]),
    ],
  });
}

export default function SourceRoute(): React.JSX.Element {
  const page = getPage('about-the-source-and-author');
  if (!page) throw new Error('Source overview is missing');
  return <GuidePageView page={page} />;
}
```

Change `app/routes/not-found.tsx` to:

```tsx
import { NotFound } from '../components/not-found';
import { notFoundMeta } from '../seo';

export function meta() {
  return notFoundMeta();
}

export default function NotFoundRoute(): React.JSX.Element {
  return <NotFound />;
}
```

- [ ] **Step 7: Write the sitemap and robots.txt after the build**

Change `scripts/prepare-static.mjs` to:

```js
import { writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { renderNotFoundDocument } = await server.ssrLoadModule(
    '/scripts/static-not-found.tsx',
  );
  await writeFile('build/client/404.html', renderNotFoundDocument(), 'utf8');
  const { renderRobots, renderSitemap, sitemapUrls } =
    await server.ssrLoadModule('/app/seo.ts');
  await writeFile(
    'build/client/sitemap.xml',
    renderSitemap(sitemapUrls()),
    'utf8',
  );
  await writeFile('build/client/robots.txt', renderRobots(), 'utf8');
} finally {
  await server.close();
}
```

- [ ] **Step 8: Keep the SPA shell out of the index**

In `netlify.toml`, add after the `/*` headers block:

```toml
[[headers]]
  for = "/__spa-fallback.html"
  [headers.values]
    X-Robots-Tag = "noindex"
```

- [ ] **Step 9: Run the build to verify it passes**

Run: `npm run build`
Expected: PASS, ending with `Verified static guide: {"routes":57,…,"sitemapUrls":55}`.

- [ ] **Step 10: Read the output**

Run in the mirror:

```bash
grep -c '<loc>' build/client/sitemap.xml
cat build/client/robots.txt
for f in index.html categories/gear-and-basics-explained/index.html articles/theostones/index.html source/index.html articles/class-passives/index.html; do echo "== $f"; grep -oE '<(link rel="canonical"|meta (name|property)="(robots|og:url|og:type|og:image)")[^>]*>' "build/client/$f"; grep -o '"@type":"[A-Za-z]*"' "build/client/$f" | sort | uniq -c; done
```

Expected:

- 55 `<loc>` entries, and the robots file from the spec;
- canonical links with trailing slashes on the first four pages;
- `noindex` and no canonical on Class Passives;
- `WebSite` on home, `BreadcrumbList` on the chapter and `/source`, and `Article` plus `BreadcrumbList` on Theostones.

- [ ] **Step 11: Format, lint, type-check and test**

Format every changed file. Then run: `npm run lint && npm run typecheck && npm test`
Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git -C "$WT" add tests/static-publish-root.test.mjs scripts/verify-static.mjs scripts/prepare-static.mjs app/routes netlify.toml
git -C "$WT" commit -m "Publish search metadata, sitemap and robots.txt"
```

---

### Task 5: Deployment smoke check for robots.txt and the sitemap

**Files:**

- Modify: `tests/deployment-smoke.test.mjs`
- Modify: `scripts/verify-deployment.mjs`
- Modify: `docs/deployment.md`, in step 6's description of the smoke command

**Interfaces:**

- Consumes: the live `/robots.txt` and `/sitemap.xml` that Task 4 publishes.
- Produces: `checkDeployment(baseUrl)` also rejects a host that serves no sitemap line or no `urlset`.

- [ ] **Step 1: Write the failing tests**

In `tests/deployment-smoke.test.mjs`, add two fixtures to the default fixture map, after the `[image]` entry:

```js
        '/robots.txt': {
          body: 'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n',
          type: 'text/plain; charset=utf-8',
        },
        '/sitemap.xml': {
          body: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>\n',
          type: 'application/xml',
        },
```

Add after the "rejects a missing referenced image" test:

```js
it.each([
  ['/robots.txt', 'User-agent: *\nAllow: /\n', /robots/i],
  ['/sitemap.xml', '<h1>Aion 2, explained.</h1>', /sitemap/i],
])('rejects %s without its search engine content', async (path, body, error) => {
  changes.set(path, { body });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(error);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/deployment-smoke.test.mjs`
Expected: the two new cases FAIL, with "promise resolved instead of rejecting". Every existing case passes.

- [ ] **Step 3: Implement the checks**

In `scripts/verify-deployment.mjs` → `checkDeployment`, add after the `/source` loop:

```js
  const robots = await (await request(base, '/robots.txt', 200)).text();
  if (!/^Sitemap:\s*https?:\/\/\S+\/sitemap\.xml\s*$/im.test(robots))
    throw new Error('/robots.txt: missing Sitemap line');
  const sitemap = await (await request(base, '/sitemap.xml', 200)).text();
  if (!/<urlset[\s>][\s\S]*<loc>https?:\/\/[^<]+<\/loc>/.test(sitemap))
    throw new Error('/sitemap.xml: expected a urlset with <loc> entries');
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/deployment-smoke.test.mjs`
Expected: PASS, every case.

- [ ] **Step 5: Update the runbook sentence**

In `docs/deployment.md` step 6, change "The command makes read-only HTTP requests for known pages, trailing-slash forms, a referenced image, and random nonexistent page/asset paths." to:

"The command makes read-only HTTP requests for known pages, trailing-slash forms, `robots.txt`, the sitemap, a referenced image, and random nonexistent page/asset paths."

- [ ] **Step 6: Format, lint and commit**

Format the three files, then run `npx eslint scripts/verify-deployment.mjs tests/deployment-smoke.test.mjs --max-warnings 0`. Expected: clean. Then commit:

```bash
git -C "$WT" add tests/deployment-smoke.test.mjs scripts/verify-deployment.mjs docs/deployment.md
git -C "$WT" commit -m "Check robots.txt and the sitemap in deployment smoke"
```

---

### Task 6: Search engine documentation

**Files:**

- Modify: `docs/deployment.md`, adding a `## Search engines` section before `## Failure and rollback`
- Modify: `README.md`, in the "Static hosting" section
- Modify: `AGENTS.md`, adding one bullet

**Interfaces:**

- Consumes: the behavior from Tasks 1–5.
- Produces: operator documentation only.

- [ ] **Step 1: Add the runbook section**

Insert before `## Failure and rollback` in `docs/deployment.md`:

```markdown
## Search engines

Production is `https://aion2simple.wiki`. `www` and `http` redirect to it, and `aion-wiki.netlify.app` serves the same build with Netlify's canonical header pointing to it. `app/seo.ts` holds that origin and builds each page's canonical link, link-preview tags and structured data. The build writes `sitemap.xml` and `robots.txt` from the same module, and `verify:static` fails unless page heads and the sitemap agree. Articles marked Coming soon, and chapters holding only such articles, carry `noindex` and stay out of the sitemap until they are written.

Search engine accounts belong to the site owner, so these steps are manual:

1. In Google Search Console, add a Domain property for `aion2simple.wiki`. Add the TXT record it shows in Netlify under Domains → aion2simple.wiki → DNS settings, then verify.
2. In Search Console → Sitemaps, submit `https://aion2simple.wiki/sitemap.xml`. In URL Inspection, request indexing for the home page.
3. In Bing Webmaster Tools, import the site from Search Console. Bing also feeds DuckDuckGo and Yahoo.
4. Check the home page, a chapter and an article with Google's Rich Results Test, and a link preview in Discord.

Crawling can take from a few days to a few weeks. Afterwards, watch Search Console's Page indexing, Sitemaps and Breadcrumbs reports. Links from the guide's author and from player communities help search engines find the site. If the domain changes, update `siteOrigin`, redirect the old domain with 301s, and add the new domain in Search Console.
```

- [ ] **Step 2: Update the README**

In `README.md` → "Static hosting", after the first paragraph's sentence "No application server or runtime source fetch is required.", add:

"The build also writes `sitemap.xml` and `robots.txt`. `app/seo.ts` owns the production origin (`https://aion2simple.wiki`), canonical links, link-preview tags and structured data; see the runbook's Search engines section."

- [ ] **Step 3: Update AGENTS.md**

Add after the bullet starting "Edit canonical content in `app/content/chapters/`":

```markdown
- Route `meta` exports go through `pageMeta()` or `notFoundMeta()` in `app/seo.ts`, which owns the production origin, canonical links, preview tags, structured data and the sitemap/robots output. Do not hard-code the origin elsewhere.
```

- [ ] **Step 4: Format and check**

Format the three files. Then run: `npx prettier --check docs/deployment.md README.md AGENTS.md`
Expected: clean. Check that no relative link in the changed sections points to a missing file.

- [ ] **Step 5: Commit**

```bash
git -C "$WT" add docs/deployment.md README.md AGENTS.md
git -C "$WT" commit -m "Document search engine setup"
```

---

### Task 7: Final verification

**Files:** none unless a gate fails.

- [ ] **Step 1: Run the required gates in the mirror**

Run: `npm run check`
Then: `npm run build`
Then: `npm run verify:browser`
Expected: all three pass. `verify:static` reports 57 routes and 55 sitemap URLs, and the browser smoke check reports success.

- [ ] **Step 2: Confirm the verified tree is the committed tree**

Run: `rsync -anci --exclude=/node_modules --exclude=/build --exclude=/.react-router --exclude=/.git --exclude=/.local-tools --exclude=/coverage "$WT/" "$MIRROR/" | grep '^>f'`
Expected: no output. Then `git -C "$WT" status --short` shows a clean tree.

- [ ] **Step 3: Review the whole branch against the spec**

Read `git -C "$WT" diff main...HEAD`. Tick every spec section S1–S9 against it, check the Global Constraints, and fix anything missing with its own commit. The owner steps stay manual.
