# Google Guide Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the static Aion 2 wiki with the complete supplied guide, preserving its structure, qualifications, and audited image/text relationships.

**Architecture:** Store typed chapter data and original local images, render accessible rich content, and generate a separate directory/search index. Validate actual visible destinations against an independent source baseline. Preserve the React Router static build and existing visual language.

**Tech Stack:** Existing React 19.3, React Router 8.4, TypeScript 6, Vite 8.3, Vitest 5, Testing Library, CSS. Python/lxml/Pillow for local migration tooling; no new product dependencies.

**Spec:** `docs/superpowers/specs/2026-09-24-google-guide-migration-design.md` (approved).

## Global Constraints

- The result has 57 known prerendered routes: homepage, source overview, 12 categories, and 43 articles.
- Keep all 89 unique source images locally at their original available resolution and preserve all 90 placements.
- Preserve every substantive statement, number, unit, comparison, condition, example, formula, warning, author qualification, and external reference.
- Each source block maps to rendered content/source context or an explicitly justified layout-only normalization.
- Color alone cannot carry the meaning.
- Keep the current React Router/Vite/TypeScript stack and fully static deployment.
- No database, CMS, authentication, remote runtime fetch, or deployment provider is introduced.
- Article bodies must not be required by the global header.
- Keep work local; publishing is outside this request.
- Use the captured snapshot and hashes; do not re-download the changing document.
- Execution method is already selected: subagent-driven. Preserve this after plan review.

## Review Focus

1. A table drops a numeric occurrence but retains its source id: Task 2 must detect this; Tasks 5–7 independently check prose and qualifiers.
2. Identical artwork appears at different stages: Tasks 1 and 6 deduplicate storage while retaining both placements and explanations.
3. Cross-article anchors and Google-wrapped video links: Tasks 2 and 8 resolve destinations and preserve timestamps.
4. A tall screenshot opened by keyboard on mobile: Task 4 and Task 9 keep controls reachable, constrain images, close on Escape, and return focus.
5. Regional context lies in the preceding article: Task 5 carries blocks 0248/0250 into Global priorities without counting them twice as primary coverage.

## Execution conventions

Work in WSL Ubuntu at `/mnt/c/code/aion-wiki` on the existing `codex/aion2-wiki` task branch unless the worktree skill identifies an isolation requirement. Use WSL Git, Node, npm, and Python; do not depend on Windows Codex runtime caches or the recovered `.local-tools/npm` installation. Check status and preserve user changes. Read the approved spec and relevant audit before each content task. Do not repeat image inspection except to resolve a specific uncertainty.

WSL's interactive Bash initializes nvm. Verified environment: Git 2.53.0, Node 26.10.0, npm 11.19.1, Python 3.14.4. The existing project engine contract is Node `>=24.15.0 <25` and npm `>=12.1.0 <13`; use a compatible WSL nvm environment before execution rather than silently changing that contract:

```bash
cd /mnt/c/code/aion-wiki
source ~/.nvm/nvm.sh
nvm install 24
nvm use 24
npm install --global npm@12
node --version
npm --version
npm ci
npm test -- tests/content-integrity.test.ts
```

Run shell commands through the WSL console, or `wsl.exe --exec bash -ic '<command>'` when only the Windows tool entry point is available. Select Node 24 in each new shell; do not change the user's nvm default. `npm ci` recreates platform-specific dependencies for Linux, so do not alternate Windows and Linux npm installations in this checkout. Resolve Python migration dependencies in WSL before running the importer; use a dedicated venv if required. Do not use shared Codex runtime caches as a fallback.

The saved guide, original media, and completed audits under `.local-tools/source-doc` are source inputs and must remain available. Preserve QA evidence as well. Only obsolete tooling such as `.local-tools/npm` is eligible for cleanup after WSL validation; verify exact paths before deleting. Removing shared Codex runtime caches is unnecessary and outside this environment switch.

Run failing behavior tests before implementation. After each task, use the subagent-driven skill's specification and code-quality review gates. Execute content groups individually; the coordinator owns shared integration files. Stage only task files. WSL Git access is verified; use per-command author settings if needed, never global configuration. Initial WSL status reported line-ending-only changes in the spec, package lock, and favicon; preserve these and exclude them from unrelated commits rather than normalizing the entire tree.

## File boundaries and interfaces

- `content/source/{baseline,taxonomy,figure-audit}.json`: independent captured-source facts, approved article ranges/slugs, complete audited figure evidence.
- `content/coverage/group-{a,b,c}.json`: primary source destinations and justified layout exclusions.
- `scripts/import-guide.py`: reproducible offline baseline/asset extraction.
- `app/content/types.ts`, `reader.ts`: shared contracts and traversal.
- `app/content/chapters/chapter-01.json` through `chapter-12.json`, `source-overview.json`: source content in document order.
- `app/content/figures/group-{a,b,c}.json`: figures, accessible legends, screenshot-only facts, uncertainties.
- `app/content/repository.ts`: full page/figure loading for article/source routes.
- `app/content/catalogue.json`, `wiki.ts`: lightweight metadata, paths, and search index for existing consumers.
- `scripts/generate-catalogue.ts`, `content-integrity.ts`: deterministic index and independent validation.
- `app/components/{rich-content,article-contents,guide-figure,image-viewer}.tsx`: rich renderer, TOC, annotated figures, accessible viewer.
- `app/styles/article.css`: article tables/formulas/figures; `wiki.css` retains navigation/homepage styling.
- `public/images/guide/`: unique original files named by hash and original extension.

Shared types, defined by Task 2:

```ts
export type Inline = {
  text: string;
  strong?: boolean;
  emphasis?: boolean;
  underline?: boolean;
  highlight?: string;
  href?: string;
  breakAfter?: boolean;
};
export type Block = { id: string; sourceIds: string[] } & (
  | { kind: 'paragraph'; content: Inline[] }
  | { kind: 'heading'; level: 2 | 3 | 4; content: Inline[] }
  | { kind: 'list'; ordered: boolean; start?: number; items: Block[][] }
  | { kind: 'table'; caption: string; columns: Inline[][]; rows: Block[][][] }
  | { kind: 'formula'; expression: string; explanation: Inline[] }
  | {
      kind: 'note';
      label: string;
      content: Inline[];
      tone: 'context' | 'uncertain';
    }
  | { kind: 'figure'; figureId: string }
  | { kind: 'group'; label: string; blocks: Block[] }
);
export type GuidePage = {
  slug: string;
  title: string;
  category: string | null;
  summary: string;
  status: 'source-backed' | 'source-uncertain' | 'source-pending';
  sourceUrl: string;
  qualifiers: string[];
  blocks: Block[];
};
export type Figure = {
  id: string;
  sourceId: string;
  src: string;
  sha256: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  mappings: {
    label: string;
    color?: string;
    visualValue?: string;
    meaning: string;
    textSourceIds: string[];
    confidence: 'confirmed' | 'approximate' | 'unresolved';
  }[];
  screenshotOnly: string[];
  uncertainties: string[];
};
export type CoverageEntry = {
  sourceId: string;
  disposition: 'rendered' | 'layout-only';
  primary?: { pageSlug: string; blockIds: string[] };
  reason?: string;
};
export type SourceBaseline = {
  fingerprints: { html: string; docx: string };
  blocks: {
    id: string;
    text: string;
    numbers: string[];
    figureIds: string[];
    anchor?: string;
    listStart?: number;
    links: { label: string; href: string }[];
    formatting: {
      text: string;
      strong?: boolean;
      emphasis?: boolean;
      underline?: boolean;
      highlight?: string;
    }[];
  }[];
  figures: {
    id: string;
    sourceId: string;
    sha256: string;
    src: string;
    width: number;
    height: number;
  }[];
};
export type CatalogueEntry = Omit<GuidePage, 'blocks'> & {
  searchText: string;
  headings: { id: string; title: string }[];
};
```

Each page body remains in source order unless a mapped table explicitly reorganizes it. `pageText` includes only figures referenced by that page, preventing unrelated image terms from matching every search result. Table rows contain cells, and cells contain blocks. Child blocks may own source ids. Repeated contextual references are allowed, but each source id has one primary manifest entry; repetitions cannot satisfy missing primary coverage. Block ids are unique per page. Figure ids identify placements, not unique files. Preserve lists' generated numbering and source heading anchors in the baseline as additional fields when needed.

### Task 1: Preserve source baseline and original assets

**Files:** Create `scripts/import-guide.py`, `content/source/{baseline,taxonomy,figure-audit}.json`, `public/images/guide/*`, `tests/source-baseline.test.ts`.
**Consumes:** `.local-tools/source-doc/{inventory,formatting-audit,cross-export-audit,proposed-taxonomy,figure-audit}.json`, snapshots and `media/`.
**Produces:** baseline JSON, frozen article slugs, hash-addressed original assets.

- [ ] Write a filesystem-level test independent of product conversion code; declare a local `BaselineSnapshot` type matching the baseline contract so JSON callback arguments are typed under strict TypeScript (Task 2 replaces this with the shared type); run `npm test -- tests/source-baseline.test.ts` and expect missing baseline failure:

```ts
const baseline = JSON.parse(
  readFileSync('content/source/baseline.json', 'utf8'),
);
expect(baseline.blocks).toHaveLength(1268);
expect(
  baseline.blocks.filter((b) => b.text.trim() || b.figureIds.length),
).toHaveLength(959);
expect(baseline.blocks.flatMap((b) => b.numbers)).toHaveLength(651);
expect(baseline.figures).toHaveLength(90);
expect(new Set(baseline.figures.map((f) => f.sha256)).size).toBe(89);
expect(baseline.figures.find((f) => f.id === 'figure-042').src).toBe(
  baseline.figures.find((f) => f.id === 'figure-043').src,
);
```

- [ ] Implement offline extraction with Python/lxml; read actual saved schemas first. Verify both snapshot hashes against the spec. Use the same numeric tokenization as `crosscheck_exports.py`. Preserve all 21 link occurrences, meaningful styles, ordered-list starts, and source anchors. Copy bytes without reencoding:

```python
original_bytes = original_path.read_bytes()
digest = hashlib.sha256(original_bytes).hexdigest()
destination = asset_root / (digest + original_path.suffix.lower())
if not destination.exists():
    destination.write_bytes(original_bytes)
assert hashlib.sha256(destination.read_bytes()).hexdigest() == digest
```

- [ ] Freeze ASCII kebab-case slugs derived from approved titles; reject duplicates. Keep all 44 page ranges unchanged. Preserve normalized audits with original records, including nested screenshot tables and uncertainty notes.
- [ ] Run importer twice; output hashes must match. Extend asset tests to compare actual file hashes with baseline, and assert figure042/043 retain different source placements. Run tests; commit `chore: preserve guide baseline and original figures`.

### Task 2: Rich-content contracts and omission detection

**Files:** Create `app/content/types.ts`, `app/content/reader.ts`, `scripts/content-integrity.ts`, `tests/content-integrity.test.ts`, `tests/fixtures/guide-contract.ts`.
**Consumes:** Task 1 baseline and shared contracts.
**Produces:** `walkBlocks(blocks: Block[]): Block[]`, `inlineText(parts: Inline[]): string`, `pageText(page: GuidePage, figures: Figure[]): string`, `normalizeSourceUrl(url: string): string | null`, and `validateGuide(input: { baseline: SourceBaseline; pages: GuidePage[]; figures: Figure[]; coverage: CoverageEntry[]; externalDestinations?: Record<string, string> }): string[]`.

- [ ] Define a typed fixture `validGuide` with paragraph `Attack 150 and 5%`, a list starting at 7, a table cell, a figure with screenshot value `32%`, and an empty layout-only block. Baseline and coverage match visible content.
- [ ] Add mutation tests; run `npm test -- tests/content-integrity.test.ts` to observe the absent behavior:

```ts
expect(validateGuide(validGuide)).toEqual([]);
const broken = structuredClone(validGuide);
const paragraph = broken.pages[0].blocks[0];
if (paragraph.kind !== 'paragraph') throw new Error('Fixture shape changed');
paragraph.content = [{ text: 'Attack 150' }];
expect(validateGuide(broken).join(' ')).toMatch(/5%|numeric/);
const missingFigure = structuredClone(validGuide);
missingFigure.figures = [];
expect(validateGuide(missingFigure).join(' ')).toMatch(/figure/);
expect(
  normalizeSourceUrl(
    'https://www.google.com/url?q=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc%26t%3D90&sa=D',
  ),
).toBe('https://www.youtube.com/watch?v=abc&t=90');
expect(normalizeSourceUrl('javascript:alert(1)')).toBeNull();
```

- [ ] Implement recursive traversal for every block variant. Resolve primary ids to actual visible blocks. Compare substantive source text, numeric occurrence multisets, meaningful formatting and links against their destination fragments; normalize whitespace only. Table reorganization retains original text fragments and references. An editorial number or caption must not compensate for a missing source occurrence. Empty/document separators require explicit layout-only reasons; substantive fragments remain visible.
- [ ] Validate figure placements, source/hash/dimension consistency, linked text references, unique anchors, and safe URLs. Validate links against all pages for a complete guide; focused group tests provide `externalDestinations` derived from the frozen taxonomy for source ids outside their subset. Full-guide validation omits this option and must resolve every local destination.
- [ ] Add mutations replacing `Global` with `Asia`, deleting a repeated number, discarding an underline, and leaving a dead local anchor. Exposing raw source text only in hidden metadata does not satisfy validation. Run focused tests/typecheck, then commit `feat: validate guide content against its source`.

### Task 3: Rich-content renderer and contents navigation

**Files:** Create `app/components/rich-content.tsx`, `app/components/article-contents.tsx`, `app/styles/article.css`, `tests/rich-content.test.tsx`; modify `app/root.tsx` to include styles by its existing convention.
**Consumes:** `Block`, `Figure`, `walkBlocks`, `inlineText`.
**Produces:** `RichContent({ blocks, figures, sourceLinks }: { blocks: Block[]; figures: Record<string, Figure>; sourceLinks: Record<string, string> })` and `ArticleContents({ blocks }: { blocks: Block[] })`.

- [ ] Write tests for paragraph text, ordered start 7, emphasis/highlights, nested heading anchors, captioned tables/column headers, visible uncertainty, and literal formulas. Run `npm test -- tests/rich-content.test.tsx`; expect missing component failure.
- [ ] Implement a discriminated-union renderer using React text nodes, never raw exported HTML. Assign stable block ids. Lists use `<ol start>`, tables use `<caption>` and `<th scope="col">` inside labeled scroll containers. Preserve formula grouping with `<pre>`. Use a local `renderInline(parts: Inline[]): React.ReactNode` helper composing allowed emphasis/link elements.

```tsx
case 'formula':
  return <section id={block.id} className="guide-formula">
    <pre>{block.expression}</pre><p>{renderInline(block.explanation)}</p>
  </section>;
case 'note':
  return <aside id={block.id} className={`guide-note guide-note--${block.tone}`}>
    <strong>{block.label}</strong><p>{renderInline(block.content)}</p>
  </aside>;
```

- [ ] Render figure blocks initially as captioned original-image links using supplied figure metadata; Task 4 replaces this with the complete component. Keep this intermediate state functional.
- [ ] Add tests proving literal `<script>` text stays text, unsafe links are not clickable, repeated heading titles receive distinct source-derived ids, and TOC targets match renderer ids. Run tests/typecheck and commit `feat: render structured guide articles`.

### Task 4: Annotated figures and full-size image viewer

**Files:** Create `app/components/guide-figure.tsx`, `app/components/image-viewer.tsx`, `tests/guide-figure.test.tsx`; modify `rich-content.tsx`, `article.css`.
**Consumes:** `Figure` and resolved `sourceLinks`.
**Produces:** `GuideFigure({ figure, sourceLinks }: { figure: Figure; sourceLinks: Record<string, string> })` and `ImageViewer({ figure }: { figure: Figure })`.

- [ ] Write tests using green label 1 and purple label 4, linked explanations, a cropped unresolved value, and a screenshot-only restriction. All must be readable without opening the image. Run focused tests and confirm failure.
- [ ] Render intrinsic image dimensions, lazy loading, caption, textual/color legend, source-section links, screenshot-only facts, and uncertainty notes. Provide an original-file link that works without JavaScript. Figure id belongs to its placement; do not duplicate it inside the viewer.
- [ ] Implement a native `<dialog>` with `showModal()`, close button, original-image link, viewport-bounded scrollable content, Escape/native cancel handling, and focus return. Use narrow jsdom dialog mocks for unit tests; verify the real browser in Task 9.

```ts
const user = userEvent.setup();
const open = screen.getByRole('button', { name: /view full-size/i });
await user.click(open);
expect(screen.getByRole('dialog')).toBeVisible();
// In jsdom dispatch native cancel when keyboard dialog behavior is unavailable.
fireEvent(
  screen.getByRole('dialog'),
  new Event('cancel', { cancelable: true }),
);
expect(open).toHaveFocus();
```

- [ ] Test close-button behavior, direct-original link, labels beyond color alone, and referenced text destinations. Keep modal controls reachable with very tall/wide artwork. Run tests/typecheck and commit `feat: add accessible annotated source figures`.

### Task 5: Source overview and chapters 1–4

**Files:** Create `app/content/source-overview.json`, `app/content/chapters/chapter-01.json` through `chapter-04.json`, `app/content/figures/group-a.json`, `content/coverage/group-a.json`, `tests/guide-group-a.test.ts`.
**Consumes:** blocks 0001–0406, saved `audit-a.md` and `figure-audit-a.json`, baseline/taxonomy/contracts.
**Produces:** 14 articles plus source overview, 25 figures, 71 audited mappings, primary coverage of 406 blocks. Each chapter JSON exports an array of `GuidePage`; source overview exports one `GuidePage`.

- [ ] Write direct-JSON-import group tests using a subset of baseline for integrity. Run before adding content:

```ts
expect(groupFigures).toHaveLength(25);
expect(groupPages.filter((p) => p.category !== null)).toHaveLength(14);
expect(
  groupFigures
    .find((f) => f.id === 'figure-005')!
    .mappings.map((m) => `${m.label} ${m.color} ${m.meaning}`)
    .join(' '),
).toMatch(/Soul Binding/);
expect(
  groupPages
    .find((p) => /Global stat priorities/.test(p.title))!
    .qualifiers.join(' '),
).toMatch(/Global/);
```

- [ ] Migrate overview 0001–0026: attribute first-person claims to Kanon, preserve credits/links, malformed date, update note, Wings exception, and Aion Research Lab attribution.
- [ ] Migrate chapter 1 (0027–0138): all gear labels 1–7, Pantheon highlights/underlines, base/added stat distinctions, screenshot values. Migrate chapter 2 (0139–0229): equipment-specific priorities, Armor check note, rune uncertainty.
- [ ] Migrate chapter 3 (0230–0364): reroll strategy, full Global priorities and raid values. Add visible contextual references to blocks 0248/0250 in Global priorities while their primary placements remain preceding. Keep unknown Muspel and approximate raid requirements. Migrate chapter 4 (0365–0406): active/perk, passive, Stigma details.
- [ ] Convert all 25 figure records with every mapping, screenshot-only fact, and unresolved detail. Each of the 71 mappings must have a visible destination, even if grouped for readability. Add tests for 0248/0250 context links, unknown values, and all source-formatted emphasis.
- [ ] Run group/integrity tests. Reviewer compares source prose, list markers, qualifiers, numbers, and figures against the saved audit. Commit `feat: import source context and guide chapters one through four`.

### Task 6: Chapter 5 enhancement and transfer

**Files:** Create `app/content/chapters/chapter-05.json`, `app/content/figures/group-b.json`, `content/coverage/group-b.json`, `tests/guide-group-b.test.ts`.
**Consumes:** blocks 0407–0510, `audit-b.md`, `figure-audit-b.json`, baseline/contracts.
**Produces:** 6 articles, 28 figures, 106 mappings, 104 covered blocks.

- [ ] Write group integrity tests plus assertions for duplicate artwork placements, transfer direction, and the entire 16-row screenshot combat table. Run before migration:

```ts
expect(groupPages).toHaveLength(6);
expect(groupFigures).toHaveLength(28);
expect(groupFigures.find((f) => f.id === 'figure-042')!.src).toBe(
  groupFigures.find((f) => f.id === 'figure-043')!.src,
);
expect(groupFigures.find((f) => f.id === 'figure-042')!.sourceId).not.toBe(
  groupFigures.find((f) => f.id === 'figure-043')!.sourceId,
);
expect(
  groupFigures.find((f) => f.id === 'figure-039')!.screenshotOnly.join(' '),
).toMatch(/626330|626,330/);
```

- [ ] Migrate Growth/Potential (0407–0431), separating the 25.5% example from general reset rules; retain costs, next-stage values, and failure additions.
- [ ] Migrate Manastones/Theostones (0432–0462), preserving tier probabilities, distinct grade names, restrictions, complete screenshot table, and absent encounter context. Yellow outlines are annotations rather than rarity.
- [ ] Migrate Soul Binding (0463–0482), preserving yellow/purple/green Bind/Sync/Reset frames, both repeated-artwork placements, six gold lines plus purple extra, and unexplained aggregate values. Do not invent an averaging formula.
- [ ] Migrate Transfer (0483–0510), grouping correct input/output pairs and donor direction; keep cyan fragment counts and unresolved owned/required cost displays.
- [ ] Compare all 106 mappings and screenshot-only facts with the saved audit. Run group/integrity tests, obtain content review, and commit `feat: import enhancement and transfer guide`.

### Task 7: Chapters 6–12 and source formula uncertainty

**Files:** Create `app/content/chapters/chapter-06.json` through `chapter-12.json`, `app/content/figures/group-c.json`, `content/coverage/group-c.json`, `tests/guide-group-c.test.ts`.
**Consumes:** blocks 0511–1268, `audit-c.md`, `figure-audit-c.json`, baseline/contracts.
**Produces:** 23 articles, 37 figures, 144 mappings, 758 covered blocks.

- [ ] Write group integrity tests and source-specific regressions; run before adding content:

```ts
expect(groupPages).toHaveLength(23);
expect(groupFigures).toHaveLength(37);
const passives = groupPages.find((p) => p.status === 'source-pending')!;
expect(pageText(passives, groupFigures)).toMatch(/coming soon/i);
const sets = groupPages.find((p) => /Five-card/.test(p.title))!;
expect(pageText(sets, groupFigures)).toMatch(/Parchment/);
expect(
  sets.blocks.some((b) => b.kind === 'note' && b.tone === 'uncertain'),
).toBe(true);
```

- [ ] Migrate Arcana (0511–0631): all stat pools, alternative card rolls, costs/probabilities, restrictions, and eight-card membership disagreement. Do not identify set memberships from unnamed artwork.
- [ ] Migrate Daevanion (0632–0684) and Pet Genus (0685–0780): board/tile priorities, all slots 1–9, Asia/Global differences, example versus recommended rolls, and Smite/Double Chance mapping.
- [ ] Migrate Wings (0781–1009): every catalog entry, owned/equipped and indentation distinctions, dated KR rankings, positional FAQ, and limited scope of source yellow highlighting.
- [ ] Migrate Closet (1010–1025): class restrictions and all visible collection points.
- [ ] Migrate stats/formulas (1026–1265) into the approved eight articles. Preserve every multiplier/condition, literal formula grouping, ambiguous ratio, graph/prose cap disagreement, Power Shard raw/effective values, and unconfirmed Multi-hit placement. Add adjacent source notes rather than correcting the source or adding a calculator.
- [ ] Migrate Class Passives (1266–1268) as source-pending, without invented builds. Validate all 144 mappings and qualifiers. Run group/integrity tests, obtain content review, and commit `feat: import progression catalog and stat reference`.

### Task 8: Integrate routes, chapter navigation, source links, and search

**Files:** Create `app/content/repository.ts`, `app/content/catalogue.json`, `scripts/generate-catalogue.ts`, `app/routes/source.tsx`. Modify `app/content/wiki.ts`, `app/routes.ts`, `app/routes/{home,article,category}.tsx`, `app/components/{site-header,wiki-directory,article-card}.tsx`, `app/styles/wiki.css`, `react-router.config.ts`, `package.json`, `tests/{shell,wiki-directory,content-routes}.test.tsx`.
**Consumes:** complete chapter/source/figure data and taxonomy.
**Produces:** repository exports `pages: GuidePage[]`, `figures: Figure[]`, `getPage(slug: string): GuidePage | undefined`, `sourceLinks: Record<string, string>`; lightweight wiki exports `articles: CatalogueEntry[]`, `categories: Category[]`, `staticPaths: string[]`. Retain existing `Category` slug/title/description shape.

- [ ] Replace sample test expectations with real routes/search: 12 categories, 43 articles, source route, 57 paths, source-pending disclosure, bad-slug recovery, breadcrumbs, TOC, previous/next boundaries. Run to observe failures before integration.
- [ ] Load chapter/source JSON in taxonomy order. Generate catalogue metadata/search text with `pageText`, including figure legends and screenshot-only details. Add `content:generate` (`node scripts/generate-catalogue.ts`) and `content:check` (`node scripts/generate-catalogue.ts --check`) scripts. Check mode recomputes and fails on stale checked-in output without writing it. Use explicit `.ts` imports in Node-run scripts as supported by the existing runtime. Global header and build config import only catalogue; never re-export full repository through wiki.

```ts
export const staticPaths = [
  '/',
  '/source',
  ...categories.map((c) => `/categories/${c.slug}`),
  ...articles.map((a) => `/articles/${a.slug}`),
];
const visibleArticles = articles.filter(
  (article) =>
    (category === 'all' || article.category === category) &&
    article.searchText
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
);
```

- [ ] Map each source block to its primary page/block URL; map original document anchors to these URLs. Resolve cross-page fragments; unwrap external Google links and preserve video query parameters. Record ambiguous source targets, rendering a working original-source link with an explanatory note.
- [ ] Render source/article pages with rich blocks, local source/status qualifiers, attribution, TOC, and previous/next links. Prerender full bodies and figures. Add source route before catchall. Remove sample labels from homepage/cards/directory/meta and replace with accurate source descriptions.
- [ ] Adapt header to a keyboard-accessible chapter control that fits mobile, preserving desktop chapter index and source link. Derive all chapters from catalogue; pad chapter numbers with `String(index + 1).padStart(2, '0')`. Keep existing navy/gold style, focus states, search reset, and empty results.
- [ ] Add tests using a figure-only phrase and body-only stat term, combined with chapter filters. Test timestamps/cross-article fragments and newly added category behavior. Run affected UI tests/typecheck; commit `feat: connect complete guide navigation and search`.

### Task 9: Completeness, static output, and real-browser validation

**Files:** Modify `scripts/verify-static.mjs`, `package.json`; create `tests/guide-completeness.test.ts`, `scripts/verify-guide-browser.mjs`, `docs/source-guide-migration.md`. Store screenshots/results in ignored `.local-tools/qa/guide/`.
**Consumes:** baseline, coverage, full content, and build output.
**Produces:** independently checked preservation evidence, all static routes, browser validation, and source/uncertainty report.

- [ ] Assert 1,268 source coverage entries, 959 substantive blocks, 90 figure placements, 89 original hashes, 651 source numeric occurrences, 21 link occurrences, 321 audited mappings, and 57 routes. Verify all 71 audit uncertainty records have visible destinations or documented equivalent grouping. Counts alone cannot satisfy preservation checks.
- [ ] Add full-data mutation tests; run before strengthening final checks:

```ts
expect(validateGuide(completeGuide)).toEqual([]);
const missing = structuredClone(completeGuide);
missing.figures = missing.figures.filter((f) => f.id !== 'figure-043');
expect(validateGuide(missing).join(' ')).toMatch(/figure-043/);
const lostCoverage = structuredClone(completeGuide);
lostCoverage.coverage = lostCoverage.coverage.filter(
  (c) => c.sourceId !== 'block-0250',
);
expect(validateGuide(lostCoverage).join(' ')).toMatch(/block-0250/);
```

Also mutate a repeated numeric occurrence, regional qualifier, and external link; require each to fail against the independent baseline. Review that no hidden copy of source text can compensate for missing rendered content.

- [ ] Update static verifier to inspect all route headings/status/body content and figure/legend text, verify local assets and internal route/fragment targets, reject sample disclosures/development URLs, and accommodate the legitimately short pending page. Normalize entities/whitespace rather than weakening comparisons when inline markup divides text. Add `verify:content` (`node scripts/content-integrity.ts`) for full-data validation; CLI must exit nonzero on errors.
- [ ] Run required commands after integration:

```bash
npm run content:generate
npm run content:check
npm run verify:content
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run verify:static
```

- [ ] Use Playwright and a compatible browser from WSL against the static preview. Resolve an existing WSL browser-test installation first; if absent, provision a task-scoped test environment and browser before QA. The persistent script accepts the preview URL as its first argument and resolves Playwright from that test environment, without depending on Windows Codex runtime caches or adding a product browser dependency. Capture console/page/network failures and assert interactions, not screenshots alone:

```js
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(baseUrl);
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw new Error('Homepage overflows mobile viewport');
await page
  .getByRole('link', { name: /Gear anatomy/ })
  .first()
  .click();
const open = page.getByRole('button', { name: /view full-size/i }).first();
await open.focus();
await page.keyboard.press('Enter');
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.keyboard.press('Escape');
if (!(await open.evaluate((element) => element === document.activeElement)))
  throw new Error('Viewer did not restore focus');
```

- [ ] Cover 375px/1440px widths, chapter links, long tables/formulas, gear/transfer/Genus/Wings pages, image scroll/close/focus trap, full-text search/filter/reset, direct article refresh, source page, and missing-page recovery. Fail on missing assets, hydration errors, clipped controls, or page overflow. Save representative screenshots and result JSON.
- [ ] Obtain a fresh whole-branch code/content review under the selected Superpowers workflow. Fix concrete findings and rerun affected checks plus final required gates after the last change. Document fingerprints, coverage totals, transformation method, and remaining source ambiguities in `docs/source-guide-migration.md`. Commit `test: verify complete guide migration and static reading flows`.
- [ ] Deliver the local preview and validation evidence, noting unresolved source uncertainties. Do not publish or merge without authorization.

## Plan self-review

- Source baseline, authorship/dates, and approved taxonomy: Tasks 1 and 5–8.
- Rich representation, meaningful formatting, tables, literal formulas: Tasks 2–3 and 5–7.
- Original images, all placements, legends, screenshot facts, source disagreements, accessible viewer: Tasks 1 and 4–7.
- Full-text search, source references, static navigation, responsive layouts: Tasks 8–9.
- Preservation compares actual visible source destinations against an independent baseline, not only metadata counts. Each Review Focus case has an owning test task.
- Content group article counts reconcile: 14 + 6 + 23 = 43; source overview is separate. Figure counts: 25 + 28 + 37 = 90. Mapping counts: 71 + 106 + 144 = 321.
- Shared interfaces and ownership are fixed above. Product implementation waits for review of this written plan.

