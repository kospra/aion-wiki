# Static Netlify Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make this repository ready for checked GitHub pull requests and native Netlify static deployments, with remote/account connection deferred to the user.

**Architecture:** GitHub runs full validation and browser QA; Netlify independently runs core validation and builds the static publish artifact. Shared commands prevent differing validation definitions. All current routes remain prerendered, and a generated Chakra 404 handles unknown URLs without a server.

**Tech Stack:** React Router, React, Chakra UI, Vite, Node 24.21.0, npm 12.1.0, Playwright Chromium, GitHub Actions, Netlify.

**Spec:** [Approved design](../specs/2026-09-25-netlify-static-delivery-design.md).

## Global Constraints

- Publish only build/client; retain ssr:false and 57 known prerendered routes.
- Pin Node 24.21.0 in .nvmrc and npm 12.1.0 in CI and Netlify.
- Never require ignored local tooling, source downloads, or credentials for clean-checkout validation.
- Preserve source JSON, figures, source-audit assertions, and existing UI work.
- No Git remote, repository, account connection, public deployment, DNS change, or branch rename in this implementation.
- Required GitHub check name: wiki-ci; ubuntu-24.04; 30-minute timeout; seven-day failure-artifact retention.
- Netlify and GitHub gates execute independently. Provider branch protection is a later external prerequisite, not an effect of committed YAML.
- Preserve the earlier subagent-driven execution preference after the user reviews this plan. Do not spawn execution agents during planning.

## Review Focus

1. Clean checkout without .local-tools: normal browser tests must use installed Playwright; cover in Task 1.
2. Child test failure or unavailable preview port: fail promptly and clean up only the owned server; cover in Task 1.
3. Unknown URLs and missing assets: serve a genuine HTTP 404 with useful no-JavaScript content; cover generation in Task 2 and host responses in Task 4.
4. Unhashed assets and accidental source publication: avoid immutable cache headers on mutable URLs and reject forbidden artifact directories; cover in Tasks 2 and 3.
5. Independent GitHub/Netlify runs and unavailable branch protection: no false claim that CI implicitly blocks publishing; cover configuration review and runbook in Tasks 3 and 4.

## File map and interfaces

- scripts/browser-runtime.mjs: export async loadChromium(), returning the Playwright Chromium BrowserType. Default import is repository Playwright; explicit GUIDE_BROWSER_ROOT retains optional local override.
- scripts/run-browser-checks.mjs: orchestrate an owned static server, readiness deadline, three existing browser scripts, and cleanup; process exits nonzero on failure.
- scripts/verify-guide-browser.mjs, verify-editorial.mjs, verify-reduced-motion.mjs: consume loadChromium instead of repeated local imports; preserve all assertions.
- scripts/static-not-found.tsx: export renderNotFoundDocument(): string, using existing WikiProvider and NotFound.
- scripts/prepare-static.mjs: load the TSX renderer through a config-free Vite SSR loader, write build/client/404.html, close Vite in finally.
- scripts/verify-deployment.mjs: read-only smoke checks of an explicit HTTP(S) base URL; export checkDeployment(baseUrl): Promise<void> for fixture tests.
- tests/browser-runtime.test.ts, tests/static-not-found.test.tsx, tests/deployment.test.ts: focused behavior coverage.
- netlify.toml, .nvmrc, .github/workflows/ci.yml: provider/runtime declarations.
- package.json/package-lock.json: exact Playwright devDependency and shared scripts.
- docs/deployment.md and README.md: later connection and release runbook.

## Task 1: Portable browser validation

**Interfaces:** loadChromium() is consumed by all existing browser scripts. npm run verify:browser:all builds on an already prepared build/client and returns a reliable process exit status.

- [x] Read the three browser script prologues and current output directories. Use native WSL storage for installs/builds. At execution start inspect git status and apply using-git-worktrees; any isolated checkout must include the intended existing UI work without dropping or committing unrelated changes. Do not build from an older HEAD and call it the current application.
- [x] Resolve the current installed local Playwright version or a compatible published stable version, confirm it supports Node 24 and hosted Linux, and pin that exact version through npm install --save-dev --save-exact playwright@VERSION. VERSION here means the verified package version selected at execution, not a literal dependency value. Record it in the lockfile and plan completion notes. Do not copy the ignored runtime into Git.
- [x] Add a regression test proving the default loader works without GUIDE_BROWSER_ROOT and does not inject local paths. Use the real installed module with browser launch reserved for integration verification:

```ts
it('loads repository Chromium without WSL environment defaults', async () => {
  vi.stubEnv('GUIDE_BROWSER_ROOT', '');
  const browserPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const libraryPath = process.env.LD_LIBRARY_PATH;
  const { loadChromium } = await import('../scripts/browser-runtime.mjs');
  expect((await loadChromium()).name()).toBe('chromium');
  expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe(browserPath);
  expect(process.env.LD_LIBRARY_PATH).toBe(libraryPath);
});
```

- [x] Run the focused test and confirm it fails because the loader is missing; implement the loader below and add an invalid-explicit-root assertion which expects rejection rather than silent fallback. Restore stubbed environment after each test. Add a declaration or use a TypeScript module if needed for strict test typing; preserve the exported interface.

```js
export async function loadChromium() {
  const root = process.env.GUIDE_BROWSER_ROOT;
  if (!root) return (await import('playwright')).chromium;
  const resolved = resolve(root);
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(resolved, 'browsers');
  process.env.LD_LIBRARY_PATH ??= resolve(resolved, 'libs/usr/lib/x86_64-linux-gnu');
  return (await import(pathToFileURL(resolve(resolved, 'node_modules/playwright/index.mjs')).href)).chromium;
}
```

- [x] Replace only the duplicated browser-loading sections in the three scripts. Keep source, highlight, route-count, accessibility, and layout assertions unchanged.
- [x] Implement run-browser-checks.mjs using Node child_process.spawn and the locally installed serve CLI entry (resolve via createRequire rather than shell interpolation). Serve build/client at 127.0.0.1 on a reserved test port, reject an occupied port before spawning, and require readiness within 20 seconds. Run scripts in sequence through process.execPath with inherited output and the explicit base URL. Record child exit/error events; any failed check sets a nonzero exit. In finally terminate the owned server and wait for exit with a bounded fallback kill. Never terminate the user's existing port-3000 server.

```js
const checks = ['verify-guide-browser.mjs', 'verify-editorial.mjs', 'verify-reduced-motion.mjs'];
for (const script of checks) {
  await runNode(resolve('scripts', script), [baseUrl]);
}
```

Define runNode(file,args) locally as a Promise rejecting on spawn error or nonzero exit and resolving only on exit code 0. Keep shell:false. Handle SIGINT/SIGTERM through the same cleanup path.

- [x] Verify the orchestrator with an occupied-port fixture and a failing-child fixture, asserting nonzero status and no orphan owned process. Make command execution injectable into a small exported orchestration helper if needed; do not add public environment switches that disable real QA. Run the focused tests, then run the actual three suites with repository Playwright and installed Chromium on Linux.
- [x] Add verify:browser:all to package.json. Commit only the browser tooling and its tests after passing checks.

## Task 2: Checked static artifact and useful 404

**Consumes:** Existing NotFound, WikiProvider, React Router MemoryRouter; installed Vite. **Produces:** build/client/404.html and npm run build:static.

- [x] Add a render test that fails before the new renderer exists:

```tsx
it('renders an independent styled 404 with a working home link', () => {
  const document = new JSDOM(renderNotFoundDocument()).window.document;
  expect(document.querySelector('h1')?.textContent).toBe('Page not found');
  expect(document.querySelector('a')?.getAttribute('href')).toBe('/');
  expect(document.querySelector('style')).not.toBeNull();
  expect(document.querySelector('script')).toBeNull();
  expect(document.documentElement.lang).toBe('en');
});
```

- [x] Implement static-not-found.tsx with ReactDOMServer renderToStaticMarkup, MemoryRouter, WikiProvider, and the existing NotFound component. Include doctype, html lang=en/class=light, UTF-8, viewport, title, noindex meta, theme color, favicon, and a semantic main. Do not use root Layout, which depends on framework rendering context and adds hydration scripts.

```tsx
return '<!doctype html>' + renderToStaticMarkup(
  <html lang="en" className="light">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <meta name="theme-color" content="#faf9f6" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <title>Page not found | Aion 2 Wiki</title>
    </head>
    <body><WikiProvider><MemoryRouter><main><NotFound /></main></MemoryRouter></WikiProvider></body>
  </html>
);
```

- [x] Implement the generation script with a config-free Vite server so the application's React Router dev plugin is not activated for this build helper:

```js
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { renderNotFoundDocument } = await server.ssrLoadModule('/scripts/static-not-found.tsx');
  await writeFile('build/client/404.html', renderNotFoundDocument(), 'utf8');
} finally {
  await server.close();
}
```

Validate Chakra/Emotion SSR under this loader. If required configure SSR externals explicitly; retain no scripts/no runtime server output. Include scripts TS/TSX in typecheck only where needed, without pulling ignored tooling into compilation.

- [x] Add build:static as `npm run build && node scripts/prepare-static.mjs && npm run verify:static`. Extend output verification with 404 semantic assertions and absence of content/source, .local-tools, .git, .env files, and generated server/functions directories in the publish root. Keep the original 57-route checks unchanged.
- [x] Run the render test, production build, full static verification, and browser visit to /404.html with JavaScript disabled. A local /404.html HTTP 200 is expected for direct access; actual unknown-path status is verified separately against Netlify or a fixture serving 404.
- [x] Commit this artifact preparation and its focused tests after passing checks.

## Task 3: CI and Netlify configuration

**Consumes:** build:static and verify:browser:all. **Produces:** npm run check, npm run build:netlify, workflow check wiki-ci, and netlify.toml.

- [x] Write .nvmrc containing 24.21.0. Define check with content:check, verify:content, lint, format:check, typecheck, and `vitest run --pool=vmThreads --maxWorkers=1`, chained with &&. Define build:netlify as `npm run check && npm run build:static`.
- [x] Create the provider configuration:

```toml
[build]
  command = "npm ci && npm run build:netlify"
  publish = "build/client"

[build.environment]
  NPM_VERSION = "12.1.0"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Confirm all /assets output filenames are content-hashed before keeping that header. Do not add cache overrides for /images or route HTML/data. No fallback redirect is required because 404.html is present.

- [x] Create ci.yml with pull_request, push branches:[main], workflow_dispatch; contents:read; concurrency group based on workflow and pull_request.number or ref, cancel-in-progress:true. Use one job named wiki-ci on ubuntu-24.04 with timeout-minutes:30. Steps: checkout, setup-node reading .nvmrc with cache:npm, install npm@12.1.0, npm ci, npm run check, npm run build:static, npx playwright install --with-deps chromium, npm run verify:browser:all, failure-only upload of the known .local-tools/qa output directories with retention-days:7.
- [x] Resolve checkout/setup-node/upload-artifact releases from their official repositories and pin verified full commit SHAs with readable version comments. Do not invent SHA values or use an unverified latest tag. Do not add Netlify credentials, pull_request_target, scheduled runs, or a second deploy job.
- [x] Validate TOML and YAML with an actual parser/linter or pinned Netlify tooling. Check required check name, permissions, triggers, condition on artifact upload, timeout, and command order. For this declarative configuration, use syntax checks and actual commands rather than implementation-mirroring unit tests.
- [x] Run npm ci then npm run build:netlify in a clean native Linux copy without .local-tools/node_modules/build; install Chromium and run verify:browser:all. Retain command logs. Verify npm ci did not modify package-lock.json and the install/build included no runtime Netlify adapter. Resolve genuine existing failures in scope without weakening source audits or silently formatting unrelated user files.
- [x] Commit provider/workflow/runtime declarations and shared commands after the clean run passes.

## Task 4: Deployment smoke checks and connection runbook

**Consumes:** Prepared artifact and existing content path list. **Produces:** npm run verify:deployment -- URL and docs/deployment.md.

- [x] Add HTTP fixture tests before implementing checkDeployment(baseUrl): Promise<void>. Run a local Node HTTP fixture that serves representative valid HTML/assets and a semantic 404. Assert success for that fixture; then change the unknown response to status 200 and assert rejection. Also test missing image 404 failure, a known route containing the fallback instead of its expected article text, and a server that never answers (must time out).

```ts
await expect(checkDeployment(fixtureUrl)).resolves.toBeUndefined();
fixture.setMissingStatus(200);
await expect(checkDeployment(fixtureUrl)).rejects.toThrow(/404/);
```

Implement the fixture lifecycle inside tests with explicit listen/close and port 0; add declarations if importing an mjs helper under strict TS.

- [x] Implement a read-only CLI accepting exactly one HTTP(S) base URL. Reject credentials, unsupported protocols, query/hash, and non-root base paths; permit localhost for fixture validation. Use fetch with a ten-second AbortSignal timeout per request. Check /, /categories/gear-and-basics-explained (resolve the exact real category path from the catalogue at implementation), gear-anatomy article, /source, and trailing-slash variants against source-derived identifying text. Select a real referenced local image from the catalogue/figure repository and assert successful non-HTML image content. Request a unique nonexistent path and nonexistent asset; require 404 and a useful Page not found document for the page. If a named category differs, use the first actual category's path rather than adding a nonexistent route.
- [x] Keep exported checkDeployment free of unconditional CLI execution; compare import.meta.url with the invoked script path before running it. Add package script verify:deployment. Add server fixture tests for mismatched headers/status/content. The tool never deploys, edits a site, or monitors periodically.
- [x] Write docs/deployment.md covering every numbered connection step from the spec. Explicitly state: native Netlify builds do not wait for GitHub, actual required-check names must be selected after their first run, branch-protection eligibility depends on GitHub visibility/plan, first import can trigger a deploy so verify visibility first, and remote/Netlify setup is not done by local configuration. Include these operator commands:

```bash
npm ci
npm run build:netlify
npx playwright install --with-deps chromium
npm run verify:browser:all
npm run verify:deployment -- https://YOUR-DEPLOY-URL.netlify.app
```

The last URL is explicitly an operator-supplied example, never a hardcoded production target. Document main as intended production branch without renaming the current branch, netlify.app first/custom DNS later, previews/noindex versus access control, no application secrets needed, commit/deploy traceability, billing checks, retained-deploy rollback, pause publishing, Git revert/fix, and resume. Distinguish local HTTP fixture results from live Netlify behavior.
- [x] Update README validation/static-hosting sections to refer to new commands and runbook, retain source authoring details, and explain the optional explicit WSL browser override.
- [x] Run the focused smoke tests, full core checks, build/static verification, browser suites, format and diff checks. Review all changed files against the spec. Use requesting-code-review and verification-before-completion at the required execution stages. Fix actionable review findings and rerun affected checks.
- [x] Commit only deployment implementation/docs. Report locally verified readiness and pending user connection steps. No push, live smoke invocation, external project creation, or deployment occurs without the later account/remote context.

## Final handoff

List commands verified, commit(s), and the runbook link. Explain that live routing, preview visibility, provider branch protection, and actual Netlify build compatibility remain to be checked after connection. Preserve unrelated unstaged changes. Do not claim the wiki is deployed.
## Execution record — 2026-09-25

Completed locally on codex/aion2-wiki. Implementation commits: 2bf5db5, 52e161a, 1c4b12f, 4d5449a, fb6f45e, dc1f0dc, 68e0ca3, b8041d2.

Each task received an independent spec/quality review. Findings fixed: interrupted browser-runner spawning, preview-port ownership, publish-directory .npmrc/scripts exposure, clean-checkout test fixture independence, dialog focus timing, cross-origin smoke false-success, and the README's obsolete build sequence. Final whole-change review found only that README correction; its follow-up review completes the review chain.

Final controller verification in the clean native Linux copy passed npm run check (19 files, 147 tests) and npm run verify:static (57 routes, 1,599 blocks, 90 figures, 107 referenced local assets). npm run build:static previously passed on the same application source. Default repository Playwright completed 114 guide route checks, 21 editorial checks, and reduced-motion/focus checks; subsequent changes were smoke tooling/docs only. Local HTTP fixtures cover the smoke checker; no hosted URL has been checked.

Execution decision: used the existing feature checkout with explicit-file commits rather than create another worktree, preserving current uncommitted article UI changes and preview context. The risk is accidentally mixing pending work into commits; explicit staging kept those edits separate. They still need committing before the user's initial push if intended for publication.

GitHub remote, Netlify project, provider branch protections, site visibility, live routing/headers, actual hosted builds, and publication remain deferred until the user connects the accounts. The branch is retained locally. The setup/runbook is docs/deployment.md.