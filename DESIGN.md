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
  source-shade: '#F8F9FA'
  warning: '#FBBF24'
  tag-border: '#3F3F46'
typography:
  sans:
    fontFamily: 'Inter Variable, Inter, system-ui, sans-serif'
  mono:
    fontFamily: 'ui-monospace, monospace'
rounded:
  panel: '0.5rem'
  control: '0.375rem'
  inset: '0.25rem'
  swatch: '0.125rem'
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

Code is the design source of truth: the running app, the shared Chakra tokens and recipes in `app/components/ui/theme.ts`, and this document. There is no Figma file to keep in step. The restrained game-reference identity uses real chapter numbering, original annotated figures and visible source context. It replaces the former warm editorial theme.

This is an English content site for players consulting equipment and progression information on desktop or phone. README.md and the captured content define scope. No Japan-specific product behavior is inferred from the game's origin. Preserve all canonical content, source highlights, figure mappings and regional uncertainty. Design mockups are layout examples, not permission to truncate real articles.

## Colors

Runtime authority is `app/components/ui/theme.ts`: `wiki.canvas`, `surface`, `raised`, `ink`, `muted`, `accent`, `accentHover`, `accentSoft`, `accentBorder`, `border`, `controlBorder`, `scrollbar`, `sourceShade`, `warning` and `tagBorder` map to the corresponding colors above. The document is dark before hydration. Teal marks navigation and interactions. Yellow source highlights remain exact content with black foregrounds. The author's near-white `#f8f9fa` note shading renders as a callout (`wiki.callout`): charcoal surface, body text in `wiki.ink`, and a 3px start edge in the exact `wiki.sourceShade`. Warning icons use `wiki.warning`; qualifier tags use `wiki.tagBorder`. Muted copy uses gray/400, not the lower-contrast gray/500.

## Typography

Inter Variable is bundled locally through Fontsource. Semibold headings: Discover 42/56px, articles 36/48px; body 17/18px at 1.65 line height; labels 12–14px. Preserve readable line breaks and use natural wrapping. Prose is capped at 44rem; long formulas and tables scroll within their own regions.

## Layout

The site shell caps at 1440px. Desktop navigation is 256px with 16px padding and a 32px top/start margin matching the main gutter, numbered rows and a full-row active surface. Main gutters are 32px; phone gutters are 16px. Below Chakra `lg`, the header's Chapters link returns to the home chapter list. It is a real anchor and works without JavaScript. Tablet pages use two-column cards. Desktop uses three-column chapter cards and a right contents rail from `xl`; mobile uses chapter rows. The article contents box is hidden when it would list one entry. Below `xl` it is a native `details` disclosure, "On this page · N", closed by default and reset for each article. From `xl` it is the sticky rail. CSS alone shows the list, which sits after the disclosure rather than inside it, so the rail never waits for JavaScript.

Document scrolling owns the page. The desktop contents rail alone may scroll within its sticky height. Never constrain article height or hide overflowing content to match a mockup. Keep media dimensions reserved and use local Inter files to avoid runtime font services.

## Elevation & Depth

Black canvas, charcoal panels and fine borders establish hierarchy. No gradients, decorative statistics or ornamental hero imagery. Image dialogs use Chakra's backdrop and preserve the full image in a keyboard-scrollable viewport.

## Shapes

Corners come only from the semantic `wiki.*` radii in `theme.ts`, never raw values. `wiki.panel` (8px) frames every bordered surface: both desktop rails, cards, tables, formulas, image frames, dialogs, and empty/error/pending states; use the `wiki.panel` layer style for surface + border + radius. `wiki.control` (6px) covers buttons, inputs, links styled as controls, and navigation/contents rows inside panels. `wiki.inset` (4px) is for content nested inside a frame and source callouts; `wiki.swatch` (2px) is for annotation color squares. 1px borders; no pill shapes. Navigation rows have 12px inner padding and a fixed number column. Controls are at least 44px high.

## Components

Components live in `app/components/` and routes in `app/routes/`. Change a shared component, recipe, layer style or text style rather than restyling one page, and record new component ownership here.

- `SiteHeader`, root `Main`, and `ChapterNavigation` own the shared shell. `ChapterList` serves both the sidebar and phone directory; in the sidebar it also lists the current chapter's articles under the active row.
- `WikiDirectory` owns the home page's local search, chapter filtering, results, empty state, and immediate clear with input focus restoration. Query state remains transient, matching the existing app. Chapter pages are overviews: the chapter's articles in order with their summaries, then previous/next chapter links. They have no search. Home search folds the guide's spelling variants, such as Erroded and Eroded. All local results are rendered; this small static catalogue needs no pagination or asynchronous loading state.
- `ArticleCard` and `wiki.card` share search-result and home chapter card surfaces. Cards show chapter, title and summary; pending articles say Not written yet. NativeSelect is deliberately platform-owned for category filtering; OS popup geometry is acceptable.
- `GuidePageView`, `ArticleContents`, `RichContent`, and `GuideFigure` retain existing content and source semantics. Contents list actual headings and value lines, with full-row active styling.
- `RichContent` applies the content rules in `app/content/rules.ts`. Fully shaded notes become `Callout`s whose icon follows the author's lead-in (IMPORTANT, TLDR, BEGINNER NOTE, QUICK FAQ, Additional Notes). Three or more short sections of the same shape become a `CardGrid` of `GridCard`s. Two or more one-item bulleted label lists become label cards, or columns inside a card; section grids whose cards hold columns use wider cards so two columns fit. Section grids form columns from `md` with equal card widths; label cards and in-card columns form columns from `sm` and stretch to fill their row. A section with deeper subheadings, and a numbered list, keep their normal flow. Whole-paragraph "1% X = Y%" lines become `ValueLine` headers. The qualifier phrases the phase 1 spec lists (such as "(not confirmed for Global)" and "(KR as of …)") and the author's to-do notes become `InlineTag`s; other asides that mention a region stay plain. Rules key on content, never on block IDs, so they re-apply after a Google Doc import, and layouts never reorder blocks.
- `ImageViewer` remains a clickable image, framed by 8px inner padding so the hover border never touches the image. The hover frame and zoom-in cursor are the only affordance; there is no expand icon and a simple modal: full-size original and close button. Chakra owns focus trapping, Escape and focus restoration. Figures of 64px or less on both sides render as plain images without the viewer.
- Article headers show the chapter eyebrow, title, summary and one muted `Source:` byline (original document, plus About the author on articles). No status badges, qualifier lists, source-link notes or provenance boilerplate.
- Articles show the author's TLDR first: `orderTldrFirst` moves TLDR paragraphs, and any heading naming TLDR with its section, directly under the header. The static verifier expects that order. Previous/next links name the chapter when they cross into another one.
- `GuideFigure` renders the original image inside `ImageViewer` with descriptive alt text and no visible caption. Only figures with numbered or colored markers drawn on the screenshot get a marker key: Chakra Badge with the marker label, a 12×12px color square from `wiki.annotation.*` (sampled from the screenshot's own marker colors), and the section name in `wiki.annotationTitle`, linked to the section that explains it. The heading each marker links to repeats only its color square beside the heading text (outside the heading element, so source text stays exact); the source list number or heading text already names the marker, so the badge is not repeated. No color names, transcribed values, related-passage lists or caveats. Figure annotations live in the figure's `annotations` field; the full screenshot audit stays in `content/source/figure-audit.json`.
- Groups are invisible containers for anchors; they have no visible label or border. A group of two figures around a source "⬅️" renders as a side-by-side pair (result ⬅️ ingredients) from `md`; below `md` it stacks with the arrow turned upward. Notes are reserved for source-backed callouts.
- Pending content, source overview, errors and 404 use the same tokens and primitives. Do not invent content for empty source chapters.
- The site icon `public/favicon.svg` is a teal (`wiki.accent`) Daeva wing pair around the broken Tower of Eternity on a black rounded square, kept inside the central circle so round crops (Google Search, Android) never clip it. `siteIcons` in `app/seo.ts` lists the head links: `favicon.ico` (16/32/48px, what Google Search shows beside results), the SVG, the 180px `apple-touch-icon.png` and the generated `site.webmanifest` with 192/512px icons in `public/images/`. Rerender the rasters with `node scripts/render-icons.mjs` (needs Playwright Chromium) whenever the SVG changes, then rerender the share card; builds never run it.
- The share card `public/images/share-card.png` is the 1200×630 link preview (`og:image`) for every page; `app/seo.ts` points to it. On the black canvas it repeats existing copy: the site icon at 72px beside the "AION 2 / WIKI" wordmark, the teal "THE AION 2 COMMUNITY WIKI" eyebrow, "Aion 2, explained.", "Equipment, progression and combat." in muted gray, and the domain from `siteOrigin` in teal, in Inter Variable with 80px margins. Rerender it with `node scripts/render-share-card.mjs` (needs Playwright Chromium) when that copy, the palette or the domain changes; builds never run it.

Lists styled without markers carry `role="list"` so Safari and VoiceOver keep announcing them as lists. Enabled controls have hover, active and visible keyboard focus states. Links use native anchors. Disabled controls use Chakra disabled behavior. App UI motion respects reduced motion. Global scrollbar tokens cover all owned scroll regions, with forced-color fallback.

## Verification

Run `npm run check`, `npm run build`, and `npm run verify:browser`. Review the built app at 1440px and 390px: Discover, a chapter page, a long article with figures and tables, search success/empty/reset, source, pending content, 404, keyboard modal use, reduced motion and no-JavaScript reading. Content integrity remains owned by the existing validators.
