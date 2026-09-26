# Aion 2 Wiki

Live site: **<https://aion2simple.wiki>**

A static, mobile-friendly wiki built from [Kanon's Aion 2 guide](https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/edit). Articles show the guide's own text and screenshots, and search covers titles, summaries and article text.

Built with React, TypeScript, React Router and Chakra UI. Every page is prerendered at build time, so the site is plain HTML, CSS and JavaScript with no server. It is hosted on Netlify.

## Getting started

Use the Node version in `.nvmrc` and the npm version under `engines` in `package.json`. With [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install                                # reads .nvmrc
npm install --global npm@<engines version>
npm ci
npm run dev
```

Open the URL it prints, normally `http://localhost:5173`.

To try the production build locally:

```bash
npm run build
npm run preview -- --listen 3000
```

On Windows, work from WSL and treat it as Linux. Never reuse a `node_modules` installed from another operating system; delete it and run `npm ci` again.

## Commands

| Command                              | What it does                                                            |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `npm run dev`                        | Dev server with hot reload                                              |
| `npm run build`                      | Builds the static site into `build/client` and verifies it              |
| `npm run preview`                    | Serves `build/client` locally                                           |
| `npm run check`                      | Content drift, source integrity, lint, formatting, types and unit tests |
| `npm run validate`                   | `check` then `build`; this is what Netlify runs                         |
| `npm run verify:browser`             | Browser smoke test of the built site                                    |
| `npm run verify:deployment -- <url>` | Read-only smoke test of a live deploy                                   |
| `npm test`                           | Unit tests                                                              |
| `npm run format`                     | Formats the repo with Prettier                                          |
| `npm run content:generate`           | Regenerates the article catalogue after content edits                   |
| `npm run source:check`               | Shows what changed in the Google Doc, without writing                   |
| `npm run source:sync`                | Imports changes from the Google Doc                                     |

## Checks before you deliver

```bash
npm run check
npm run build
npx playwright install --with-deps chromium   # once
npm run verify:browser
```

`check` runs the static checks and unit tests. `build` prerenders every route, writes the 404 page, sitemap and `robots.txt`, and verifies the output against the captured source. `verify:browser` serves the build and runs a short mobile and desktop smoke check; failures save a screenshot under `.local-tools/qa/guide/`.

While iterating, run a single test file with `npm test -- <file>`. Tests cover generic behaviour with small fixtures; do not assert article wording, game values or catalogue counts. The `wiki-ci` workflow runs the same checks on every pull request and push to `main`.

`build/`, `.react-router/`, `coverage/` and `.local-tools/` are generated or local and can be deleted.

## Content

- Articles live in `app/content/chapters/` and `app/content/source-overview.json`. `app/content/types.ts` defines the block types.
- Figures live in `app/content/figures/`, images under `public/images/guide/`. A figure with numbered or coloured markers on its screenshot lists them in `annotations`; nothing else from a screenshot is transcribed.
- `content/source/` is the captured guide, and `content/coverage/` maps each source block to the article that shows it. Google Docs leftovers are dropped only through coverage entries: `omitted` for separators, repeated chapter titles and navigation text, and `strayText` for a stray short word beside a figure. Figures and links can never be omitted.

Rules:

- Keep the source's wording, numbers, list numbering and figure placement. Do not add editorial notes or invent game facts.
- Never remove source text silently; use `omitted` or `strayText`.
- Never hand-edit `content/source/baseline.json`; only `npm run source:sync` changes it.
- After editing content, run `npm run content:generate`, then the checks. Do not hand-edit generated files.

[docs/source-guide-migration.md](docs/source-guide-migration.md) explains how the guide was imported.

## Syncing with the Google Doc

`npm run source:check` shows what changed in the Doc since the last capture. `npm run source:sync` records the new capture, applies text edits to the articles, regenerates the catalogue and writes a report to `content/source/changes/`. Run it on a clean branch:

```bash
git switch -c content/doc-sync-YYYY-MM-DD
npm run source:sync
npm run check && npm run build
```

Edits to a paragraph or heading that maps to one source block, and new blocks placed right after one, apply automatically. Everything else is listed under "Needs attention" in the report and as `pending` in `content/source/captures.json`; `npm run check` fails until each item is placed by hand and removed from that list. New images need alt text.

Options go to the script directly, for example `node scripts/source-sync.ts --force && npm run content:generate`: `--from <file>` reads a saved export, `--force` continues when most blocks changed, `--allow-dirty` skips the clean-tree check.

The `source-sync` workflow runs the sync daily and on demand. When the Doc changed, it opens or updates a pull request on the `content/doc-sync` branch with the report as its description. If items were flagged and the `ANTHROPIC_API_KEY` secret is set, a Claude step tries to place them on that branch and comments on what it did; review it like any other edit. Nothing publishes until someone merges. The workflow needs "Allow GitHub Actions to create and approve pull requests" enabled in the repository's Actions settings.

## Design and UI

[DESIGN.md](DESIGN.md) records the design rules and which component owns what. Code is the design source of truth; there is no Figma file. Read it before UI changes and keep it current.

In short: use Chakra components and the shared tokens in `app/components/ui/theme.ts`, keep links as real anchors, keep the source's `strong`/`em`/`u`/`mark` markup and highlight colours, and keep the `data-guide-*` attributes the checks rely on. The site must stay readable without JavaScript and respect reduced motion.

The Chakra MCP server (`npx -y @chakra-ui/react-mcp`) is an optional editor helper and is not needed to build or run the site.

## Hosting and SEO

Publish `build/client` at the site root. Every route has a prerendered `index.html`, unknown pages get a real HTTP 404, and there is no SPA fallback.

`app/seo.ts` owns the production origin, canonical links, preview tags, structured data, the sitemap and `robots.txt`. Content edits need no SEO step. When a published URL changes or disappears, add a 301 in `netlify.toml`. A new kind of page must be added to `isIndexable`.

[docs/deployment.md](docs/deployment.md) covers Netlify setup, releases, rollback, search-engine setup and changing the domain. After a deploy, run `npm run verify:deployment -- https://aion2simple.wiki`.
