---
version: alpha
name: Aion 2 field guide
description: A dark, source-aware reading reference with numbered chapters and teal navigation.
colors:
  background: '#000000'
  surface: '#111111'
  raised: '#18181B'
  foreground: '#FAFAFA'
  muted: '#A1A1AA'
  primary: '#5EEAD4'
  primary-hover: '#99F6E4'
  primary-subtle: '#032726'
  primary-border: '#286A62'
  border: '#27272A'
  control-border: '#71717A'
typography:
  sans:
    fontFamily: 'Inter Variable, Inter, system-ui, sans-serif'
  mono:
    fontFamily: 'ui-monospace, monospace'
rounded:
  md: '0.375rem'
  lg: '0.5rem'
spacing:
  page-max: '90rem'
  reading-max: '44rem'
  section-gap: '2rem'
  mobile-gutter: '1rem'
omitted:
  - section: components
    reason: Component ownership and states are documented below; runtime Chakra recipes remain canonical.
---

# Aion 2 field guide

## Overview

The user prefers the current app's appearance. Use the running app and its shared Chakra tokens as the reference when reconciling existing Figma drift. The [Figma design](https://www.figma.com/design/M1BKIOXsv2IJvTEbK4Cj1t/aion-wiki) documents desktop Discover `3:10487`, desktop Article `3:10489`, mobile Discover `3:10490`, and mobile Article `3:10491`. Its restrained game-reference identity uses real chapter numbering, original annotated figures and visible source context. This replaces the former warm editorial theme.

This is an English content site for players consulting equipment and progression information on desktop or phone. README.md and the captured content define scope. No Japan-specific product behavior is inferred from the game's origin. Preserve all canonical content, source highlights, figure mappings and regional uncertainty. Figma article excerpts are layout examples, not permission to truncate real articles.

## Colors

Runtime authority is `app/components/ui/theme.ts`: `wiki.canvas`, `surface`, `raised`, `ink`, `muted`, `accent`, `accentHover`, `accentSoft`, `accentBorder`, `border`, `controlBorder`, and `scrollbar` map to the corresponding colors above. The document is dark before hydration. Teal marks navigation and interactions; source highlight colors remain exact content with black foregrounds. Muted copy uses gray/400, not the lower-contrast gray/500.

## Typography

Inter Variable is bundled locally through Fontsource. Semibold headings: Discover 42/56px, articles 36/48px; body 17/18px at 1.65 line height; labels 12–14px. Preserve readable line breaks and use natural wrapping. Prose is capped at 44rem; long formulas and tables scroll within their own regions.

## Layout

The site shell caps at 1440px. Desktop navigation is 256px with 16px padding and a 32px top/start margin matching the main gutter, numbered rows and a full-row active surface. Main gutters are 32px; phone gutters are 16px. Below Chakra `lg`, the header's Chapters link returns to the home chapter list. It is a real anchor and works without JavaScript. Tablet pages use two-column cards. Desktop uses three-column chapter cards and a right contents rail from `xl`; mobile uses chapter rows and inline article contents.

Document scrolling owns the page. The desktop contents rail alone may scroll within its sticky height. Never constrain article height or hide overflowing content to reproduce a Figma frame. Keep media dimensions reserved and use local Inter files to avoid runtime font services.

## Elevation & Depth

Black canvas, charcoal panels and fine borders establish hierarchy. No gradients, decorative statistics or ornamental hero imagery. Image dialogs use Chakra's backdrop and preserve the full image in a keyboard-scrollable viewport.

## Shapes

Chakra md/lg corners and 1px borders; no pill-shaped category filters. Navigation rows have 12px inner padding and a fixed number column. Controls are at least 44px high.

## Components

The [application design-system board](https://www.figma.com/design/M1BKIOXsv2IJvTEbK4Cj1t/aion-wiki?node-id=28-785) organizes foundations, navigation/discovery, reading/evidence, supporting states, and a composition map. Canonical screens use linked application instances; all twelve desktop chapter cards use `27:711`. Supporting states are demonstrated together on the Screens page, without duplicate full-page designs. Follow the [Figma-first Chakra workflow skill](.agents/skills/figma-chakra-workflow/SKILL.md) for subsequent visual changes.

- `SiteHeader`, root `Main`, and `ChapterNavigation` own the shared shell. `ChapterList` serves both the sidebar and phone directory.
- `WikiDirectory` owns local search, chapter filtering, results, empty state, and immediate clear with input focus restoration. Query state remains transient, matching the existing app. Category URLs remain durable browse destinations. All local results are rendered; this small static catalogue needs no pagination or asynchronous loading state.
- `ArticleCard` and `wiki.card` share result/chapter card surfaces. NativeSelect is deliberately platform-owned for category filtering; OS popup geometry is acceptable.
- `GuidePageView`, `ArticleContents`, `RichContent`, and `GuideFigure` retain existing content and source semantics. Contents are generated from actual headings, with full-row active styling.
- `ImageViewer` remains a clickable image, framed by 8px inner padding so the hover border never touches the image, with an expand affordance and a simple modal: full-size original and close button. Chakra owns focus trapping, Escape and focus restoration.
- Article headers show the chapter eyebrow, title, summary and one muted `Source:` byline (original document, plus About the author on articles). No status badges, qualifier lists, source-link notes or provenance boilerplate.
- `GuideFigure` renders the original image inside `ImageViewer` with descriptive alt text and no visible caption. Only figures with numbered or colored markers drawn on the screenshot get a marker key, following [Figma component 24:655](https://www.figma.com/design/M1BKIOXsv2IJvTEbK4Cj1t/aion-wiki?node-id=24-655): Chakra Badge with the marker label, a 12×12px color square from `wiki.annotation.*` (sampled from the screenshot's own marker colors), and the section name in `wiki.annotationTitle`, linked to the section that explains it. The heading each marker links to repeats only its color square beside the heading text (outside the heading element, so source text stays exact); the source list number or heading text already names the marker, so the badge is not repeated. No color names, transcribed values, related-passage lists or caveats. Figure annotations live in the figure's `annotations` field; the full screenshot audit stays in `content/source/figure-audit.json`.
- Groups are invisible containers for anchors; they have no visible label or border. A group of two figures around a source "⬅️" renders as a side-by-side pair (result ⬅️ ingredients) from `md`; below `md` it stacks with the arrow turned upward. Notes are reserved for source-backed callouts.
- Pending content, source overview, errors and 404 use the same tokens and primitives. Do not invent content for empty source chapters.

Enabled controls have hover, active and visible keyboard focus states. Links use native anchors. Disabled controls use Chakra disabled behavior. App UI motion respects reduced motion. Global scrollbar tokens cover all owned scroll regions, with forced-color fallback.

## Verification

The September 25 reconciliation compared the app at 1440px and 390px with the four canonical Figma frames. It corrected header controls, navigation typography, Discover spacing and card descriptions, source status versus uncertainty, the complete article contents list, and responsive figure annotations. Supporting source, empty-search, and pending-status compositions were updated too. Article frames are named **Opening excerpt** and include the first figure and its three mappings; the source composition is also an opening excerpt. They do not represent the full long articles. Browser scrollbar space accounts for the 10px difference between viewport and content width in these Windows captures. Shared page instances remain linked to application components and nested Chakra primitives.

Run `npm run check`, `npm run build`, and `npm run verify:browser`. Compare desktop and phone Discover/article layouts with Figma; also check chapter pages, search success/empty/reset, source, pending content, 404, long tables, keyboard modal use, reduced motion and no-JavaScript reading. Content integrity remains owned by the existing validators.
