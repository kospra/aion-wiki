# New-player reading, phase 1: design

Date: 2026-09-25. Status: approved and implemented (2026-09-26).

Research and mockups: [Aion 2 Wiki Rework](https://claude.ai/artifact/NcBZe6RWDFgrh8GZ7pnzZb) (private artifact). Earlier content audit: [2026-09-24 content purpose audit](../../research/2026-09-24-content-purpose-audit.md).

## Goal

Make the existing articles readable for players arriving with the Global launch on 5 October 2026, without changing what the guide says. Phase 1 changes presentation and navigation only. It lands before launch.

## Decisions this phase relies on

The user accepted decisions D1–D8 from the research. Phase 1 uses:

- **D1** Fully shaded `#f8f9fa` text renders as a callout. The exact color stays in the DOM mark and as the callout edge.
- **D2** A rendering rule shows the author's TLDR first in its article. Stored block order stays the source order. The research placed this in phase 2; it moves here because it is a pure rendering rule.

D3, D4, D7 and D8 wait for phase 2, and D5 and D6 for phase 3. They depend on article boundaries, overlays or generated views that the Google Doc sync design will define. Code is the design source of truth; the Figma workflow was removed.

## Constraints

1. **Sync-safe.** Every behavior is a rule over content: formatting, text patterns or block structure. No rule refers to a block ID, figure ID or specific article, except the three title fixes below. When the importer later regenerates content from an updated Google Doc, the same rules apply to the new text automatically.
2. **Source fidelity.** Every source character, number, highlight, link and figure placement still renders. The integrity validator and static verifier keep their guarantees. The only content-model change is formula expressions gaining inline formatting.
3. **No new words about the game.** Rules restyle or reorder the author's text. They add interface labels only, such as "On this page".
4. **Existing quality bars.** Keyboard access, visible focus, reduced motion, readable no-JavaScript output, no horizontal page overflow at 320px, tokens from `theme.ts`.

## Rendering rules

All rules live in the shared renderer (`RichContent` and helpers in `app/content/reader.ts` or a new `app/content/rules.ts`), so article pages and the source page behave the same.

### R1 Callouts from the author's shading (D1)

- A paragraph, list item or table cell is a **shaded block** when every non-whitespace inline run has `highlight: "#f8f9fa"`.
- A run of consecutive shaded blocks that share a parent (siblings at the same nesting level) renders as one callout: `wiki.surface` background, 1px `wiki.border`, a 3px start edge in exact `#f8f9fa`, `wiki.inset` radius and body text in `wiki.ink`.
- Inside a callout, `<mark data-source-highlight="#f8f9fa">` stays in the DOM with a transparent background and inherited color, so the static verifier still reads every highlighted character. Links inside keep link styling.
- A new callout starts at every shaded block that has its own lead-in. A callout directly after a heading that names "TLDR" uses the summary icon.
- The callout's icon comes from its lead-in: the text of its first block before the first colon, or its first three words if there is no colon, matched case-insensitively: "IMPORTANT", "Important" or "Important Note" gives a warning icon; "TLDR" or "STAT VALUE TLDR" a summary icon; "BEGINNER NOTE" a tip icon; "QUICK FAQ" a question icon; anything else a neutral note icon. Icons are decorative (`aria-hidden`). The callout is a `div` with `role="note"`, which avoids adding a landmark for every note.
- A single-item list whose item is shaded renders as the callout without a bullet.
- A shaded heading, such as "STAT VALUE TLDR", keeps its heading role with a transparent mark.
- No partially shaded text exists today. If some appears, it gets a subtle `wiki.raised` background instead of a white bar. Yellow `#ffff00` highlights are unchanged.

### R2 TLDR first (D2)

- Among an article's top-level blocks, a **TLDR block** is a paragraph whose text starts with "TLDR", or a heading whose text contains "TLDR" together with the blocks that follow it up to the next heading of the same or higher level.
- If an article has TLDR blocks, they render first, directly under the article header, in their original relative order. They render only once. The contents box lists them first.
- Today this affects Weapon and Guard, Armor, Accessories, Belt and Amulet, Runes, Pendant and Offensive stat values.

### R3 Small figures inline

- A figure whose original width and height are both 64px or less renders as a plain image at its original size, without the zoom button or frame. It keeps its alt text and placement. A full-size viewer adds nothing for a 52px icon.

### R4 Section grids

- A **card section** is a heading followed by content that stays short: paragraphs and list items of at most 160 characters each, list nesting at most three levels, and optional callouts. It has no figures, tables or formulas, and no more than 20 lines in total. A group block that starts with a heading counts as a section, which covers the wing catalog.
- Three or more consecutive card sections with the same heading level, whose first content block has the same kind (all lists, or all paragraphs), render as a responsive grid: one column on phones, `repeat(auto-fill, minmax(12rem, 1fr))` from `md`.
- A section's card content is its first content block, then the following blocks of the same kind, plus callouts. It ends at the first block that breaks this shape. Remaining blocks render after the grid, which keeps trailing notes such as the wing FAQ and the Tier 3 remark in normal flow.
- A callout inside any section except the last stays in its card, like the Bracelet "Important Note". A callout after the last section applies to the whole grid, like the raid "Additional Notes", so it renders after the grid.
- R4, R5 and R6 do not apply inside tables.
- Inside a card, a list whose top-level items each have a nested list renders those items as columns from `sm`. This gives the wing catalog its Equip Effect and Owned Effect columns. Indented Owned Effect lines stay indented; the upgrade markers need the Wings reading key on the same page and wait for phase 2.
- Headings keep their level, id and contents entry, so anchors and the contents box still work.
- Expected matches today: Global stat priorities (13 slots), Raid requirements (4 raids), KR wing usage (9 classes), Colored Daevanion boards (4 boards), Pure Attack tiers (3), Wing catalog (12 wings).

### R5 Label and list grids

- Two or more consecutive list blocks, each with exactly one top-level item made of a short label (at most 60 characters) plus a nested list of no more than 10 lines, render as a grid of small cards: label as the card title, nested items below. Nested sub-labels such as "Set Effects" and "Cards" keep their nesting inside the card.
- Expected matches today: Pantheon stats (10), Arcana card types (10), five-card sets (2) and eight-card sets (2).

### R6 Value lines

- A paragraph whose whole text matches `^\d+%? <stat> = <value>%( ~ <value>%)?$`, for example "1% Damage Boost = 0.35%", renders as a value header: the stat on the left, the value large on the right. The text stays one DOM string, with styling spans only.
- Value lines also appear in the contents box, as level-4 entries labelled with the text before "=". They nest under the preceding heading.
- Expected matches today: the ten values in Offensive stat values.

### R7 Scope tags

- A short list of the guide's own qualifier phrases renders as an inline neutral tag, with the same text and a subtle border in `wiki.raised`: "(not confirmed for Global)", "not yet confirmed for global", "on Asia Server" and "on the Asian servers", "(KR as of …)", "(The following Stat Lines are for Global)", and "will not be in the game at launch" and "won’t be available at launch" with their variants. Matching is by regular expression over text, never by block.
- Teal stays reserved for navigation and interaction, so tags use neutral colors.

### R8 Formulas

- Formula `expression` becomes inline runs (`Inline[]`), so formatting inside a formula survives. The five formula blocks convert mechanically.
- Blocks 1021 (Closet) and 1152 (Attack Bonus) move their formula text into `expression`, keeping the bold "Formula" and the yellow "Attack Bonus". This drops the editorial label "Source formula (verbatim)", which also leaves search.
- Formula text wraps inside its panel (`white-space: pre-wrap`, `overflow-wrap: anywhere`) instead of clipping. An empty explanation renders nothing.

### R9 Author to-do notes

- Text such as "***ADD MORE DETAILS ON PORTRAITS***" (a whole paragraph wrapped in `***`) and the phrase "(need values for this)" render in muted italic, so readers can tell them apart from guidance. The text is unchanged.

## Navigation changes

### N1 Contents box

- Hidden when it would list one entry or none.
- Below `xl` it becomes a native `details` element, closed by default, with a summary "On this page · N". It works without JavaScript. From `xl` the sticky rail stays as it is today.

### N2 Chapter pages

- The chapter page becomes an overview: breadcrumb, chapter number and title, description, then the chapter's articles as a numbered list with each title linked and its summary. Previous and next chapter links follow.
- The search field, category filter, "N articles found" and result cards are removed from chapter pages. Search stays on the home page.

### N3 Article cards in search results

- Remove the "From Kanon’s guide" line and the ↗ glyph; the card is already a link. A pending article shows "Not written yet". The chapter label stays, since search results mix chapters.

### N4 Sidebar

- The desktop sidebar lists the current chapter's articles under its active row, marking the current article with `aria-current="page"`. Other chapters stay collapsed. The phone home chapter list is unchanged.

### N5 Previous and next

- When the previous or next article belongs to another chapter, its link carries a small "Previous chapter" or "Next chapter" label above the title.

## Search and titles

- **S1** Search matching normalizes spelling variants in both the query and the index: Erroded and Eroded, Synch and Sync, Vailzel and Vaizel, Primal Vigore and Primal Vigor, Talisra’s and Talisra. Displayed text is unchanged.
- **T1** Three editorial article titles regain punctuation: "Soul Binding: Bind, Sync and Reset", "Accuracy, Block and Critical Hit", "Damage Tolerance, Endurance and Combat Speed". Slugs and URLs do not change.

## Files

- `app/components/rich-content.tsx`: R1–R9 rendering. Pattern detection moves into a pure helper module with unit tests.
- `app/components/guide-figure.tsx`: R3.
- `app/components/article-contents.tsx`: N1, and R2 and R6 contents entries.
- `app/routes/category.tsx`, `app/components/wiki-directory.tsx`, `app/components/article-card.tsx`: N2, N3, S1.
- `app/components/chapter-navigation.tsx`: N4. `app/routes/article.tsx`: N5 and R2 placement.
- `app/components/ui/theme.ts`: callout recipe, scope tag and card-grid layer styles.
- `app/content/types.ts`, `app/content/reader.ts`, `scripts/content-fragments.ts` consumers and the formula JSON blocks: R8. Then `npm run content:generate`.
- Chapter JSON titles: T1.
- `README.md`, `DESIGN.md`, `AGENTS.md`: document R1 (the `#f8f9fa` exception to exact-color rendering), the new components and the rules.

## Testing

- Focused unit tests with small fixtures for each rule:
  - shaded versus partly shaded text;
  - callout icon selection;
  - TLDR ordering;
  - grid detection, including a section that breaks the shape;
  - label-list grids;
  - value lines and their contents entries;
  - scope phrases;
  - formula inline runs and wrapping;
  - small figures without a viewer;
  - contents hiding and the disclosure;
  - chapter overview links;
  - search synonyms.

  Tests assert generic behavior, never article wording.
- Update existing fixtures that change shape: formula expressions, chapter-page directory tests and the viewer test.
- Required gates: `npm run check`, `npm run build` (which includes `verify:static`) and `npm run verify:browser`.
- Visual review of the built site at 1440px and 390px on these pages:
  - Armor, Gear anatomy, Global stat priorities and Raid requirements;
  - Wing stat catalog, Offensive stat values and Five-card sets;
  - a chapter page, home search and the source page.

## Out of scope

- Phase 2: the Google Doc import pipeline and stable IDs, the Start here path and chapter groups, chapter display names (D7), reader ledes (D8), omitting title-repeating headings (D3), article boundary and link fixes (D4), wing upgrade markers and the annotated screenshot layout.
- Phase 3: glossary (D5) and generated views such as the Genus matrix (D6).

## Risks

- **False-positive layouts.** Thresholds are conservative. Every grid falls back to normal flow when a section breaks the shape. Fixture tests cover the boundaries, and the visual review covers every expected match.
- **Verifier coupling.** The static verifier reads marks, strong, emphasis, underline and links from the DOM, so callouts keep the mark element and grids keep all text in the DOM. `verify:static` runs in every build.
- **Future content.** Because rules key on content shape, new sections Kanon adds may start matching. That is the intent; the visual review after each sync catches surprises.
