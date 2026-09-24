# Chakra UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Replace every application stylesheet and visible UI surface with neutral Chakra UI components while preserving the complete sourced wiki.

**Architecture:** Keep existing route and content interfaces. Add one shared Chakra provider with prerender-safe Emotion integration, migrate discovery surfaces and the article reader, then remove legacy styles and verify the finished static site. Use the official Chakra MCP for component APIs and examples.

**Tech Stack:** React 19, React Router 8 framework static prerender, TypeScript 6, Chakra UI v3, Emotion, Vite 8, Vitest, Playwright, WSL Node 24.

**Spec:** docs/superpowers/specs/2026-09-24-chakra-ui-migration-design.md

## Global Constraints

- Neutral surfaces, system sans-serif typography, light default; no theme switcher or external font.
- Preserve 57 routes, all content data and original images, IDs, links, annotations, source formatting, and application interactions.
- Source-derived highlight colors remain exact; use Chakra Mark with validated background style and readable foreground.
- No replacement handwritten stylesheet, CSS modules, or utility CSS framework. Document-shell HTML and content line breaks remain semantic exceptions.
- Preserve unrelated edits to the prior source spec, package lock line endings, and favicon. Dependency edits may update the lock semantically.
- Work in C:/code/aion-wiki on codex/aion2-wiki; run Linux tools through WSL at /mnt/c/code/aion-wiki with nvm use 24.
- The user authorized autonomous recommended decisions through completion and previously chose subagent-driven execution. No additional design or plan approval stops.
- MCP is registered as chakra-ui, invoking @chakra-ui/react-mcp@2.1.1 through WSL. Verified tool outputs live in .local-tools/chakra-mcp/. Call tools as needed through the registered tools or the working MCP stdio client probe.py; do not substitute guesses for API checks.
- Each implementer commits only its product/test/documentation files, writes its report in this plan's ignored workspace, and does not spawn agents. Controller performs review.

## Review Focus

1. Initial HTML with JavaScript disabled must show styled content, then hydrate without warnings (Task 1 and Task 4).
2. Portal dialogs must close with Escape, contain keyboard focus, and return focus to the actual opener (Task 3).
3. Multi-column tables, long formulas, and tall original images must scroll locally without mobile page overflow (Task 3 and Task 4).
4. Highlighted source text must retain exact background colors and strong/emphasis/underline semantics, including adjacent links (Task 3 and Task 4).
5. Error/not-found pages and mobile navigation must retain labels, recovery links, and keyboard operation under the provider (Task 1 and Task 2).

## Task 1: Chakra provider and rendering foundation

**Files:** Create app/components/ui/provider.tsx and tests/render.tsx; modify package.json, package-lock.json, app/root.tsx, tests/setup.ts and the render imports in existing TSX tests. Add app/entry.client.tsx or app/entry.server.tsx only if the actual Emotion integration requires them. Add tests/chakra-provider.test.tsx.

**Interfaces:** Export WikiProvider({ children }: { children: React.ReactNode }): React.JSX.Element. Export a Testing Library-compatible render from tests/render.tsx that wraps WikiProvider and re-exports the library's utilities. Preserve all existing component signatures. Later tasks consume these exports.

- [x] Run baseline tests with `npm test -- --pool=vmThreads --maxWorkers=1`; record existing results before installing dependencies.
- [x] Query MCP installation/provider guidance and npm peer dependencies; install compatible exact stable versions of @chakra-ui/react and @emotion/react through WSL npm.
- [x] Add a provider test that renders a Chakra Button through WikiProvider and checks its accessible name and generated style presence. Record the missing-provider-module failure before implementation.

```tsx
render(<Button>Provider ready</Button>);
expect(screen.getByRole('button', { name: 'Provider ready' })).toBeVisible();
```

- [x] Implement the provider with ChakraProvider value={defaultSystem}, using a fixed light class on the document. Use a small createSystem config only where a concrete requirement warrants it. Add provider coverage for normal and error layouts. Retain the legacy stylesheet imports temporarily until Task 4.

```tsx
export function WikiProvider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>;
}
```

- [x] Convert root footer, main container, and generic error UI to Chakra components, with light theme-color metadata. Update all existing TSX test render imports to the shared wrapper; add only necessary actual browser API polyfills.
- [x] Run focused tests, typecheck, and production build. Use Playwright against the production output to verify an actual Chakra-rendered surface with JavaScript disabled and then enabled, checking computed styles and hydration errors. Establish working Emotion SSR behavior before proceeding; follow framework requirements rather than hiding content client-side.
- [x] Self-review and commit the foundation. Report exact commands/results and any remaining known transitional style effects.

## Task 2: Navigation, discovery, and page frames

**Files:** Modify app/components/site-header.tsx, article-card.tsx, wiki-directory.tsx, not-found.tsx, article-contents.tsx; app/routes/home.tsx, category.tsx, article.tsx, source.tsx as necessary; tests/shell.test.tsx, wiki-directory.test.tsx, content-routes.test.tsx.

**Interfaces:** Consume WikiProvider from Task 1 through the root/test wrapper. Preserve every existing component export and data prop. GuidePageView still consumes existing page/content/figure data and renders RichContent unchanged at its boundary.

- [x] Consult MCP examples/props for Card, Collapsible, Field, Breadcrumb and Link. Preserve original route metadata and reader data flow.
- [x] Extend shell tests to activate the chapter toggle and select a destination, asserting expanded state and closure. Keep the 12 chapters, dynamic category test, source link, skip link, and recovery link coverage. Add error surface coverage if not already present.

```tsx
await user.click(screen.getByRole('button', { name: /browse chapters/i }));
expect(
  screen.getByRole('button', { name: /browse chapters/i }),
).toHaveAttribute('aria-expanded', 'true');
```

- [x] Replace the header, home hero and chapter cards, search directory, cards, category/reader frames, TOC, source status/attribution, pagination, and not-found UI with Chakra components. Compose routing links using Chakra Link asChild and React Router Link; use semantic headings and landmarks.

```tsx
<Link asChild><RouterLink to="/source">About the source</RouterLink></Link>
<Field.Root><Field.Label>Search articles</Field.Label><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></Field.Root>
```

- [x] Retain normalization, filtering, reset, aria-pressed and live counts. Keep mobile chapter navigation keyboard accessible and close after navigation. Keep neutral colors, standard typography and responsive spacing; remove bespoke hero ornaments.
- [x] Run shell, directory, and content-route tests plus typecheck. Verify mobile navigation behavior in a browser rather than assuming JSDOM breakpoints match the viewport.
- [x] Self-review and commit. Record any selector changes needed by Task 4 in the report.

## Task 3: Structured content, figures, and accessible image dialog

**Files:** Modify app/components/rich-content.tsx, guide-figure.tsx, image-viewer.tsx; tests/rich-content.test.tsx and guide-figure.test.tsx. Optional shared source-inline helper only if it reduces complexity without changing data contracts.

**Interfaces:** Preserve RichContent({ blocks, figures, sourceLinks }), GuideFigure and ImageViewer public props. Preserve source block and figure IDs exactly. Establish stable data hooks data-guide-content, data-guide-figure, data-guide-legend, data-guide-references, data-guide-screenshot-facts, data-guide-uncertainties, data-guide-group-label, data-guide-table-scroll, data-guide-image-scroll and data-source-highlight for independent audits; these hooks do not style content.

- [x] Query MCP for Dialog, Table, DataList, List, Mark, Strong, and Em APIs/examples relevant to the implementation.
- [x] Replace native dialog mock tests with real Chakra Dialog interaction tests: userEvent opens, Escape and Close dismiss, waitFor focus returns, and Tab/Shift+Tab stay within the dialog. Keep the keyboard-scroll region labeled and focusable. Record failures from the new behavior assertions before implementation.

```tsx
await user.click(screen.getByRole('button', { name: /view full-size/i }));
expect(await screen.findByRole('dialog')).toBeVisible();
await user.keyboard('{Escape}');
await waitFor(() =>
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
);
await waitFor(() => expect(opener).toHaveFocus());
```

- [x] Convert all rich block cases to Chakra typography, semantic lists, Table/ScrollArea, preformatted formula, and non-live informational notes. Keep run grouping, link guards, exact text and source IDs. Use Mark with validated source background, data-source-highlight, and readable text; preserve strong/em/u/mark tags for independent format audits.

```tsx
<Mark bg={validatedHighlight} color="black" data-source-highlight={validatedHighlight}>{content}</Mark>
<Table.ScrollArea tabIndex={0} role="region" aria-label={block.caption} data-guide-table-scroll=""><Table.Root>{children}</Table.Root></Table.ScrollArea>
```

- [x] Migrate original figures, caption, legend, facts, uncertainty notes, and links with Chakra Image/DataList/List/Text. Keep width/height HTML attributes, lazy loading, every original link, and all annotation text.
- [x] Implement Chakra Dialog.Root/Trigger/Portal/Backdrop/Positioner/Content/Title/CloseTrigger and an image scroll region. Prefer library focus handling; keep image intrinsic resolution inside the viewer and prevent page overflow. Closed portals must not remove the primary article figure.
- [x] Run rich-content and figure tests, typecheck and build. Check an actual large image dialog and wide table at mobile width using Playwright. Self-review and commit with selector contract in the report.

## Task 4: Remove CSS and verify the complete static wiki

**Files:** Delete app/styles/theme.css, global.css, wiki.css, article.css; remove their imports from app/root.tsx. Modify scripts/verify-static.mjs, scripts/verify-guide-browser.mjs, README.md, docs/source-guide-migration.md. Adjust tests and migrated components only for integration defects discovered during this task.

**Interfaces:** Consume the data hooks established in Task 3 and accessible component semantics from Task 2. Preserve independent source contract and existing route audits. Do not change content data to satisfy tests.

- [x] Replace validator CSS selectors/native dialog[open] selectors with semantic/data hooks. Keep all source text/style/link/numeric/figure coverage and route counts. Recognize semantic source highlights in static output and compare actual computed background colors in the browser against expected source values.

```js
const dialog = page.getByRole('dialog');
const scroller = dialog.getByRole('region', { name: 'Scroll full-size image' });
const color = await mark.evaluate(
  (element) => getComputedStyle(element).backgroundColor,
);
```

- [x] Delete all four legacy stylesheets and imports. Search app for className, style=, raw visible HTML and CSS imports; replace remaining application presentation with Chakra components/props. Keep intrinsic document markup and source semantic data appropriate to the spec.
- [x] Build and run the static and browser validators. Check every route at existing desktop/mobile widths, all interaction groups, no page overflow, source formatting visibility, initial no-JS style, and zero hydration/console errors. Inspect screenshots of home, category, rich article, wide table, figure and open viewer. Fix actual regressions without weakening checks.
- [x] Run the complete final verification set through WSL: `npm run content:check`, `npm run verify:content`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test -- --pool=vmThreads --maxWorkers=1`, `npm run build`, `npm run verify:static`, `npm run verify:browser -- http://localhost:3000`. Scope unrelated preexisting formatting differences explicitly if needed.
- [x] Document Chakra provider/component conventions and the MCP setup/usage in README. Preserve existing WSL runtime setup. Update migration evidence documentation with final counts and limitations supported by logs.
- [x] Self-review, commit, and report exact test commands, results, screenshot paths, remaining limitations, and final preview URL. Controller then commissions a broad independent review and resolves material findings before final delivery.
