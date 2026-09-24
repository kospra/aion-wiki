# Aion 2 source guide migration design

## Purpose and approved direction

Populate the existing static React wiki from the supplied Google Doc, preserving its information and chapter structure. Replace the sample material with source-backed content, and explicitly connect numbers and colors in illustrations to their explanations. The user approved the proposed 12 chapter categories, 43 articles, and separate source overview. This document defines that migration; it does not authorize publishing or adding independently researched game claims.

## Source baseline

Source: https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/edit

The locally captured HTML and Word exports are retained under `.local-tools/source-doc/` alongside the extraction and review artifacts. Source HTML SHA256: `3d1a5c34900c95b1cc7af1c19167be836adbf23570e71684172a2a00480c5eb8`. Source Word SHA256: `ac7c3833a4d39ada22045deb471772df73b1abaf9d54e53f0f92baeb9caed826`.

The inventory has 1,268 ordered blocks, of which 959 contain text or figures, and 90 image placements representing 89 unique image assets. Both exports contain the same multiset of 651 numeric text tokens. This cross-check excludes generated list markers and screenshot text, which require separate preservation. There are 21 link occurrences. Some visible tables are images rather than HTML tables.

Retain the explicit September 20, 2026 update note. Record that the original date header is malformed (`/20/2026`); do not silently repair it. Wings has a separate KR August 21, 2026 ranking date and was explicitly not refreshed by the September 20 update.

## Information architecture

Keep the source chapter order and names recognizable. Use the existing `/categories/:slug` and `/articles/:slug` routes, with stable slugs from the following structure. Use `/source` for author/source context and `/` for the wiki index. The result has 57 known prerendered routes: homepage, source overview, 12 categories, and 43 articles.

| Chapter category | Articles |
| --- | --- |
| 1 Gear and basics explained | Gear anatomy and stat layers; Pantheon stats and statues |
| 2 A closer look | Weapon and Guard; Armor; Accessories; Belt and Amulet; Runes; Pendant |
| 3 Ideal stat lines | Stat-line rerolling strategy; Global stat priorities by equipment; Raid Accuracy and Critical Hit requirements |
| 4 Skills | Active skills and Specialty perks; Passive skills; Stigma skills |
| 5 Enhancement | Growth and amplification; Potential enhancement; Manastones and Soulstones; Theostones; Soul Binding Bind Sync and Reset; Gear transfer and material costs |
| 6 Arcana | Arcana card types and stat pools; Upgrading Arcana; Crafting Arcana; Five-card and eight-card set setups |
| 7 Daevanion boards | Shared boards and tile priorities; Colored Daevanion boards |
| 8 Pet Genus | Insight levels and efficient analysis; Asia Genus stat priorities; Global Genus stat priorities; Pet owned effects |
| 9 Wings | Wing effects and enhancement; Wing stat catalog; KR class wing rankings and positional FAQ |
| 10 Closet | Closet stats and outfit calculation |
| 11 How stats work | Stat efficiency and diminishing returns; Offensive stat values and Attack comparisons; Multi-hit; Power Shards; Accuracy Block and Critical Hit; Defense and Penetration; Damage Tolerance Endurance and Combat Speed; Damage formula and Pure Attack |
| 12 Class Passives | A clearly marked source-pending page retaining the source's Coming soon status |

The source overview retains the author's identity and links, author-reported credentials, attribution to Aion Research Lab, update notes, limitations, and editorial notes. Do not write the author's first-person claims as claims by the wiki editor. The detailed range-to-article assignment in `proposed-taxonomy.json` assigns every source block once and all image placements; preserve that as the migration coverage baseline.

Retain nested headings within articles, especially equipment priorities, card sets, board names, wing entries, and formulas. Short related sections may share an article, but must remain individually addressable by section anchors. Category pages list articles in document order, not alphabetical order. The Global stat priorities article must carry the regional qualifier and rarity-percentage explanation from source blocks 0250 and 0248 as referenced context, while their original placements remain in the preceding reroll article.

## Content representation

Extend the existing typed content model instead of embedding the exported Google HTML. Use inert structured data for paragraphs, heading levels, ordered and unordered lists, comparison tables, formulas, notes, figures, and figure groups. Inline content must support emphasis, meaningful underlines/highlights, links, and line breaks. Escape text through React rendering; do not execute imported markup, styles, scripts, or arbitrary URLs.

Each content block has a stable id and its source block ids. Each article has title, slug, category, summary, ordered blocks, source reference, and status. Status distinguishes source-backed guidance, source uncertainty/disagreement, and the source-pending Class Passives page. Regional and date qualifiers attach to the specific affected section or table, not only a global footer.

Separate chapter content modules, a lightweight directory/search index, shared content types, figure metadata, and source-coverage data. Article bodies must not be required by the global header. Keep the current React Router/Vite/TypeScript stack and fully static deployment. No database, CMS, authentication, remote runtime fetch, or deployment provider is introduced.

Preserve every substantive statement, number, unit, comparison, condition, example, formula, warning, author qualification, and external reference. Reflow prose and organize repeated stat lists into readable tables without merging away regional or conditional distinctions. Display source opinions as source recommendations. Retain explicit unknown values and work-in-progress notes. Empty spacing and document-only separators may be normalized only with an explicit layout-only classification in the coverage manifest. Stray editorial fragments remain accounted for in source notes rather than silently discarded.

## Figures and visual references

Keep all 89 unique source images locally at their original available resolution and preserve all 90 placements. Deduplicating the repeated file is allowed; removing either placement is not. Keep readable aspect ratios, intrinsic dimensions, and lazy loading. Generate smaller display derivatives only when useful; full-size originals remain accessible.

Every figure has an accessible description, caption, source placement, and a readable text legend or transcription for relevant visible information. Use a full-size image view with keyboard-accessible opening, closing, focus return, and Escape behavior; preserve direct access to the original image. Group related before/after or input/output images together instead of treating them as unrelated gallery tiles.

Legends connect visual markers to text through explicit labels, color names, exact visible values, and links to article sections. Color alone cannot carry the meaning. Distinguish colored annotations from item rarity, stat grade, UI state, and graph series. For example:

- Gear figure005: green1 enhancement/amplification; white2 base stats; orange3 amplification stats; purple4 Soul Binding; red5 Manastones; cyan6 Theostone. Figure006 continues yellow7 Potential.
- Soul Binding figure041: yellow frame Bind, purple frame Sync, green frame Reset. These are menu annotations, not rarity tiers.
- Transfer cyan x1-x5 overlays denote output fragment quantities, not item level. Preserve the paired input/output arrow relationships.
- Pet slot diagrams explicitly map positions 1-9 to their respective stat pools. Keep Asia and Global recommendations separate; example rolls are not necessarily recommended BIS rolls.
- Pantheon highlight/underline semantics identify the prioritized bundled stats and the component stat explaining each priority.

Capture screenshot-only values, probabilities, costs, tier labels, nonstacking restrictions, and graph labels in accessible content. Do not infer a number from a cut-off label. Identify unreadable details honestly and keep the original image available. Represent screenshots as examples unless the source explicitly defines a universal rule or target.

## Source disagreements and incomplete claims

Preserve both sides of a source disagreement in a local Source note; do not resolve it using guesswork or silently replace it with newer external information. The completed figure audits are the evidence for these notes. Required known cases include:

- Arcana eight-card prose repeats Parchment across sets and conflicts with the illustrated equipment arrangement. Label the illustration and text as separate source examples with an explicit discrepancy.
- Accuracy/Critical graph marks approximately 79% at 1,200 while prose describes the 80% cap at that difference. Retain the approximation and ceiling distinction.
- Screenshot and prose grade names can differ, including Manastone tiers and the Pet Smite/Double Chance terminology. Preserve both labels with the mapped meaning and confidence.
- Unknown Muspel Normal requirements, approximate raid requirements, Armor DOUBLE CHECK, unconfirmed Global crafted potential values, and uncertain Multi-hit formula placement remain marked uncertain.
- Class Passives remains pending source content, not an invented class guide.

Retain original formula expressions, numeric assumptions, support-buff conditions, and PVE/PVP differences. If source brackets, ratios, terminology, or arithmetic are ambiguous, keep the expression labeled as the source's formula with an adjacent explanation of the ambiguity. No damage calculator is included in this migration.

## Navigation and interaction

Adapt the header and homepage to 12 chapters without overflowing. Use a compact chapter navigation control on mobile and a browsable ordered chapter index on desktop. Maintain the existing visual language and focus styling.

Articles include breadcrumbs, an in-page contents list for long pages, previous/next article links in source order, source/update context, and the richer content renderer. Comparison tables remain readable on narrow screens with labeled horizontal scrolling where necessary. Formula blocks preserve grouping and wrap or scroll without clipping.

Search includes article text, relevant stat terminology, and figure-caption/legend text in addition to titles and summaries. Continue composing search with chapter filters and preserving useful empty/reset states. Remove sample-only disclosures from migrated content and replace them with accurate source/status labels.

Translate source-internal links into the corresponding wiki article/section anchors. Normalize Google redirect wrappers to their actual external targets while preserving meaningful query parameters such as video timestamps. Broken or ambiguous source targets must be recorded and given a useful source link instead of a dead local anchor.

## Completeness manifest and validation

Maintain a reviewable source-to-wiki manifest covering every source block, every image placement, all unique image files, meaningful formatting, and all link occurrences. Each source block maps to rendered content/source context or an explicitly justified layout-only normalization. Every substantive block must have a visible destination. The manifest must preserve source ids even where related facts are reorganized into tables.

Acceptance checks:

1. All 1,268 source blocks accounted for; all 959 content-bearing blocks retained or explicitly represented in source context; no silent content exclusions.
2. All 90 figure placements represented, all 89 unique original assets present, with audited number/color/text mappings and screenshot-only details.
3. All 651 numeric source-text occurrences traced through the migration; generated list markers and screenshot values checked separately. Tests must detect a deliberately removed value or figure reference rather than only comparing counts.
4. Chapter/article ordering matches the approved taxonomy; all 57 known routes prerender correctly with their main content present before JavaScript runs.
5. All internal references and section links resolve; external links retain correct targets and timestamps.
6. Behavior tests cover rich rendering, figure legend relationships, full-size image keyboard behavior, full-text search with chapter filtering, source-status notes, and useful missing-page recovery.
7. Static verification checks article body content, local image existence, and source disclosures appropriate to each status, replacing the old universal Sample content assertion.
8. Lint, formatting, type checking, full test suite, build, content-integrity checks, and static verification pass.
9. Browser review covers mobile/desktop chapter navigation; long stat tables/formulas; illustrated gear/transfer/Genus pages; image viewer keyboard behavior; search; article refresh; no missing assets, horizontal page overflow, hydration errors, or clipped text.
10. Independent content review checks numeric fidelity and image/text mappings against the saved source, not merely the implementer's completion claims. All source disagreements remain visible.

## Workflow and delivery

All three figure-audit groups are saved and validated: 90 figure records, 321 mappings, 71 uncertainty notes, and no missing figures or invalid block references. The normalized evidence is retained in `.local-tools/source-doc/figure-audit.json` and `figure-audit-coverage.json`. Retain the source snapshot and fingerprints through the migration; do not re-download a changing source without recording a new version. Use the user-selected subagent-driven execution method after this written spec and its implementation plan are reviewed. Deliver the updated local wiki, source attribution, completeness results, and remaining source uncertainties. Keep work local; publishing is outside this request.


