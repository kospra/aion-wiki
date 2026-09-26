# Aion 2 Wiki

A responsive, fully static Chakra UI reference to Kanon's captured Aion 2 guide, built with React, TypeScript, and React Router. It contains 43 articles in 12 chapters, a source overview, and all 90 original figure placements. Articles show the guide's own text and original images; search covers titles, summaries and article text. Regional, dated, and uncertain claims keep the source's own wording; Class Passives retains the source's Coming soon placeholder.

## Requirements and local development

Use native Windows Node, npm, Git, and PowerShell in this workspace; WSL is not required. Use Node **24.21.0** from `.nvmrc` and npm **12.1.0**. Dependencies are pinned. When switching operating systems, remove `node_modules` and reinstall dependencies for the current platform.

```powershell
Set-Location C:\code\aion-wiki
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run dev
```

Install the matching Windows Node release using your preferred installer or Windows version manager. If needed, install npm with `npm.cmd install --global npm@12.1.0`. To avoid a global npm change, prefix a command with `npm.cmd exec --yes --package=npm@12.1.0 -- npm`, for example `npm.cmd exec --yes --package=npm@12.1.0 -- npm ci`. Use `npm.cmd` and `npx.cmd` if PowerShell execution policy blocks their `.ps1` wrappers. Open the URL printed by React Router, normally `http://localhost:5173`.

```bash
npm run build
npm run preview -- --listen 3000
```

The production preview is normally at `http://localhost:3000`. Stop it with Ctrl+C.

## UI conventions and Chakra MCP

The document `Layout` in `app/root.tsx` wraps route content and error boundaries with `WikiProvider` from `app/components/ui/provider.tsx`. It uses Chakra UI 3.37.0 with the shared `wikiSystem` in `app/components/ui/theme.ts` and Emotion 11.14.0. The dark document class and black/charcoal/teal palette render in prerendered HTML before JavaScript runs. Inter Variable is bundled locally through Fontsource; no external font service or client-only wrapper is needed. [DESIGN.md](DESIGN.md) records the design rules, responsive behavior and component ownership. Code is the design source of truth; there is no Figma file.

The theme centralizes colors as `wiki.*` semantic tokens, reading styles as `wiki.body` / `wiki.title` / `wiki.section`, and control styles as Chakra recipes. `ChapterList` serves the desktop sidebar and mobile homepage; chapter cards lead to their existing category routes. Search results and category pages reuse `ArticleCard`. Prose is capped at 44rem, and tables and images retain local scroll regions. Yellow and other source highlights keep their exact captured colors. The author's near-white `#f8f9fa` note shading renders as a callout whose start edge keeps that exact color, instead of a white bar on the dark theme.

Build visible UI with Chakra components and styling props. Compose React Router links through Chakra `Link` with `asChild` to retain real anchors. Keep document markup, source `strong`/`em`/`u`/`mark` semantics, and line breaks intact. Source highlights stay in the DOM as `mark` elements carrying their exact captured color in `data-source-highlight`; they are content rather than theme tokens. Use `htmlWidth`/`htmlHeight` for original image dimensions, local scroll regions for wide content, and Chakra Dialog for the accessible image viewer. Stable `data-guide-*` hooks identify content for audits; computed styles and source baselines independently prove visibility and fidelity.

The official MCP server is `@chakra-ui/react-mcp@2.1.1`. An optional native Windows MCP setup can launch it with:

```powershell
npx.cmd -y @chakra-ui/react-mcp@2.1.1
```

Consult its installation, theme, component props and example tools before changing Chakra composition. Normal TypeScript and browser checks remain independent gates. The MCP server is a development tool and is not needed to build or run the site. Machine-level MCP registrations are configured separately from this repository.

Build directly from the Windows checkout with Windows dependencies. Earlier WSL builds encountered slow imports across `/mnt/c`; that observation does not require WSL for native Windows development. Keep the existing prerender timeout and validate with the commands below. Historical documents under `docs/research` and `docs/superpowers` describe earlier tooling decisions; this README and `AGENTS.md` define the current workflow.

## Validation

Run from the repository root. All checks use committed content, with no network source fetch or ignored research dependency.

```bash
npm ci
npm run check
npm run build
npx playwright install --with-deps chromium
npm run verify:browser
```

`npm run check` covers catalogue drift, source/content integrity, lint, formatting, types, and unit tests. `build` builds the 57 prerendered routes, prepares the standalone 404 page, and verifies source text, figures, internal targets, and publish boundaries. `validate` combines `check` and `build` for the native Netlify build. Run `npm run content:generate` only after intentional content edits, then rerun validation; CI checks drift without repairing it.

During development, run a focused test with `npm test -- tests/wiki-directory.test.tsx`, then run the required checks once before delivery. Tests cover generic behavior using small fixtures; avoid adding article wording, game values, fixed catalogue counts, or framework-internal assertions. The integrity validator and static-output checks own source fidelity; the frozen source baseline remains protected.

Browser QA uses the installed Playwright package and Chromium by default. On Windows, install Chromium with `npx.cmd playwright install chromium`. `verify:browser` starts and stops a local preview and runs a compact mobile/desktop smoke check plus reduced-motion and image-viewer keyboard checks. It checks representative templates, navigation, search reset, 404 recovery, overflow and no-JavaScript reading; it does not repeat the full content audit in a browser. Smoke failures save a screenshot under `.local-tools/qa/guide/`. The hosted Linux workflow installs Chromium with `npx playwright install --with-deps chromium`.

Generated `build/`, `.react-router/`, coverage, and `.local-tools/qa/` can be deleted and regenerated. Keep `node_modules/` for local development, or recreate it with `npm ci`. The ignored `.local-tools/source-doc/` contains the original captured guide and migration audits; retain it as provenance, although normal development and validation use committed content only. Old local WSL runtimes and temporary inspection tools are unnecessary.

The old `build:static`, `build:netlify`, and `verify:browser:all` commands are replaced by `build`, `validate`, and `verify:browser`, respectively. The browser command runs both smoke scripts against its own preview; `verify:deployment` remains a separate, explicit check of a hosted URL. Original Python import tools are archived under [archive/guide-migration](archive/guide-migration/README.md) and are not required for normal development.

## Content authoring

Structured `GuidePage` bodies live in `app/content/chapters/chapter-01.json` through `chapter-12.json` and `app/content/source-overview.json`. `app/content/types.ts` defines paragraphs, headings, lists, tables, formulas, notes, figures, and groups. Inline runs retain strong/emphasis/underline/highlight/link fields. Keep source wording, original numbers and repeated occurrences, generated list numbering, and source context intact.

Figures live in `app/content/figures/group-{a,b,c}.json`; local originals are under `public/images/guide/`. Figure IDs identify placements, while hashes identify unique originals. Each figure records its source placement, image hash, dimensions and alt text; articles render the image with a full-size viewer. Figures whose screenshots carry numbered or colored markers also list them in `annotations` (label, section title, `wiki.annotation.*` color, target block id), shown as a compact marker key; no other screenshot transcription is rendered. The original screenshot audit remains in `content/source/figure-audit.json` as provenance.

`content/source/baseline.json`, `figure-audit.json`, `taxonomy.json`, and `category-contract.json` are the independent captured source and approved structure. Primary destinations, justified layout-only exclusions and omissions live in `content/coverage/group-{a,b,c}.json`. An `omitted` entry drops a Google Docs leftover (a `separator` line, a repeated `chapter-title` such as "CH 3: …", or `document-navigation` text) and must name its article `pageSlug`; links to it open that article. The validator checks each omission's text shape and never allows omitting figures or links. `strayText` drops a stray word of three letters or fewer beside a figure. Stable source block anchors connect those records to visible content. Do not change the baseline to make a content regression pass.

`app/content/repository.ts` loads full bodies for article/source routes and resolves source links using generated `app/content/source-references.json`. The projection contains only source block IDs, optional anchors, and link hrefs derived from the committed baseline; the full baseline remains an offline validation input. `app/content/wiki.ts` exposes the lightweight generated `catalogue.json` to navigation and search; the header does not load article bodies. After content edits run `npm run content:generate`, then all validation gates. See [migration provenance and limitations](docs/source-guide-migration.md).

## Static hosting

Publish **`build/client`** at the site root. Known routes have prerendered directory indexes, and the build also writes a standalone `404.html` with a real home link. Netlify configuration preserves HTTP 404 for unknown pages and assets; there is no catch-all HTTP 200 rewrite. No application server or runtime source fetch is required.

Use [the deployment runbook](docs/deployment.md) to connect GitHub and Netlify, configure provider checks, validate the first preview, and release or roll back. After a live URL exists, run `npm run verify:deployment -- https://YOUR-DEPLOY-URL.netlify.app` with that operator-supplied URL. The smoke command makes read-only requests and is never scheduled automatically. Local fixture and preview tests do not establish live Netlify behavior until the connected site is checked.
