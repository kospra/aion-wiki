# Search visibility: design

Date: 2026-09-26. Status: written at the user's request for later execution; awaits review. Not implemented.

## Goal

Get `https://aion2simple.wiki` discovered, indexed and presented well by Google and Bing, using standard technical SEO. The guide's content does not change.

## Findings (2026-09-26)

| Check                  | Result                                                                                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production site        | `https://aion2simple.wiki/` is the primary domain. `www` and `http` redirect to it with 301. `aion-wiki.netlify.app` serves the same build and carries a `Link: <https://aion2simple.wiki/…>; rel="canonical"` header that Netlify adds. The repository did not record this URL before. |
| Domain age             | RDAP: registered 2026-09-25 14:45 UTC. DNS is Netlify DNS (NS1 name servers).                                                                                                                                                                                                           |
| Indexing blockers      | None. Pages return 200 with a prerendered title, description, one `h1`, the article text and image `alt`. There is no robots meta tag or `X-Robots-Tag`. Unknown paths return a real 404.                                                                                              |
| Discovery              | `/robots.txt` and `/sitemap.xml` return 404. There is no Search Console property. A web search for the domain returns nothing.                                                                                                                                                         |
| Duplicate URLs         | No page has a canonical tag. The home page also answers at `/index.html` and `/?q=…`. `/articles/x` redirects to `/articles/x/`: Netlify serves a directory index only with the trailing slash, and redirect rules cannot change that.                                                 |
| Rich results, previews | No structured data, Open Graph or Twitter tags.                                                                                                                                                                                                                                         |
| Stray documents        | `/__spa-fallback.html`, React Router's SPA shell, returns 200 with no robots directive. `/404.html` returns 200 but carries `noindex`.                                                                                                                                                   |
| Thin pages             | The Class Passives article (`status: source-pending`) shows only the "Coming soon" note. It is the only article in its chapter, whose description says the same.                                                                                                                       |
| Figures                | Each article's first figure ranges from a 52×53 icon to a 783×45 strip or a 2048×769 screenshot, so no single per-page figure makes a dependable preview image.                                                                                                                        |
| Competition            | Searches for "Aion 2 wiki" return Fextralife, Fandom, Game8 and aion2wiki.com. A new site first appears for its own name and specific topics.                                                                                                                                           |

PageSpeed Insights was unavailable (API quota), so performance was not measured.

The main reason the site is missing from Google is age and discovery, not a defect. This design adds the standard signals. The owner steps below tell Google the site exists.

## Decisions

| Decision          | Choice                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical URL     | `https://aion2simple.wiki` plus the route path and a trailing slash. The home page is `https://aion2simple.wiki/`. This is the form Netlify serves with 200.                                                                                                                                                                             |
| Internal links    | Unchanged: `/articles/x`, no slash. Adding the slash means rewriting 17 internal link targets in the canonical content, the integrity validator's path mirror and the importer's output in the Google Doc sync spec (`2026-09-26-google-doc-sync-design.md`). The 301, the canonical tag and the sitemap all name the slash form, which is enough. |
| Site name         | "Aion 2 Wiki", as in every page title and the header link's accessible name.                                                                                                                                                                                                                                                             |
| Share image       | One branded 1200×630 card for every page (user decision, 2026-09-26).                                                                                                                                                                                                                                                                     |
| Dates             | No `lastmod`, `datePublished` or `dateModified`. Nothing records when a page changed, and Google ignores dates that are not accurate.                                                                                                                                                                                                     |
| Placeholder pages | Not indexable: `noindex` and left out of the sitemap (S2).                                                                                                                                                                                                                                                                                |
| netlify.app host  | No redirect to the domain. Netlify's canonical header and the page's own canonical tag cover it, and `verify:deployment` rejects cross-origin redirects when run against that host.                                                                                                                                                       |
| Delivery          | This spec now, implementation later (user decision, 2026-09-26).                                                                                                                                                                                                                                                                          |

## Constraints

1. **Content untouched.** Guide text, titles, summaries, links and figures stay as they are. Page titles and descriptions keep their current strings.
2. **Static and deterministic.** Everything is written into `build/client` at build time from committed files. There is no runtime code, build timestamp or git-history input.
3. **One source of truth.** The origin, site name, author and share card are defined once, in `app/seo.ts`.
4. **Light pages stay light.** `app/seo.ts` may import the catalogue (`app/content/wiki.ts`) but never `app/content/repository.ts`, so the home and chapter chunks stay free of article bodies. A route that already loads a full page passes in what the helper needs.
5. **Checks only grow.** The integrity and static validators keep every guarantee. `verify:static` gains the checks in S8.
6. **Minimal tests.** Generic behavior with small fixtures, as AGENTS.md requires.

## Design

### S1 Site constants and canonical URLs

New module `app/seo.ts`:

- `siteOrigin = 'https://aion2simple.wiki'`, `siteName = 'Aion 2 Wiki'`, `siteLanguage = 'en'`.
- `canonicalUrl(path)` returns the origin plus the path with exactly one trailing slash and no query or hash. `/` stays `/`. `/articles/theostones` gives `https://aion2simple.wiki/articles/theostones/`.
- `shareCard = { path: '/images/share-card.png', width: 1200, height: 630, alt: 'Aion 2 Wiki: Aion 2, explained.' }`.
- `guideAuthor = { name: 'Kanon', path: '/source' }`: the attribution the footer and article bylines already show.
- Its imports carry explicit `.ts` extensions (`./content/wiki.ts`), and it has no JSX. That lets `scripts/verify-static.mjs` import it under plain Node, as it already imports `app/content/wiki.ts`.

### S2 Indexability

- An article is indexable unless its `status` is `source-pending`.
- A chapter page is indexable when at least one of its articles is.
- The home page and `/source` are always indexable. The not-found route and unknown slugs never are.
- One function, `isIndexable(path)`, answers this from the catalogue. The page metadata (S3) and the sitemap (S5) both use it.

Today this excludes `/articles/class-passives` and `/categories/class-passives`, leaving 55 of the 57 prerendered routes in the sitemap. Both pages become indexable on their own once the article's status changes.

### S3 Page metadata

`pageMeta({ path, title, description, type, jsonLd })` returns React Router `MetaDescriptor[]`, and every route's `meta` export calls it. `type` is `article` on articles and `website` everywhere else. It calls `isIndexable(path)` itself.

Every prerendered page gets:

- `title` and `description`, with today's strings;
- Open Graph: `og:site_name`, `og:type`, `og:title` (the document title), `og:description`, `og:url` (the canonical URL), `og:image` (the absolute share card URL), `og:image:width`, `og:image:height` and `og:image:alt`;
- `twitter:card` set to `summary_large_image`. X reads the other fields from Open Graph.

Indexable pages also get:

- `<link rel="canonical">` with `canonicalUrl(path)`;
- `<meta name="robots" content="max-image-preview:large">`, which lets Google show large image previews;
- their JSON-LD (S4), one `script:ld+json` descriptor per object. React Router escapes `<` inside it.

Non-indexable pages get `<meta name="robots" content="noindex">` instead, with no canonical and no JSON-LD. The not-found route, and the article and chapter routes for an unknown slug, return only their title and `noindex`, through a `notFoundMeta()` helper.

Expected head for an article:

```html
<title>Theostones | Aion 2 Wiki</title>
<meta name="description" content="What Theostones do, …" />
<link rel="canonical" href="https://aion2simple.wiki/articles/theostones/" />
<meta name="robots" content="max-image-preview:large" />
<meta property="og:site_name" content="Aion 2 Wiki" />
<meta property="og:type" content="article" />
<meta property="og:title" content="Theostones | Aion 2 Wiki" />
<meta property="og:description" content="What Theostones do, …" />
<meta property="og:url" content="https://aion2simple.wiki/articles/theostones/" />
<meta property="og:image" content="https://aion2simple.wiki/images/share-card.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Aion 2 Wiki: Aion 2, explained." />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">
  …Article…
</script>
<script type="application/ld+json">
  …BreadcrumbList…
</script>
```

### S4 Structured data

| Page      | JSON-LD                     |
| --------- | --------------------------- |
| Home      | `WebSite`                   |
| Chapter   | `BreadcrumbList`            |
| Article   | `Article`, `BreadcrumbList` |
| `/source` | `BreadcrumbList`            |

- **WebSite**, on the home page only, where Google reads site names:
  - `name` is the site name;
  - `url` is `https://aion2simple.wiki/`;
  - `inLanguage` is `en`;
  - `description` is the home description.
- **BreadcrumbList** mirrors the visible breadcrumb: "Discover", then the chapter title, then the page title.
  - A chapter page's trail ends at the chapter.
  - `/source` has no chapter, so its trail is "Discover", then "About the source and author".
  - Positions start at 1.
  - Every item except the last has an absolute canonical `item` URL.
  - The last item has no `item`, so Google uses the page's own URL.
- **Article**:
  - `headline` is the title and `description` the summary;
  - `url` and `mainEntityOfPage` are the canonical URL;
  - `inLanguage` is `en`;
  - `isPartOf` is `{ "@type": "WebSite", "name": …, "url": … }`;
  - `author` is `{ "@type": "Person", "name": "Kanon", "url": "https://aion2simple.wiki/source/" }`;
  - `isBasedOn` is the page's `sourceUrl`, the Google Doc;
  - `image` lists the absolute URLs of the page's figures whose width × height is at least 50,000 pixels, Google's minimum. They are in page order and deduplicated by `src`, and `image` is omitted when no figure qualifies.
  - The article route collects the page's figures from the page it already loads and passes them to the `app/seo.ts` builder, which applies the pixel filter.
  - There are no dates and no `publisher`.

### S5 sitemap.xml and robots.txt

- `app/seo.ts` exports:
  - `sitemapUrls()`: the canonical URLs of the indexable `staticPaths`, in `staticPaths` order;
  - `renderSitemap(urls)`;
  - `renderRobots()`.
- `scripts/prepare-static.mjs` loads them with Vite's `ssrLoadModule`, as it already does for the 404 page. It writes `build/client/sitemap.xml` and `build/client/robots.txt`.
- The sitemap is a UTF-8 `urlset` in the `http://www.sitemaps.org/schemas/sitemap/0.9` namespace, with one XML-escaped `<url><loc>` per URL and nothing else. Google ignores `priority` and `changefreq`, and no page has an accurate `lastmod`.
- `robots.txt`:

  ```
  User-agent: *
  Allow: /

  Sitemap: https://aion2simple.wiki/sitemap.xml
  ```

  Nothing is disallowed. Google needs `/assets/` to render pages.

### S6 Netlify header

Add to `netlify.toml`:

```toml
[[headers]]
  for = "/__spa-fallback.html"
  [headers.values]
    X-Robots-Tag = "noindex"
```

This keeps React Router's unlinked SPA shell out of the index. Netlify already sends `noindex` on Deploy Previews.

### S7 Share card

- `public/images/share-card.png`: 1200×630, under 200 KB, served at `https://aion2simple.wiki/images/share-card.png`.
- Composition, following DESIGN.md:
  - a black `#000000` canvas, with Inter Variable, left-aligned text and 80px margins;
  - the wordmark "AION 2 / WIKI" in `#FAFAFA` semibold;
  - the eyebrow "THE COMMUNITY FIELD GUIDE" in teal `#5EEAD4`;
  - the home heading "Aion 2, explained." large, in `#FAFAFA`;
  - "Equipment, progression and combat." in muted `#A1A1AA`;
  - the domain "aion2simple.wiki" in teal.
  - Every line is copy the site already uses. All text stays inside the central 1200×600 band, because X crops large cards to 2:1. There are no gradients, pictures or ornaments.
- `scripts/render-share-card.mjs` renders it:
  - Playwright Chromium at 1200×630 and device scale 1;
  - an inline HTML template with the Fontsource Inter file embedded as a data URL.

  Run it by hand, `node scripts/render-share-card.mjs`, whenever the card's text changes. `build` never runs it, because Netlify builds have no browser. The PNG is committed.

- DESIGN.md records the card, its text and the command under Components.

### S8 Verification

`scripts/verify-static.mjs`:

- `verifyPublishRoot` allows top-level `robots.txt` and `sitemap.xml`. The fixture in `tests/static-publish-root.test.mjs` includes both.
- For every static route:
  - an indexable route has exactly one canonical link, equal to `canonicalUrl(route)`, and no `noindex`;
  - a non-indexable route has `noindex` and no canonical link;
  - `og:url` equals `canonicalUrl(route)`;
  - `og:image` starts with `siteOrigin` and names a file present in `build/client`;
  - every `application/ld+json` script parses as JSON, with `@context` `https://schema.org`.
- The sitemap's `<loc>` values are unique, and they equal the canonical URLs of the indexable routes.
- `robots.txt` names `https://aion2simple.wiki/sitemap.xml` and has no `Disallow: /` line.

`scripts/verify-deployment.mjs` also requests `/robots.txt` (200, with a `Sitemap:` line) and `/sitemap.xml` (200, with a `<loc>`). The fixture server in `tests/deployment-smoke.test.mjs` serves both. The check does not compare origins, because previews run on `netlify.app` hosts.

New `tests/seo.test.ts`:

- `canonicalUrl` adds one trailing slash, keeps `/`, and drops the query and hash.
- `pageMeta`:
  - on an indexable page, the canonical URL and `og:url` are equal;
  - on a non-indexable page, there is `noindex` and no canonical.
- Breadcrumb JSON-LD numbers positions from 1 and omits the last `item`.
- The Article image list keeps only figures of at least 50,000 pixels.
- `renderSitemap` escapes `&`, and `renderRobots` names the sitemap.

No existing test calls a route's `meta`, so no other tests change.

### S9 Documentation

- `docs/deployment.md`: a new "Search engines" section, which covers:
  - the production URL;
  - the owner steps below;
  - what to watch in Search Console: Page indexing, Sitemaps and the Breadcrumbs report;
  - that a domain change means updating `siteOrigin` and adding 301 redirects.
- `README.md`, "Static hosting": the build also writes `sitemap.xml` and `robots.txt`, and `app/seo.ts` owns the origin.
- `AGENTS.md`: one bullet. Route `meta` goes through `pageMeta()` in `app/seo.ts`, and the origin is not hard-coded anywhere else.
- `DESIGN.md`: the share card (S7).

## Owner steps outside the repository

These can start before implementation:

1. **Verify the domain.** In Google Search Console, choose Add property, then Domain, and enter `aion2simple.wiki`. Add the TXT record it shows in Netlify, under Domains → aion2simple.wiki → DNS settings. Then click Verify.
2. **Request indexing.** In URL Inspection, enter `https://aion2simple.wiki/` and choose Request indexing.
3. **Set the repository website.** Set the GitHub repository's Website field to `https://aion2simple.wiki`.
4. **Get real links.** Ask Kanon to link the wiki from the guide or stream pages, and share it where Aion 2 players meet: the subreddit and Discord servers. Links are how Google finds and ranks new sites.

After the first deploy that includes this change:

5. **Submit the sitemap.** In Search Console → Sitemaps, submit `https://aion2simple.wiki/sitemap.xml`.
6. **Add Bing.** In Bing Webmaster Tools, import the site from Search Console. Bing also feeds DuckDuckGo and Yahoo.
7. **Check the markup.** Run Google's Rich Results Test on the home page, a chapter and an article, and check a link preview in Discord.
8. **Review indexing.** After one to two weeks, review Search Console's Page indexing report.

## Files

- New: `app/seo.ts`, `tests/seo.test.ts`, `scripts/render-share-card.mjs` and `public/images/share-card.png`.
- Changed:
  - routes: `app/routes/home.tsx`, `category.tsx`, `article.tsx`, `source.tsx` and `not-found.tsx`;
  - scripts: `scripts/prepare-static.mjs`, `verify-static.mjs` and `verify-deployment.mjs`;
  - tests: `tests/static-publish-root.test.mjs` and `tests/deployment-smoke.test.mjs`;
  - config and docs: `netlify.toml`, `docs/deployment.md`, `README.md`, `AGENTS.md` and `DESIGN.md`.

## Testing

- **Focused tests:** `npm test -- tests/seo.test.ts`, then the publish-root and deployment-smoke tests.
- **Required gates:** `npm run check`, `npm run build` (which runs `verify:static`) and `npm run verify:browser`.
- **Built output:**
  - Read the heads of `build/client/index.html`, one chapter, one article, `/source` and the Class Passives placeholder.
  - Read `build/client/sitemap.xml` and `build/client/robots.txt`.
  - Open the share card at full size.
- **After deploy:** `npm run verify:deployment -- https://aion2simple.wiki`, and the owner checks in steps 5–8.

## Out of scope

- **Trailing-slash internal links.** See Decisions.
- **Dates.** No `lastmod` or article dates yet. Revisit once the Google Doc importer can say which pages changed and when.
- **netlify.app redirect.** No redirect from `aion-wiki.netlify.app` to the domain.
- **Low-value extras.** No new titles, descriptions or content, and none of the following:
  - a `keywords` meta tag;
  - a sitelinks search box, which Google has retired;
  - IndexNow;
  - `hreflang`;
  - image sitemaps;
  - per-page generated share cards.
- **Favicon.** Google accepts the current square SVG. Its gold-on-navy colors predate the current theme, which is a design question, not an SEO one.
- **Performance.** Nothing measured points to a problem.

## Risks

- **Wrong origin.** A typo in `siteOrigin` would point every canonical tag at another site. S8 keeps every page consistent with the constant but cannot check the constant itself. URL Inspection after the first deploy confirms it.
- **Accidental `noindex`.** A bug that emits `noindex` widely would drop pages from Google. S8 fails the build when any indexable route carries it.
- **Stale placeholder.** Indexability keys on `status`, so the Class Passives pages become indexable as soon as the article's status changes.
- **Card drift.** When the home copy or branding changes, rerun the card script.
- **Deploy Previews.** Previews carry production canonical tags and share URLs. Netlify's preview `noindex` header keeps them out of the index.

## Sources

- Google Search Central:
  - [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
  - [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
  - [Ask Google to recrawl your URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
  - [Site names](https://developers.google.com/search/docs/appearance/site-names)
  - [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
  - [Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- Netlify support guide: [trailing slash behavior and Pretty URLs](https://answers.netlify.com/t/support-guide-how-can-i-alter-trailing-slash-behaviour-in-my-urls-will-enabling-pretty-urls-help/31191)
- React Router 8.4 `MetaDescriptor`, which supports `tagName: "link"` and `script:ld+json`: `node_modules/react-router/dist/development/index-react-server.d.ts`
