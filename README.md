# Aion 2 Wiki

An independent, responsive Aion 2 wiki built with React, strict TypeScript, and React Router framework mode. Search titles and summaries, combine category filters, and read individual articles. The navy-and-gold design uses original CSS geometry, an SVG favicon, and local system fonts; it needs no remote artwork or font service.

**All six starter articles are explicitly labeled sample content.** They demonstrate the wiki structure and are not verified game guides, mechanics, or statistics. Verify information and add reliable sources before replacing these examples.

## Requirements

- Node.js **24.15+ within the Node 24 release line** (verified with 24.19.0). The static verifier uses Node's built-in TypeScript stripping.
- npm **12.1+ within the npm 12 release line**. Dependencies are pinned in `package-lock.json`.

## Run locally

```sh
npm ci
npm run dev
```

Open the URL printed by React Router, normally `http://localhost:5173`.

```sh
npm run build
npm run verify:static
npm run preview
```

The preview serves the production files, normally at `http://localhost:3000`. It supports directory indexes for every generated route. Stop the process with Ctrl+C.

### Bundled Windows runtime

In this workspace Node is bundled but npm is not on `PATH`. The official npm CLI is installed in the ignored `.local-tools/npm` directory. If that directory is missing, first download and extract it:

```powershell
$nodeExe = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$npmRoot = Join-Path (Get-Location) '.local-tools/npm'
New-Item -ItemType Directory -Force -Path $npmRoot | Out-Null
Invoke-WebRequest 'https://registry.npmjs.org/npm/-/npm-12.1.0.tgz' -OutFile (Join-Path $npmRoot 'npm.tgz')
tar.exe -xzf (Join-Path $npmRoot 'npm.tgz') -C $npmRoot
$npmCli = Join-Path $npmRoot 'package/bin/npm-cli.js'
& $nodeExe $npmCli ci
& $nodeExe $npmCli run dev
```

Use `& $nodeExe $npmCli <command>` in place of `npm <command>` for the commands below in this environment.

## Validation

```sh
npm run format
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run verify:static
```

The Vitest tests cover directory search and filters, empty-result recovery, category and article rendering, sample labels, navigation links, and unknown-page content. Route transitions and direct refreshes require separate browser QA; they are not asserted by the Vitest suite. The static verifier checks every declared route for a semantic main and heading, sample disclosure, article section content, and absence of development-server references. Run it from the project root after building; missing output intentionally fails.

## Content authoring

Edit `app/content/wiki.ts`. A category has `slug`, `title`, and `description`. An article has a unique `slug`, `title`, a category slug in `category`, `summary`, `sections` (an array of `{ heading, body }`), and `status: 'sample'`. Use lowercase hyphenated slugs and an existing category. Keep text plain; React escapes it safely.

Category navigation, directory search, and `staticPaths` are derived from this data. Adding an entry automatically creates its route on the next build: `/categories/<slug>` or `/articles/<slug>`. No route file is needed per article. To introduce verified articles later, deliberately extend the status type, update the disclosure UI, and include a source model; do not silently remove sample labels.

Shared components are in `app/components`; route pages in `app/routes`. Theme tokens, global layout, and wiki presentation are in `app/styles/theme.css`, `global.css`, and `wiki.css`.

## Static hosting

Publish the contents of **`build/client`** to a static host at the site root. Runtime server rendering is disabled. The build produces `index.html` for the homepage and a directory index for each known route, for example `articles/choosing-your-class/index.html`. Configure the host to resolve both `/articles/choosing-your-class` and its trailing-slash form to that directory index, so direct links and refreshes work.

React Router also emits `__spa-fallback.html`. Unknown routes reached through the React application show its not-found screen. For direct requests to unknown URLs, a static host normally returns its own 404. To show the React not-found screen on those requests, configure the host to serve `__spa-fallback.html` as its fallback after checking real files and directory indexes. Prefer preserving HTTP 404 status where the host supports it. The fallback page requires JavaScript; known pages already contain their content in HTML.

The default local preview intentionally uses ordinary static-file behavior, so unknown URLs show the preview server's 404. A host's fallback setup is separate from the build and varies by provider. No provider configuration or public deployment is included. No application server, database, authentication, or CMS is required.
