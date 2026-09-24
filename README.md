# Aion 2 Wiki

A responsive, fully static Chakra UI reference to Kanon's captured Aion 2 guide, built with React, TypeScript, and React Router. It contains 43 articles in 12 chapters, a source overview, and all 90 original figure placements. Search covers source text and figure details. Regional, dated, and uncertain source claims stay labeled; Class Passives retains the source's Coming soon placeholder.

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
npm run build:static
npm run preview -- --listen 3000
```

The production preview is normally at `http://localhost:3000`. Stop it with Ctrl+C.

## UI conventions and Chakra MCP

The document `Layout` in `app/root.tsx` wraps route content and error boundaries with `WikiProvider` from `app/components/ui/provider.tsx`. It uses Chakra UI 3.37.0 with the shared `wikiSystem` in `app/components/ui/theme.ts` and Emotion 11.14.0. The fixed light document class, warm editorial palette, and system sans-serif typography render in the prerendered HTML before JavaScript runs. No client-only wrapper or separate application stylesheet is needed.

The editorial theme centralizes colors as `wiki.*` semantic tokens, reading styles as `wiki.body` / `wiki.title` / `wiki.section`, and control styles as Chakra recipes. Prose uses a comfortable measure while tables and figures keep a wider frame. Source highlight colors are never replaced by theme accents.

Build visible UI with Chakra components and styling props. Compose React Router links through Chakra `Link` with `asChild` to retain real anchors. Keep document markup, source `strong`/`em`/`u`/`mark` semantics, and line breaks intact. Source highlights retain their exact captured colors and readable text; they are content rather than theme tokens. Use `htmlWidth`/`htmlHeight` for original image dimensions, local scroll regions for wide content, and Chakra Dialog for the accessible image viewer. Stable `data-guide-*` hooks identify content for audits; computed styles and source baselines independently prove visibility and fidelity.

The official MCP server is `@chakra-ui/react-mcp@2.1.1`, registered locally as `chakra-ui`. This workspace's Codex MCP configuration uses `wsl.exe` with these arguments:

```text
--exec /usr/bin/env PATH=/home/rings/.nvm/versions/node/v24.21.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /home/rings/.nvm/versions/node/v24.21.0/bin/npx -y @chakra-ui/react-mcp@2.1.1
```

Use an absolute path matching your own WSL Node installation when reproducing that setup. Consult its installation, theme, component props and example tools before changing Chakra composition. The migration verified real MCP initialization and tool calls for provider guidance, theme, navigation, cards, tables, images and dialogs; normal TypeScript and browser checks remain independent gates. The MCP server is a development tool and is not needed to build or run the site.

For production builds on Windows, prefer a checkout and dependencies on WSL's native filesystem (for example `~/code/aion-wiki`). On this machine, cold imports from `/mnt/c` exceeded React Router's ten-second prerender timeout, while unchanged source and configuration built successfully on native WSL storage. Do not increase the product timeout to compensate for a mounted-filesystem bottleneck. Keep Node 24/npm 12 and Linux dependencies consistent in either location.

## Validation

Run from the repository root. All checks use committed content, with no network source fetch or ignored research dependency.

```bash
npm ci
npm run check
npm run build:static
npx playwright install --with-deps chromium
npm run verify:browser:all
```

`npm run check` covers catalogue drift, source/content integrity, lint, formatting, types, and unit tests. `build:static` builds the 57 prerendered routes, prepares the standalone 404 page, and verifies source text, figures, internal targets, and publish boundaries. `build:netlify` combines `check` and `build:static` for the native Netlify build. Run `npm run content:generate` only after intentional content edits, then rerun validation; CI checks drift without repairing it.

Browser QA uses the installed Playwright package and Chromium by default. `verify:browser:all` starts and stops a local preview, runs the guide, editorial, and reduced-motion suites, and writes ignored QA output under `.local-tools/qa/`. For an existing WSL browser runtime, set `GUIDE_BROWSER_ROOT=/path/to/browser-runtime` explicitly; only this optional override uses its custom browser or library paths. The hosted Linux workflow installs Chromium with `npx playwright install --with-deps chromium`.

## Content authoring

Structured `GuidePage` bodies live in `app/content/chapters/chapter-01.json` through `chapter-12.json` and `app/content/source-overview.json`. `app/content/types.ts` defines paragraphs, headings, lists, tables, formulas, notes, figures, and groups. Inline runs retain strong/emphasis/underline/highlight/link fields. Keep source wording, original numbers and repeated occurrences, generated list numbering, and source context intact.

Figures live in `app/content/figures/group-{a,b,c}.json`; local originals are under `public/images/guide/`. Figure IDs identify placements, while hashes identify unique originals. Each figure includes accessible text, annotation meanings, screenshot-only facts and uncertainties. Keep text labels alongside colors.

`content/source/baseline.json`, `figure-audit.json`, `taxonomy.json`, and `category-contract.json` are the independent captured source and approved structure. Primary destinations and justified layout-only exclusions live in `content/coverage/group-{a,b,c}.json`. Stable source block anchors connect those records to visible content. Do not change the baseline to make a content regression pass.

`app/content/repository.ts` loads full bodies for article/source routes and resolves source links using generated `app/content/source-references.json`. The projection contains only source block IDs, optional anchors, and link hrefs derived from the committed baseline; the full baseline remains an offline validation input. `app/content/wiki.ts` exposes the lightweight generated `catalogue.json` to navigation and search; the header does not load article bodies. After content edits run `npm run content:generate`, then all validation gates. See [migration provenance and limitations](docs/source-guide-migration.md).

## Static hosting

Publish **`build/client`** at the site root. Known routes have prerendered directory indexes, and the build also writes a standalone `404.html` with a real home link. Netlify configuration preserves HTTP 404 for unknown pages and assets; there is no catch-all HTTP 200 rewrite. No application server or runtime source fetch is required.

Use [the deployment runbook](docs/deployment.md) to connect GitHub and Netlify, configure provider checks, validate the first preview, and release or roll back. After a live URL exists, run `npm run verify:deployment -- https://YOUR-DEPLOY-URL.netlify.app` with that operator-supplied URL. The smoke command makes read-only requests and is never scheduled automatically. Local fixture and preview tests do not establish live Netlify behavior until the connected site is checked.
