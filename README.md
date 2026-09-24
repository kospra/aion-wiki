# Aion 2 Wiki

A responsive, fully static reference to Kanon's captured Aion 2 guide, built with React, TypeScript, and React Router. It contains 43 articles in 12 chapters, a source overview, and all 90 original figure placements. Search covers source text and figure details. Regional, dated, and uncertain source claims stay labeled; Class Passives retains the source's Coming soon placeholder.

## Requirements and local development

Use WSL Ubuntu in this Windows workspace, with Node **24.15+ within Node 24** and npm **12.1+ within npm 12** (verified with Node 24.21.0/npm 12.1.0). Dependencies are pinned. Do not alternate Windows and Linux npm installs in one checkout.

```bash
cd /mnt/c/code/aion-wiki
source ~/.nvm/nvm.sh
nvm use 24
npm ci
npm run dev
```

If needed, provision Node 24 with `nvm install 24` and npm 12 with `npm install --global npm@12`; changing the default nvm version is unnecessary. From PowerShell, enter WSL with `wsl.exe --exec bash -ic 'cd /mnt/c/code/aion-wiki && nvm use 24 && npm run dev'`. Open the URL printed by React Router, normally `http://localhost:5173`.

```bash
npm run build
npm run verify:static
npm run preview -- --listen 3000
```

The production preview is normally at `http://localhost:3000`. Stop it with Ctrl+C.

## Validation

Run from the repository root; all checks use committed content, with no network source fetch or ignored research dependency.

```bash
npm run content:generate
npm run content:check
npm run verify:content
npm run lint
npm run format:check
npm run typecheck
npm test -- --pool=vmThreads --maxWorkers=1
npm run build
npm run verify:static
npm run verify:browser -- http://localhost:3000
```

`verify:content` runs directly under Node 24 and fails on errors. The tests compare actual source-bearing fields with the independent capture and mutate lost repeated numbers, qualifiers, links, coverage, and figures. The static verifier parses every route as DOM, reconstructs visible source text/style/link fields and revalidates them against the baseline, checks figure legends and uncertainties, and verifies local asset hashes and internal targets. `content:check` detects stale generated search catalogue or source-reference projection data.

Browser QA uses a separate WSL Playwright installation, not a product dependency. Set `GUIDE_BROWSER_ROOT` to a directory containing `node_modules/playwright/index.mjs` and its browser environment; by default it uses `.local-tools/wsl-browser`. Provision that environment with Playwright and compatible Chromium if absent. `PLAYWRIGHT_BROWSERS_PATH` and `LD_LIBRARY_PATH` may be supplied explicitly; this workspace has browsers in `browsers` and locally extracted libraries in `libs/usr/lib/x86_64-linux-gnu` under that test directory. The script accepts the preview base URL and writes screenshots and `results.json` into ignored `.local-tools/qa/guide/`. It checks all 57 routes at 375px/1440px plus reading interactions, keyboard access, image loading, and errors.

## Content authoring

Structured `GuidePage` bodies live in `app/content/chapters/chapter-01.json` through `chapter-12.json` and `app/content/source-overview.json`. `app/content/types.ts` defines paragraphs, headings, lists, tables, formulas, notes, figures, and groups. Inline runs retain strong/emphasis/underline/highlight/link fields. Keep source wording, original numbers and repeated occurrences, generated list numbering, and source context intact.

Figures live in `app/content/figures/group-{a,b,c}.json`; local originals are under `public/images/guide/`. Figure IDs identify placements, while hashes identify unique originals. Each figure includes accessible text, annotation meanings, screenshot-only facts and uncertainties. Keep text labels alongside colors.

`content/source/baseline.json`, `figure-audit.json`, `taxonomy.json`, and `category-contract.json` are the independent captured source and approved structure. Primary destinations and justified layout-only exclusions live in `content/coverage/group-{a,b,c}.json`. Stable source block anchors connect those records to visible content. Do not change the baseline to make a content regression pass.

`app/content/repository.ts` loads full bodies for article/source routes and resolves source links using generated `app/content/source-references.json`. The projection contains only source block IDs, optional anchors, and link hrefs derived from the committed baseline; the full baseline remains an offline validation input. `app/content/wiki.ts` exposes the lightweight generated `catalogue.json` to navigation and search; the header does not load article bodies. After content edits run `npm run content:generate`, then all validation gates. See [migration provenance and limitations](docs/source-guide-migration.md).

## Static hosting

Publish the contents of **`build/client`** to a static host at the site root. Runtime server rendering is disabled. The build produces a directory `index.html` for every known route, for example `articles/gear-anatomy-and-stat-layers/index.html`. The host must resolve both the route and its trailing-slash form to that index, so direct links and refreshes work.

React Router also emits `__spa-fallback.html`. Unknown routes reached through the React application show its not-found screen. For direct requests to unknown URLs, an ordinary static host returns its own 404. To show the React not-found screen on those requests, configure that host to serve `__spa-fallback.html` after checking real files and directory indexes, preserving HTTP 404 where supported. The fallback requires JavaScript; known pages already contain their content in HTML.

The default local preview intentionally returns its server 404 for unknown direct URLs. No provider configuration or public deployment is included. No application server, database, authentication, CMS, remote font service, or runtime source fetch is required.
