# Task 9 implementation report

## Scope and files

Implemented full-guide completeness tests, the executable Node 24 integrity gate, DOM-based static verification, persistent WSL Chromium QA, and current authoring/provenance documentation. Changes are restricted to Task 9 files plus authorized small QA fixes and their regression test:

- `scripts/guide-data.ts`: reads only committed full-guide artifacts; no ignored research input or remote fetch.
- `scripts/content-integrity.ts`, `content-destinations.ts`, `content-fragments.ts`: explicit `.ts` runtime imports; direct CLI and nonzero error status. Pure imported validation remains available.
- `scripts/verify-static.mjs`: all routes, independent visible DOM reconstruction, structural order, source fields/style/link occurrences, statuses/qualifiers, table/formula fields, figures/legends/facts/uncertainties, annotation destinations, asset existence/hashes and internal fragments.
- `scripts/verify-guide-browser.mjs`: separate existing WSL Playwright installation; URL argument; route/interaction assertions and JSON/screenshots under ignored QA directory.
- `tests/guide-completeness.test.ts`: complete-data inventory, independent figure audit equivalence, mutation failures and direct CLI nonzero failure.
- `package.json`: `verify:content`, `verify:browser` scripts; `tsconfig.json`: `allowImportingTsExtensions` for Node runtime-compatible script imports under `noEmit`.
- `README.md`, `docs/source-guide-migration.md`: current WSL runtime, structured authoring contracts, commands, source fingerprints/counts, transformation method, uncertainties and static hosting boundary.
- `app/styles/article.css`: wrap unbroken source figure-legend values.
- `app/components/image-viewer.tsx`, `tests/guide-figure.test.tsx`: explicit Tab boundary wrapping and a labeled keyboard-focusable image scroll region, with regression test.

No changes to source facts, baseline, taxonomy, audit data or generated content. Existing unrelated spec, package-lock and favicon line-ending changes were preserved and excluded from this commit.

## Independent preservation evidence

- Coverage: 1,268 source records, with 959 substantive primary destinations and 309 justified layout-only records.
- Numeric occurrences: 651. Link occurrences: 21 (including two adjacent blank spans grouped with their identical labeled link for accessibility).
- Figures: all 90 placements, including both repeated-artwork placements 042/043, backed by 89 unique original SHA-256 hashes.
- Figure audit: 321 mappings, all 71 uncertainty records and eight additional qualifiers preserved in display fields. No equivalent-grouping exceptions were needed.
- Routes: 57 (home, source, 12 categories, 43 articles).
- Static output: 1,599 structured rendered blocks, 90 figures and 104 local asset paths verified.
- Full validation uses no `externalDestinations`. Source primary destinations are checked independently; secondary contextual copies cannot cover missing primary source wording.
- Static validation reconstructs visible source runs from parsed DOM, including strong/emphasis/underline/highlight/link provenance, and reruns the baseline validator. Script payloads, hidden content, closed dialogs and editorial labels cannot substitute for source prose. Entity decoding and inline boundaries use DOM traversal rather than regex stripping.
- Production browser checks compare every source-bearing block field and every figure caption/mapping/fact/uncertainty against actual `innerText`, with CSS visibility and overflow checks.

HTML fingerprint: `3d1a5c34900c95b1cc7af1c19167be836adbf23570e71684172a2a00480c5eb8`.
DOCX fingerprint: `ac7c3833a4d39ada22045deb471772df73b1abaf9d54e53f0f92baeb9caed826`.

## RED / GREEN and corrections

1. The old `npm run verify:static` failed with `/: missing sample disclosure`. Replaced obsolete sample schema assumptions with full rendered-content validation. New static verifier passes all 57 routes.
2. Full-data mutation tests reject removal of figure-043, removal of block-0250 coverage, deletion of one repeated numeric occurrence while retaining the source ID, deletion of Global wording from its primary destination despite contextual duplication, and replacement of an external destination while retaining its label. Valid full data returns no errors. Node CLI invalid input exits 1 and names figure-043; normal input exits 0.
3. A deliberately hidden built source heading (block-0034) retained its ID and text but failed the static verifier. Original build file restored in a `finally` block; successful static verification followed. Evidence: `.local-tools/qa/guide/static-mutation-results.json`.
4. First browser sweep failed at mobile Closet: document width 454px at viewport 375px. Root cause was figure-086's unbroken comma-separated legend values, including `13/71,36/71,...`. Element diagnostics showed legend scrollWidth 434px in a 335px container. Added `overflow-wrap: anywhere` to the legend. Source numbers/text unchanged. All mobile routes subsequently pass.
5. Real Chromium focus sequence on tallest figure-070 was original-link → Close → BODY/browser chrome. Added a failing unit test for the labeled focusable scroll region and forward/reverse focus wrapping; it failed as expected before implementation. Added explicit Tab/Shift+Tab boundary handling and a `tabIndex=0` labeled scroll region. Unit regression and browser keyboard checks pass, including actual PageDown scrolling, Escape, close button and opener focus restoration.
6. Test-harness-only adjustments: Vite rewrites `new URL` asset expressions, so the shared data loader resolves from `dirname(fileURLToPath(import.meta.url))`; ESLint globals are explicit in `.mjs` browser callbacks. Prettier split a bracket property access onto a new line; `.item()` avoids the `no-unexpected-multiline` lint conflict.

## Commands and outcomes

All shell commands used WSL Ubuntu at `/mnt/c/code/aion-wiki` via `wsl.exe --exec bash -ic`, selecting `nvm use 24` in each shell (Node 24.21.0/npm 12.1.0). No installation, Windows runtime cache, source fetch, or deployment was needed.

- `npm run content:generate`: generated 43 article entries across 12 chapters; deterministic output unchanged.
- `npm run content:check`: catalogue current.
- `npm run verify:content`: 1,268 source blocks, 90 figures, 44 source/article pages; exit 0.
- `npm run lint`: exit 0.
- `npm run format:check`: all matched files use Prettier style; exit 0.
- `npm run typecheck`: exit 0.
- `npm test -- --pool=vmThreads --maxWorkers=1`: 116 tests in 11 files passed. Log: `.local-tools/qa/guide/final-tests.log`.
- `npm run build`: all 57 known routes and SPA fallback generated; exit 0. Existing article chunk warning remains (approximately 793.79 kB minified / 133.80 kB gzip).
- `npm run verify:static`: 57 routes, 1,599 blocks, 90 figures, 104 local assets; exit 0. Log: `.local-tools/qa/guide/final-static.log`.
- `npm run verify:browser -- http://localhost:3000`: final run with production-CSS visible-text checks passed 114 route/width checks and 15 interaction groups, zero failures (2026-09-24). Evidence: `results.json` and `final-browser.log`.

Browser coverage includes actual Enter and Space chapter toggle activation/aria-expanded; chapter → article → source-fragment navigation; direct article reload; full-text source and figure searches; combined category filtering and reset; source overview; pending article; transfer order; Genus and Wings; long tables with real ArrowRight scrolling; styled formula fields; image Enter, Tab/Shift+Tab, PageDown, Escape, close/focus-return behavior; all original image loads; client missing-page recovery; and expected direct-unknown server HTTP 404. No host fallback configuration was invented.

## Browser evidence and visual inspection

Results directory: `C:/code/aion-wiki/.local-tools/qa/guide/` (WSL `/mnt/c/code/aion-wiki/.local-tools/qa/guide/`). Persistent JSON: `results.json`; command logs: `final-browser.log`, `final-static.log`, `final-tests.log`, `final-lint.log`, `final-format.log`.

Representative screenshot filenames include `home-375.png`, `home-1440.png`, `source-375.png`, `gear-375.png`, `chapters-Enter-375.png`, `chapters-Space-375.png`, `gear-transfer-and-material-costs-375.png`, `global-genus-stat-priorities-375.png`, `wing-stat-catalog-375.png`, `theostones-1440.png`, `closet-stats-and-outfit-calculation-375.png`, `offensive-stat-values-and-attack-comparisons-375.png`, `viewer-figure-003-375.png`, `viewer-figure-070-375.png`, `class-passives-375.png`, and `missing-page-375.png`, with desktop counterparts for the principal pages. The final script eagerly decodes images before interaction screenshots and uses instant scroll positioning to avoid mid-animation captures.

Visually inspected representative mobile gear/TOC, mobile Genus table, styled formula, normal and tall-image dialogs, desktop homepage and transfer recipe. Re-inspected final Genus top/left and fully decoded transfer recipe captures after screenshot refinements. Controller additionally inspected mobile Genus/tall viewer and desktop combat table. Source details remain readable; long tables and full-size artwork use bounded scrolling; viewer toolbar remains reachable. Pre-fix diagnosis images `overflow-closet-before.png` and `focus-trap-before.png` are retained separately.

## Remaining limits and handoff

All source uncertainty remains labeled: dated KR/Global distinctions, Arcana membership disagreement, screenshot ambiguities, literal/unconfirmed formulas, and Class Passives Coming soon. This migration does not verify current mechanics or resolve the author's uncertainty by invention.

Known large article bundle is the previously deferred optimization, not a failure seen in browser reading flows. Known direct URLs refresh correctly; direct unknown URLs intentionally get the static preview server's 404 while React client navigation shows the recoverable missing-page view.

Preview remains available at `http://localhost:3000`, reusing the controller's running production preview. No publish or merge performed. Controller owns fresh Task 9 specification/code review and subsequent whole-branch review; this report does not claim those independent reviews are complete.
