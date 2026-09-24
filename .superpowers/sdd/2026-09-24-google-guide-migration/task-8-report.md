# Task 8 report — guide routes, navigation, source links, and search

## Result

The static wiki now presents the captured guide as 12 chapters, 43 articles, and a source overview at `/source`. The 57 known paths are prerendered. The rich repository loads 44 pages and 90 figure placements; the header and build path import only the generated catalogue.

## Architectural contracts

- `app/content/repository.ts` loads chapter/source JSON in taxonomy order and exports `pages`, `figures`, `getPage`, and `sourceLinks` (plus lookup helpers). Primary coverage records and actual rendered block IDs determine source destinations. Original heading anchors and wrapped source URLs are aliases. Layout-only IDs resolve to the nearest source-bearing block in their own article. Unknown anchors retain a working original-document link and an explanatory note. The captured guide has no duplicate heading anchors and all 16 internal source links have matching targets.
- `scripts/generate-catalogue.ts` reads the reviewed pages, figures, and committed `content/source/category-contract.json` in Node 24, calls `pageText`, and writes metadata plus full-text search strings (including page-referenced figure legends and screenshot-only facts). `--check` compares exact output and does not write. `app/content/wiki.ts` exports only the lightweight catalogue, categories, and static paths; the header and React Router build config never import rich bodies.
- Article and source routes render the existing rich content and figure components with TOCs, breadcrumbs, source status, qualifiers, Kanon attribution, source links, and previous/next article boundaries. The pending Class Passives chapter explicitly states that its captured source says “Coming soon.” The homepage, cards, and directory use guide-specific descriptions and no sample labels. Search combines chapter filters with full article and figure text, preserving reset and empty states.
- A keyboard-operable chapter button reveals the complete chapter index on mobile. Desktop keeps the numbered index and source link. The existing navy/gold visual language and focus styling remain.

## RED → GREEN

The replaced sample tests initially failed in the expected places: 6 behavior failures for the sample chapter/article/search UI, and a missing source-route module prevented the new content route suite from loading. After integration, a pending-page test query matched two intentional “Coming soon” statements; the test was corrected to allow both. The new assembled-guide test invokes `validateGuide` on all pages/figures/coverage without `externalDestinations` and passes.

## Verification

Run in WSL with Node 24.21.0 and npm 12.1.0:

- `npm run content:generate` — 43 articles, 12 chapters generated.
- `npm run content:check` — current.
- `npm test -- --pool=vmThreads --maxWorkers=1` — 108 tests passed in 10 files.
- `npm run typecheck` — passed.
- `npm run lint` — passed after removing one unused binding.
- `npm run format:check` — passed.
- `npm run build` — passed; 57 route `index.html` files counted.

The production build reports a non-failing chunk-size warning for the rich article bundle (about 793 kB minified); this is the full offline guide content and remains separate from the global header catalogue. Task 9 owns formal static verification, browser proof, and README updates.

## Commit

`feat: connect complete guide navigation and search`. Only Task 8 implementation, tests, the committed category contract, generated catalogue, and this report are staged; existing unrelated spec, lockfile, and favicon changes are excluded.