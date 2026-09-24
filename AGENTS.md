# Agent guide

- This is a fully static Aion 2 wiki: React, TypeScript, React Router, and Chakra UI. Publish only `build/client`; keep runtime SSR disabled.
- Use Node from `.nvmrc` and npm 12.1.0. On Windows, run npm through WSL; prefer native Linux storage for builds. Never mix Windows and Linux `node_modules`.
- Use Chakra components and shared tokens in `app/components/ui/theme.ts`. Preserve responsive layouts, keyboard access, reduced motion, and readable no-JavaScript content.
- Preserve all imported guide text, numbers, figure mappings, source links, highlights, and regional/uncertainty qualifiers. Do not invent game facts or weaken integrity checks.
- Edit canonical content in `app/content/chapters/` and `app/content/source-overview.json`; run `npm run content:generate` after content changes. Do not hand-edit generated catalogues.
- Run `npm run check` for changes, and `npm run build:static` before delivery of application/build changes. For UI changes, also run `npm run verify:browser:all` after building (install Chromium with `npx playwright install --with-deps chromium`). Documentation-only edits need formatting/link checks.
- Keep changes focused and preserve unrelated work. Do not commit secrets, `.local-tools`, dependencies, or build output.
- Follow `README.md` for development and `docs/deployment.md` for releases. A push to Netlify's connected production branch can deploy the site; push or publish only when requested.
