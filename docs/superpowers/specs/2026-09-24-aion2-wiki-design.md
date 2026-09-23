# Aion 2 wiki foundation

## Purpose and scope

Initialize a maintainable React application for a beautiful, interactive, statically hosted Aion 2 wiki. The user approved the proposed React, TypeScript, and React Router direction. This first iteration delivers the application foundation and a polished, usable starter experience.

## Architecture

- Use React Router framework mode with Vite and strict TypeScript.
- Disable runtime server rendering and prerender the homepage, category pages, and all local article routes at build time. The production output must run on static hosting without an application server.
- Keep content in typed local data modules with stable slugs, titles, categories, summaries, and article sections. Derive navigation, search, and prerender paths from this source.
- Keep route modules, shared UI components, content, styles, and tests separate, without introducing unused abstractions.
- Use npm and commit a lockfile. Resolve supported stable dependency versions during implementation.

## Starter experience

- A responsive homepage introduces the wiki and provides category navigation and an article directory.
- Category pages filter the local directory; article pages provide readable content and links back to their category.
- Search matches titles and summaries without a backend. Category filters compose with search, and a clear empty state lets visitors reset filters.
- Include a small set of explicitly labeled sample entries to demonstrate the structure. Do not present invented game mechanics or statistics as verified Aion 2 information.
- Unknown routes show a useful not-found screen. Document any host-specific fallback requirement.

## Visual design and accessibility

Use a dark fantasy palette with restrained gold accents, layered surfaces, generous spacing, and strong typography. Use CSS decoration and a cohesive icon treatment; the scaffold does not depend on copyrighted game artwork or remote images.

Support narrow mobile screens and desktop layouts. Provide semantic landmarks, labeled search controls, visible keyboard focus, adequate contrast, and reduced-motion support. Favor readable article content over visual effects.

## Engineering setup

Include ESLint, Prettier, strict type checking, and Vitest with React Testing Library. Provide scripts for development, build, preview, lint, formatting checks, type checking, and tests. Add an appropriate gitignore and a README describing setup, commands, content authoring, static deployment, and sample-content status.

Do not add authentication, a database, a CMS, global state libraries, analytics, or deployment-provider configuration in this initialization.

## Acceptance and verification

1. A fresh dependency installation is reproducible from the lockfile.
2. Lint, formatting checks, type checking, interaction tests, and the production build pass.
3. Tests cover combined search/category filtering and the empty-result recovery behavior.
4. Build output includes prerendered content for every declared article and category route.
5. Browser inspection confirms homepage, article navigation, keyboard operation, and responsive layout at mobile and desktop widths.
6. Document exact run commands and any verification limitation in the handoff.

## Environment notes

The workspace was initially empty and is not yet a Git repository. Node.js 24.19.0 is available; npm was not resolved by the initial PowerShell command. Implementation must locate an available package-manager runtime or resolve its installation before installing dependencies.

## Review

Self-reviewed for scope, internal consistency, concrete acceptance criteria, and unresolved placeholders. The next Superpowers stage is user review of this written spec, followed by a written implementation plan.
