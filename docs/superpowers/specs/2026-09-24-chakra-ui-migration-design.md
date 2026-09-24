# Chakra UI migration design

Date: 2026-09-24
Status: Approved; user authorized recommended decisions and execution through completion

## Intent and scope

Migrate the entire Aion2 wiki interface from handwritten CSS to Chakra UI components, styling props, and typography. The user explicitly chose Chakra's neutral styling and typography. Use a light theme by default, neutral surfaces, a system sans-serif font, clear hierarchy, and restrained borders. Preserve the wiki's content, URLs, navigation, search, and source annotations.

This is an architectural migration of the presentation layer. It does not change the source-document import, catalogue, article structure, image assets, or game information. Do not add a theme switcher, external fonts, new content features, or deployment work.

## Approach

Recommended: an idiomatic Chakra migration using its provider, standard tokens, layout primitives, and semantic components throughout. Convert the existing components in place and keep their current data interfaces. This meets the requested neutral appearance and makes future interface changes use one styling system.

Alternatives considered:

- Mechanically wrap existing HTML in Chakra primitives and copy the existing CSS declarations into style props. This reduces initial layout changes but retains the bespoke visual system and underuses Chakra's components.
- Rebuild the application around a new component abstraction layer. This permits wider restructuring but adds unnecessary scope and risks content or routing regressions.

The selected approach removes all four existing application stylesheets after every consumer has migrated. Do not move their contents wholesale into globalCss. Use standard Chakra tokens and component recipes; introduce small shared styles only for genuinely repeated wiki-specific patterns.

## Visual design

Use white and subtle neutral backgrounds, readable dark text, a constrained reading width, consistent spacing, and Chakra headings and body text. Replace the navy-and-gold celestial hero with a clear heading, introductory text, and chapter cards. Retain the complete chapter list and searchable article directory.

Desktop pages use generous spacing and a readable article column. Mobile layouts stack naturally, offer an accessible collapsible chapter navigation, and keep controls comfortably usable. Tables and full-resolution images scroll within their own containers rather than expanding the page horizontally.

Source-document highlight colors and figure color descriptions are content, not theme decoration. Preserve those exact values and meanings, including textual color labels. Use readable foreground text on the captured highlights. Do not recolor original images or discard formatting to match the neutral theme.

## Foundation and rendering

Add compatible stable Chakra UI v3 and Emotion dependencies, verifying peer compatibility with the existing React 19, React Router 8, TypeScript 6, and Node 24 setup. Preserve the React Router framework configuration and all 57 prerendered routes.

Provide Chakra's system at the document layout level so regular routes, not-found pages, and error boundaries receive the same styling. Keep document metadata, scripts, and router scroll restoration intact. Update the browser theme color to suit the light presentation.

The first implementation checkpoint must prove that a representative route builds, contains visible styled content before JavaScript runs, and hydrates without errors. Follow the actual framework's Emotion integration requirements if additional cache handling is necessary. Do not use ClientOnly around the app or article content to evade rendering issues.

Use semantic HTML where it is necessary for the document shell or content, such as html, head, body, and line breaks. Visible layout and typography use Chakra components or Chakra's semantic element factory. Use Chakra's styling system for application presentation; no replacement handwritten stylesheet, CSS modules, or utility CSS framework.

## Component migration

| Surface                       | Chakra implementation and preserved behavior                                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application shell             | Provider, Container, Flex, Stack, Text, and semantic landmarks; retain skip link, focus target, footer, and error states.                                                                                                                           |
| Header and navigation         | Chakra Link composed with React Router links, Button, and collapsible navigation; preserve active routes, keyboard activation, expanded state, and closing after selection.                                                                         |
| Home and categories           | Heading, Text, Grid, Card, and Badge; preserve chapter order, all links, article summaries, and status labels.                                                                                                                                      |
| Search directory              | Field/Input, Button, Wrap, Cards, and an empty state; retain search normalization, category selection, reset behavior, and live result count.                                                                                                       |
| Article header and navigation | Breadcrumb, Heading, Text, informational components, Link, and layout primitives; preserve attribution, qualifiers, table of contents, previous/next navigation, and all anchor IDs.                                                                |
| Rich article content          | Chakra typography, lists, Table and scroll container, Code or semantic preformatted content, and informational notes; preserve heading levels, nested lists, list starts, source formatting, formulas, grouped recipes, and complete cell contents. |
| Figures                       | Semantic figure/figcaption composed with Chakra Image, DataList, List, Link, and informational components; preserve legends, confidence, screenshot-only facts, uncertainties, and source explanation links.                                        |
| Image viewer                  | Chakra Dialog and Portal with Chakra controls and a focusable image scroll region; preserve Escape dismissal, focus trapping and return, full-resolution scrolling, and direct access to the original image.                                        |

Static informational notes must not become assertive live alerts. Router links must remain actual anchors and must not produce nested anchors. Closed viewer portals must not remove the article's original figures, captions, or legends from static HTML. Keep viewer state local to the existing viewer boundary unless profiling identifies a concrete need to share it.

## Data and accessibility contracts

Keep source content and generated data unchanged. Preserve all 1,268 source blocks, 651 numeric occurrences, 21 source links, 90 image placements, 321 audited mappings, 71 uncertainties, and eight qualifiers established by the existing migration checks.

Retain semantic strong/emphasis/underline/highlight markup, source IDs, link normalization and safety guards, table headers, list numbering, and formula line breaks. Keep image dimensions, descriptive labels, original-image links, and useful lazy loading.

Maintain visible keyboard focus, labeled controls, sensible reading and focus order, keyboard-scrollable wide content, and accessible dialog naming. Validate neutral-theme contrast and captured highlight readability. Do not remove existing behavior checks simply because the rendered component structure changes.

## Verification changes

Add a shared Chakra test render wrapper and only the DOM polyfills required by the real component behavior. Update tests to target accessible roles and labels wherever possible.

The existing static and browser validators rely on CSS classes and native dialog selectors. Replace those coupling points with semantic selectors or stable data attributes. Preserve their independent content, visibility, formatting, link, and image assertions. A data attribute is an identification hook, not evidence that content is actually visible.

In particular, source highlights will be emitted through Emotion styles. The static audit must continue checking their semantic markup and source values, while browser verification checks the actual computed background color and visible text. Keep source style assertions independent of the implementation's data serialization.

Run content generation/integrity checks, type checking, lint, formatting, the full existing test suite, production build, static route verification, and the browser route/interaction audit. Inspect representative home, category, rich article, table, figure, and open-viewer pages at desktop and mobile widths. Verify initial rendering without JavaScript and normal hydrated behavior, including error/not-found surfaces.

## Acceptance criteria

- All visible application UI uses Chakra components and typography, with the approved neutral appearance and light default.
- The four old application stylesheets and their imports are removed; no legacy styling system remains in product code.
- Every existing route and source-content preservation check remains valid.
- Search, category filters, mobile navigation, source anchors, and image-viewer keyboard behavior continue working.
- No page-wide horizontal overflow, hydration errors, missing prerendered styles, or inaccessible replacement controls are introduced.
- Verification selectors are migrated without weakening content fidelity checks.
- Setup and architecture documentation describe the Chakra provider and component conventions.

## Chakra MCP requirement

Before implementation, configure and use the official Chakra MCP server. This was completed with `@chakra-ui/react-mcp@2.1.1`, registered as `chakra-ui` in Codex using the existing WSL Node 24 runtime. A real MCP initialization, tool discovery, and calls for installation guidance, theme tokens, Dialog props/examples, and Table props succeeded. Keep consulting its component APIs during the migration; retain runtime type checking and browser tests as independent verification of the generated implementation.

## Delivery workflow

After written-spec approval, create a concrete implementation plan. Carry forward the user's earlier preference for subagent-driven execution. Establish the provider and rendering foundation before assigning independent surface migrations, then integrate, review, and verify the complete result. Preserve unrelated working-tree changes.

## References

- [Chakra Vite setup](https://chakra-ui.com/docs/get-started/frameworks/vite)
- [Chakra theming](https://chakra-ui.com/docs/theming/overview)
- [Chakra Dialog](https://chakra-ui.com/docs/components/dialog)
- [Chakra Remix integration](https://chakra-ui.com/docs/get-started/frameworks/remix)
