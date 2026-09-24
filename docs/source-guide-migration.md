# Captured guide migration

The wiki preserves the captured version of Kanon's Aion 2 guide as 43 articles, 12 chapters, a source overview and homepage: 57 prerendered routes. This is a migration of the author's statements and evidence, not independent verification of current game mechanics. Source qualifications and dates remain visible.

## Capture fingerprints and inventory

The independent committed baseline records these SHA-256 fingerprints:

- HTML: `3d1a5c34900c95b1cc7af1c19167be836adbf23570e71684172a2a00480c5eb8`
- DOCX: `ac7c3833a4d39ada22045deb471772df73b1abaf9d54e53f0f92baeb9caed826`

The frozen source has 1,268 blocks: 959 substantive destinations and 309 explicitly justified layout-only exclusions. It contains 651 numeric occurrences and 21 link occurrences. All 90 figure placements survive, backed by 89 unique original hashes. The repeated artwork in figures 042 and 043 shares storage but retains separate source placement and explanation. There are 321 audited annotation mappings, 71 visible figure uncertainty records and eight additional screenshot qualifiers.

The article groups contain 14, six and 23 articles; their figure groups contain 25, 28 and 37 placements and 71, 106 and 144 mappings. The source overview belongs to group A but is counted separately from the 43 articles.

## Transformation and preservation checks

The offline importer extracted text, numeric/link occurrences, source formatting offsets, image hashes/dimensions and source order into `content/source/baseline.json`. The reviewed taxonomy and category contract define article boundaries. Author text is represented in source-attributed structured leaves; tables and nested lists retain the source's facts, hierarchy and numbering. Editorial labels, uncertainty notes and captions are separate from source-bearing text. Every substantive source block has one primary coverage destination. Extra contextual copies cannot compensate for missing primary content.

Original artwork is served locally at its captured available resolution. Figure audit records are committed separately from rendered figure data. Each numbered or colored mark has a readable label and meaning, with supporting source links where available. Screenshot-only evidence and uncertain readings remain adjacent to their figure. Multi-image recipes preserve the output/arrow/input order.

Inline emphasis, underline and the captured highlight survive. Formulas remain literal rather than being corrected or converted to calculators. For styled formulas at source blocks 1021 and 1152 the literal equation is in the rich explanation field and the expression field says `Source formula (verbatim)`; both fields render. Other formulas retain their literal expression directly.

Google redirect links are unwrapped without losing timestamps. Known source anchors resolve to local article fragments. Unmatched source document anchors retain their original destination and a visible explanatory note. Two blank link spans adjacent to an identical labeled link at block 0424 are grouped with that accessible link; the independent audit retains all original occurrences.

The final checks have two independent layers: full-content validation against the frozen baseline, then reconstruction of visible source-bearing runs from built HTML and repeat validation. DOM parsing handles entities, inline spans and line breaks. Scripts, closed dialogs, hidden content, labels and metadata cannot replace missing source text. Every rendered block, table column/row, formula field, figure/legend/fact/uncertainty, status and qualifier is checked. Every local asset exists, original image hashes match, and internal route/fragment destinations resolve. The browser sweep checks CSS visibility and all known routes at both 375px and 1440px, plus search/filter/reset, chapter navigation, source references, refresh, pending pages, missing-page recovery and keyboard image viewing.

All normal tests, generation, builds and verification read committed artifacts only. The original offline research capture remains locally available for provenance, but is unnecessary in a clean checkout. No source document is fetched during validation.

## Source ambiguities retained

All 71 figure uncertainty records are rendered verbatim beside their figure, with no loss hidden behind grouped counts. The eight separate audit qualifiers are visible as figure facts. Article-level qualifications preserve region, date, author assumptions and confidence. Examples include:

- KR/Global differences, season/level assumptions, and dated KR class/Wings rankings.
- The Arcana eight-card arrangement with nine listed memberships and the source's alternative five-card setups.
- Genus screenshot examples that are not presented as ideal stat priorities.
- Conflicting or approximate screenshot labels, growth costs, transfer materials and the combat sample's limited scope.
- The source's 79%/80% and 490/499 disagreements, literal formula notation, and unconfirmed Multi-Hit behavior.
- Class Passives contains only the captured Coming soon placeholder.

No uncertain values are silently promoted to confirmed mechanics. A later source revision requires a new capture and deliberate reconciliation, not changes to this baseline to satisfy a test.

## Evidence and deployment boundary

The persistent commands are documented in the README. Browser results and representative screenshots are saved in `.local-tools/qa/guide/`; that directory is intentionally ignored. Browser tests run against production preview at `http://localhost:3000` and accept another base URL. Known direct routes work without fallback. Direct unknown URLs return the static server's 404; the React missing-page view and recovery are checked through client navigation. Host fallback configuration is a separate deployment decision.

A browser-detected 375px overflow in the Closet figure legend was fixed by allowing long preserved comma-separated values to wrap. The tall-image viewer also gains explicit Tab/Shift+Tab boundary wrapping and a labeled focusable scroll region after Chromium QA showed focus could leave the native dialog for browser chrome. No source wording or numbers changed. The build still reports the known large article bundle (about 793 kB minified); bundle splitting is a separate optimization. This task does not publish or merge the site.
