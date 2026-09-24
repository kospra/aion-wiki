# Aion 2 Wiki: visual design research

Date: 2026-09-24. Status: editorial reference direction approved by the user on 2026-09-24; implemented and independently reviewed.

## Intent and evidence

The requested outcome is a minimal, stylish wiki that is comfortable to read. Preserve the existing Chakra implementation, static delivery, 57 routes, source text, original figures, numeric/color annotations, search, and keyboard behavior. This is a visual redesign of existing flows rather than a new application architecture.

Reviewed current home and mobile article screenshots, homepage and reader composition, table of contents, figure annotations, directory controls, and provider. Researched official USWDS, Wikimedia, IBM Carbon, W3C and Chakra guidance. Queried the configured official Chakra MCP get_theme tool successfully; saved response is .local-tools/chakra-mcp/get_theme-.json.

The evidence establishes constraints and useful patterns. It does not prove one aesthetic universally best; the recommendation below is a design judgment for this wiki.

## Current problems

- Desktop homepage spends almost the entire first viewport on a title, CTA and source introduction. Search and actual chapter choices arrive later.
- The desktop header lays out twelve long chapter names with equal emphasis across wrapping lines.
- Mobile articles stack breadcrumb, label, title, summary, boxed source status, attribution and a boxed contents list before body content. Preserve the information while reducing unnecessary container padding and duplication in presentation.
- Article content can occupy a 1,024px frame with no separate prose measure. That same width is useful for images and tables but excessive for many paragraphs.
- Gray cards, badges, notes and controls share similar emphasis. The page needs a clearer distinction between primary content, navigation and supporting provenance.
- The provider uses defaultSystem and components mostly use individual gray color values. There is no deliberate application-wide palette or typography hierarchy yet.

## Research findings and application

1. **Constrain prose deliberately.** USWDS recommends roughly 45-90 characters per line, with 66 a useful long-form target. Use a starting prose width of 65ch and visually check actual lines, since ch measures the zero glyph and does not guarantee a character count. Tables and figures receive a wider frame. [USWDS typography](https://designsystem.digital.gov/components/typography/)

2. **Keep navigation close to the content.** Wikimedia separates content, workspace and page widths, and documents the trade-off between comfortable lines and perceived wasted space. Use a modest contents rail alongside the article at wide desktop sizes, returning it to normal flow on smaller screens. Avoid constraining every content type to a narrow text column. [Wikimedia width research](https://www.mediawiki.org/wiki/Reading/Web/Desktop_Improvements/Features/Limiting_content_width)

3. **Give reading and controls different typography.** Carbon distinguishes compact task-oriented typography from more generous editorial typography. Use larger, relaxed article prose with compact navigation and metadata. This supports scanning without inflating every element. [Carbon typography strategies](https://carbondesignsystem.com/elements/typography/style-strategies/)

4. **Minimal does not mean low contrast.** WCAG AA requires at least 4.5:1 for ordinary text and 3:1 for qualifying large text. Aim higher for primary prose, and keep subdued metadata readable. [W3C contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)

5. **Spacing must tolerate user overrides.** WCAG text-spacing criteria test loss of content under increased line, paragraph, word and letter spacing; they do not mandate those exact default styles. Use flexible height and wrapping rather than clipping. Verify at narrow width and zoom. [W3C text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing), [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

6. **Dense data needs room.** Carbon recommends giving tables enough main-content width and avoiding cramped nested containers. Use strong column headings, subtle row separators, tabular figures where useful, and local horizontal scrolling. Preserve every label and cell; do not adopt truncation advice that would hide source content. [Carbon tables](https://carbondesignsystem.com/components/data-table/usage/)

7. **Centralize Chakra styling.** Define application color roles as semantic tokens, typography as textStyles, and repeated component treatments as recipes or slot recipes. Chakra supplies the mechanisms; we supply a deliberate design. [Chakra semantic tokens](https://chakra-ui.com/docs/theming/semantic-tokens), [text styles](https://chakra-ui.com/docs/styling/text-styles), [recipes](https://chakra-ui.com/docs/theming/recipes)

## Three directions

| Direction                         | Visual language                                                     | Strength                                                          | Trade-off                                                                                                |
| --------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Editorial reference — recommended | Warm white, dark ink, restrained indigo, fine rules, generous prose | Balances long-form comfort, clear lookup and understated identity | Requires careful restraint so supporting information remains easy to find                                |
| Crisp documentation               | Cool white, slate, blue, compact headings and navigation            | Familiar and efficient for repeated stat lookup                   | Can feel like generic software documentation                                                             |
| Subtle fantasy                    | Ivory, dark ink, muted bronze, occasional serif display heading     | Stronger connection to a fantasy game                             | Bronze contrast and decorative typography need care; stronger art direction can compete with screenshots |

Recommendation: editorial reference. The exact color and font choices are aesthetic proposals, not findings that research establishes as objectively superior. Keep system sans-serif for readable mixed prose, formulas, labels and numbers, without a font download.

## Concrete recommended design

### Palette

| Role          | Proposed color | Use                                         |
| ------------- | -------------- | ------------------------------------------- |
| Canvas        | #FAF9F6        | Very lightly warm background                |
| Surface       | #FFFFFF        | Inputs, figure mat, occasional cards        |
| Main ink      | #20242B        | Body and headings                           |
| Secondary ink | #5F6672        | Metadata and captions                       |
| Accent        | #4338CA        | Links, selected controls and keyboard focus |
| Divider       | #E3E1DC        | Nonessential separators                     |

Calculated sRGB contrast against canvas: main ink 14.79:1, secondary ink 5.49:1, accent 7.51:1. White on accent is 7.90:1. These are proposed token-pair calculations, not a whole-app accessibility certification. Decorative dividers are not substitutes for visible control boundaries. Captured source highlights remain exact and outside the application palette.

### Typography and spacing

- Prose: 18px desktop and 17px mobile, about 1.7 line height, left aligned, starting measure 65ch.
- Article title: approximately 40px desktop / 30px mobile, strong but less visually heavy than oversized default display type. Scale down further only when tested at very narrow widths.
- Section headings: clear 28 / 22 / 19px hierarchy with more space before a section than between its heading and content.
- Navigation and controls: 14-16px with generous click targets. Metadata 14px, never faint. Default control target goal 44px; WCAG 2.2 AA minimum is 24px subject to exceptions, not 44px. [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- Use a consistent 4px spacing scale, 6-10px corner radii and almost no shadow. Distinguish groups with spacing and thin dividers; reserve tinted panels for information that benefits from grouping.

### Existing page changes

- Home: compact title/description, then the existing working search/filter directory near the top. Place compact chapter browsing and source introduction below or beside it without duplicating search state.
- Header: compact brand row and calmer chapter navigation, with deliberate spacing and selected-page emphasis. All chapter destinations remain available and mobile behavior remains keyboard accessible.
- Category: compact introduction and readable article entries with clear title, summary and subdued metadata. Reduce repeated box outlines.
- Article: keep provenance and qualifiers visible but compact. Desktop contents rail sits beside the reading area; mobile contents stays in normal flow and does not hide required information. No new scroll-tracking behavior is necessary.
- Prose: narrower text blocks within a wider media frame. Never reduce table type just to force it into the prose width.
- Figures: image, caption and actions read as one group. Annotation labels and explanations align consistently; source values and uncertainty text stay visible. No invented color-to-number mappings or altered screenshots.
- Tables/formulas: restrained header tint, consistent cell padding, clear local scroll affordance and keyboard focus. Source text/order remain exact.
- Image viewer and errors: use the same palette and typography; retain focus management, reduced-motion overrides and static rendering.

### Files and validation

Theme/provider plus existing root, home/category/article frames, header, directory/cards, contents, rich content, figure and viewer styles. No new product dependency or source data change is needed.

Validate representative before/after screenshots for desktop/mobile home, dense article, long title, wide table and viewer. Check all routes for overflow; retain source contract, exact highlights and original image hashes. Check 320px reflow, 200% zoom behavior, text-spacing overrides, focus visibility, reduced motion and no-JavaScript styling. Existing selectors that assert a white canvas must be adapted to the approved canvas token while keeping a real computed-style check. Typecheck, lint, formatting, tests, production build and static verification remain required.

The user approved the editorial reference direction. This research records the design rationale for its implementation.

## Implementation verification

Implemented on 2026-09-24. All 119 tests, typecheck, lint, formatting, source integrity and the 57-route static build passed. The full browser audit passed 114 route/viewport checks, 156 source highlight checks, eight no-JavaScript checks and 16 interaction groups. Final focused checks passed at 320, 375, 768 and 1440 pixels, with text-spacing overrides and 200% text enlargement, plus reduced-motion and viewer focus-return checks. The independent review found no issues. Browser evidence covers Chromium; 200% text enlargement is not a claim of testing every browser's zoom implementation. Original source data and images are unchanged.
