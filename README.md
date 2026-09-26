# Aion 2 Wiki

Live site: **<https://aion2simple.wiki>**

A static, mobile-friendly wiki built from [Kanon's Aion 2 guide](https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/edit). It holds 43 articles in 12 chapters, a source overview and all 90 original screenshots. Articles show the guide's own text and images, and search covers titles, summaries and article text. Regional, dated and uncertain claims keep the source's wording.

Built with React, TypeScript, React Router and Chakra UI. Every page is prerendered at build time, so the site is plain HTML, CSS and JavaScript with no server. It is hosted on Netlify.

## Getting started

You need Node **24.21.0** (the version in `.nvmrc`) and npm **12.1.0**. With [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install            # reads .nvmrc
npm install --global npm@12.1.0
```

Then install dependencies and start the dev server:

```bash
npm ci
npm run dev
```

Open the URL it prints, normally `http://localhost:5173`.

To try the production build locally:

```bash
npm run build
npm run preview -- --listen 3000
```

Then open `http://localhost:3000`. Stop it with Ctrl+C.

Dependencies are pinned. On Windows, work from WSL and treat it as Linux. Never reuse a `node_modules` installed from another operating system; delete it and run `npm ci` again.

## Commands

| Command                              | What it does                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `npm run dev`                        | Dev server with hot reload                                                   |
| `npm run build`                      | Builds the static site into `build/client` and verifies it                   |
| `npm run preview`                    | Serves `build/client` locally                                                |
| `npm run check`                      | Content drift, source integrity, lint, formatting, types and unit tests      |
| `npm run validate`                   | `check` then `build`; this is what Netlify runs                              |
| `npm run verify:browser`             | Browser smoke test of the built site (needs Chromium, see below)             |
| `npm run verify:deployment -- <url>` | Read-only smoke test of a live deploy                                        |
| `npm test`                           | Unit tests                                                                   |
| `npm run format`                     | Formats the repo with Prettier                                               |
| `npm run content:generate`           | Regenerates the article catalogue after content edits                        |
| `npm run source:check`               | Shows what changed in the Google Doc since the last capture, without writing |
| `npm run source:sync`                | Imports changes from the Google Doc                                          |

## Checks before you deliver

Run these from the repository root. They use only committed content and do not touch the network.

```bash
npm run check
npm run build
npx playwright install --with-deps chromium   # once
npm run verify:browser
```

`check` covers catalogue drift, source/content integrity, lint, formatting, types and unit tests. `build` prerenders every route, writes a standalone `404.html`, `sitemap.xml` and `robots.txt`, and verifies source text, figures, internal links and the publish folder. `verify:browser` starts a local preview and runs a short mobile and desktop smoke check, including reduced motion, the image viewer's keyboard controls, search reset, 404 recovery and reading without JavaScript. Failed smoke checks save a screenshot under `.local-tools/qa/guide/`.

While iterating, run one test file, for example `npm test -- tests/wiki-directory.test.tsx`, and run the full checks once before delivery. Tests cover generic behaviour with small fixtures. Do not add article wording, game values or fixed catalogue counts to tests; the integrity and static checks own source fidelity.

The `wiki-ci` GitHub workflow runs the same commands on every pull request and push to `main`. Netlify runs `npm ci && npm run validate` on its own and publishes `build/client`.

`build/`, `.react-router/`, `coverage/` and `.local-tools/qa/` are generated and can be deleted. The ignored `.local-tools/source-doc/` folder holds the originally captured guide and raw Doc downloads; keep it as provenance, but nothing needs it.

## Content

Article bodies live in `app/content/chapters/chapter-01.json` to `chapter-12.json` and `app/content/source-overview.json`. `app/content/types.ts` defines the block types: paragraphs, headings, lists, tables, formulas, notes, figures and groups. Inline runs keep strong, emphasis, underline, highlight and link fields.

Figures live in `app/content/figures/group-{a,b,c}.json`; the images are under `public/images/guide/`. Each figure records where it sits in the source, its image hash, size and alt text. Figures whose screenshot carries numbered or coloured markers also list them in `annotations`, which renders as a small marker key. Nothing else from a screenshot is transcribed.

`content/source/` holds the independent captured source: `baseline.json` (the guide's text as captured), `figure-audit.json`, `taxonomy.json` and `category-contract.json`. `content/coverage/group-{a,b,c}.json` maps every source block to the article that shows it. Two kinds of entries drop Google Docs leftovers on purpose:

- `omitted` drops a separator line, a repeated chapter title such as "CH 3: …" or document-navigation text. It must name the article's `pageSlug`, so links to the dropped block still open that article. Figures and links can never be omitted.
- `strayText` drops a stray word of three letters or fewer next to a figure.

Rules for editing content:

- Keep the source's wording, numbers, repeated lines, list numbering and figure placement. Do not add editorial notes or invent game facts.
- Never remove source text silently; use `omitted` or `strayText`.
- Never hand-edit `content/source/baseline.json`. It changes only through `npm run source:sync`.
- After editing content, run `npm run content:generate` to refresh `app/content/catalogue.json` and `source-references.json`, then run the checks. Do not hand-edit generated files.

See [docs/source-guide-migration.md](docs/source-guide-migration.md) for how the guide was imported and what was left out.

## Syncing with the Google Doc

The guide's author keeps editing the Google Doc. `npm run source:check` downloads it and prints what changed since the last capture, without writing anything. `npm run source:sync` then:

- records the capture in `content/source/baseline.json` and `content/source/captures.json`;
- applies text edits to the articles;
- regenerates the catalogue;
- writes a report to `content/source/changes/<date>-<UTC time>.md`.

Run it on a branch with no uncommitted content changes:

```bash
git switch -c content/doc-sync-YYYY-MM-DD
npm run source:sync
npm run check && npm run build
```

Block IDs stay stable across captures and numbers are never reused.

Simple changes apply automatically: an edit to a paragraph or heading that maps to exactly one source block, and a new paragraph, heading, list item or single image placed right after such a block. Everything else is listed under "Needs attention" in the report and in the `pending` list of the newest entry in `captures.json`. `npm run check` fails until each item is placed by hand and its entry removed. New images also need alt text.

To pass options, run the script directly, for example `node scripts/source-sync.ts --force && npm run content:generate`:

- `--from <file>` reads a saved export;
- `--force` continues when most blocks changed;
- `--allow-dirty` skips the uncommitted-changes check.

The `source-sync` GitHub workflow (`.github/workflows/source-sync.yml`) runs the sync once a day at 05:17 UTC, and on demand from the Actions tab. When the Doc changed, it commits to the `content/doc-sync` branch and opens a pull request whose description is the report. While that pull request is open, later runs add commits to it and post each new report as a comment. CI and a Netlify deploy preview run on the branch; nothing publishes until someone merges.

If the sync flagged items and the `ANTHROPIC_API_KEY` repository secret is set, a Claude step then tries to place them on the same branch under the rules in this README and `AGENTS.md`, and comments with where it put each one. It may change only article, figure, coverage and taxonomy files and remove `pending` entries. Review its work like any other edit. Without the secret, or for items it leaves pending, CI fails until the items are placed by hand. The workflow needs "Allow GitHub Actions to create and approve pull requests" enabled under Settings → Actions → General.

Only the sync commands use the network. Each raw download is also kept under the ignored `.local-tools/source-doc/captures/`.

## Design and UI

[DESIGN.md](DESIGN.md) records the design rules, responsive behaviour and which component owns what. Code is the design source of truth; there is no Figma file. Read it before UI changes and keep it current.

The short version:

- Use Chakra components and the shared tokens in `app/components/ui/theme.ts`. Colours are `wiki.*` semantic tokens; text styles are `wiki.body`, `wiki.title` and `wiki.section`.
- `app/root.tsx` wraps everything in `WikiProvider` (`app/components/ui/provider.tsx`). The dark theme and Inter font are bundled and render before JavaScript runs.
- Make React Router links with Chakra `Link` and `asChild`, so they stay real anchors.
- Keep source `strong`/`em`/`u`/`mark` semantics and line breaks. Source highlights are `mark` elements with their captured colour in `data-source-highlight`; they are content, not theme.
- Wide tables and images scroll locally; prose is capped at 44rem. The image viewer is a Chakra Dialog.
- `data-guide-*` attributes are stable hooks for the checks; keep them.

The Chakra MCP server (`npx -y @chakra-ui/react-mcp@2.1.1`) is an optional editor helper for looking up component props and theme APIs. It is not needed to build or run the site.

## Hosting and SEO

Publish `build/client` at the site root. Every known route has a prerendered `index.html`, and unknown pages get a real HTTP 404 with the standalone `404.html`. There is no catch-all rewrite and no SPA fallback; the build removes React Router's `__spa-fallback.html`, and `verify:static` fails if it comes back.

`app/seo.ts` owns the production origin, canonical links, link-preview tags, structured data, the sitemap and `robots.txt`. Route `meta` exports go through `pageMeta()` or `notFoundMeta()`. Content edits need no SEO step. When a published URL changes or disappears, add a 301 from the old path in `netlify.toml`. A new kind of page must be added to `isIndexable`.

[docs/deployment.md](docs/deployment.md) covers connecting Netlify, required checks, the first release, rollback, search-engine setup and changing the domain. After a deploy, run:

```bash
npm run verify:deployment -- https://aion2simple.wiki
```

It makes read-only requests for known pages, the sitemap, `robots.txt`, an image and a few nonexistent paths, and requires real 404s.

The original Python import tools are archived under [archive/guide-migration](archive/guide-migration/README.md) and are not needed.
