---
name: figma-chakra-workflow
description: Use when reviewing or changing application UI with a Figma-first workflow and the official Chakra UI Figma kit, then implementing it with Chakra UI. Covers shared components, responsive layouts, source fidelity, and design-to-code verification.
---

# Figma-first Chakra UI changes

Treat Figma as the reviewed visual specification, the official Chakra kit as the primitive library, and shared Chakra components and tokens as the implementation. Finish the design change before its dependent code change. Pasting a screenshot of finished code into Figma does not fulfill this workflow.

## Establish scope

Read project instructions, `DESIGN.md`, relevant components, and content constraints. Inspect the live page at desktop and phone sizes. Identify the concrete issue: hierarchy, padding, alignment, wrapping, active state, duplication, or behavior. Preserve unrelated work.

Use the installed `frontend-design` and `frontend-design-premium` skills for review and durable design context. Follow their content-site/product distinction. Load applicable Figma skills before MCP calls: `figma-use`, `figma-generate-library` for components, and `figma-design-to-code` before design-context extraction.

Start from the approved concept and functionality. Do not reproduce the old UI merely because it exists, or redesign the identity to fix one panel. Existing session authorization applies; do not insert another approval ceremony for authorized reversible changes.

## Change Figma first

1. Inspect existing main components, instances, variants, variables, and canonical screens. Verify node IDs and connected libraries rather than assuming old session IDs still apply.
2. Use the connected [official Chakra UI Figma kit v3](https://www.figma.com/community/file/1506648876941130701/chakra-ui-figma-kit-v3). Discover its primitives and semantic tokens before drawing substitutes. Compose application components around official kit instances and retain library links.
3. Change shared main components and propagate instances instead of fixing identical panels independently. Expose useful content properties. Use variants for real states/layout differences, not duplicate screens.
4. Use auto layout, correct hug/fill sizing, consistent inner padding, and wrapping text. Bind available semantic colors, spacing, radii, and typography. Numbering must identify actual chapters, steps, or image markers. Do not infer badge colors from arbitrary content strings.
5. Keep canonical desktop/mobile screens and necessary states. Before removing a duplicate, check its unique content and dependencies. Review hover, active, selected, disabled, focus, and modal states where applicable.
   Organize the application library into foundations, navigation/discovery, reading/media, and supporting states, with clear component names, usage notes, and code ownership. Add a composition map. Verify actual screen-instance links to the intended main components; visual similarity is not proof of reuse. Supporting states can share a compact composition board instead of duplicating entire screens. Preserve their content width or implement proper reflow before narrowing examples.
6. Render the component and its composition at wide and narrow widths. Check long text, clipping, overlap, alignment, and contrast. Return affected node IDs and a reviewable link. Correct the Figma result before dependent code changes.

After MCP failure, inspect the affected canvas before retrying unless the tool explicitly guarantees a safe retry. Do not create another component blindly. If design work is blocked, report the precise limitation and continue independent inspection; do not silently implement an unverified alternative and claim synchronization.

## Implement with Chakra

Get design context for the verified node. Translate generated Tailwind or other output into the project's Chakra version without adding a styling framework. Query Chakra MCP for relevant component examples/API and generated-code review guidance.

Map Figma tokens to the existing theme. Extend shared recipes/components instead of scattering route-specific styles. Preserve semantic HTML, native links, visible focus, accessible names, responsive wrapping, reduced motion, and stable image dimensions. Preserve interaction behavior unless changing it is in scope.

For figure annotations, use this hierarchy:

- Original marker in a compact badge; color/shape locator in secondary text.
- Explanation with clear emphasis.
- Exact screenshot transcription in quieter readable text.
- Separately labeled source links with enough spacing and natural wrapping.

Keep every mapping, value, qualifier, and destination. Typography must not turn uncertain evidence into a confirmed game rule. A description list can use the marker as its term and the explanation/transcription as its definition. If its DOM changes, update integrity-check selectors while retaining every assertion.

Preserve the Aion wiki's existing viewer behavior: the image itself visibly opens a simple modal with a close button, Escape, focus trapping/restoration, and the original image. Only modify that behavior when it is in scope; do not introduce a separate gallery or redundant viewer screen.

## Verify and document

Compare code with Figma at representative desktop and phone widths using long real content. Check overflow, keyboard behavior, destinations, and another relevant use of the shared component. Preserve no-JavaScript reading where supported.

Run project-required checks, build, and browser smoke tests. Use small behavior fixtures when needed; existing integrity validators own game facts. Update `DESIGN.md` with component ownership, Figma links, token mappings, and intentional responsive differences.

Report changes, the Figma link, verification evidence, and limitations. Do not claim synchronization, successful checks, or deployment without evidence. Publishing, pushing, and external asset uploads follow actual user authorization; this skill grants none itself.
