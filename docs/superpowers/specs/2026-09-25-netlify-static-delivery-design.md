# Static Netlify delivery design

Date: 2026-09-25
Status: Written specification for review. The user approved GitHub plus native Netlify deployment and will connect the Git remote later.

## Intent and scope

Prepare this repository so a clean Linux checkout can validate and build the Aion 2 wiki, pull requests can receive Netlify previews, and merging checked changes to main can publish the static site. Preserve all source content, image associations, Chakra styling, and existing article behavior.

This phase produces repository configuration, portable validation, and a connection/release runbook. It does not create a GitHub repository, set a remote, rename the current branch, connect an account, publish a site, purchase a plan, or change DNS. The user will connect the remote later. No credentials or account identifiers are required for local implementation.

The current worktree includes approved article navigation edits plus unrelated research. Preserve them; stage only deployment-related files in deployment commits. Local delivery can be completed before external setup, but live Netlify routing and provider enforcement cannot be claimed verified until connected.

## Delivery architecture

Use GitHub Actions for full validation and native Netlify Git integration for builds and deploys. Production branch is main once the user creates/connects the remote. Work takes place in short-lived branches with pull requests; native Netlify Deploy Previews provide review URLs. Disable extra branch deployments initially.

On a pull request, GitHub validates source, builds the site, and checks the built artifact in Chromium. Netlify separately performs its own core validation and build before providing a preview. After review and successful required checks, merge to main triggers a fresh Netlify validation/build and production publication. This rebuild is not the same binary artifact as GitHub's build; pinned tools, lockfile installation, committed inputs, and repeated static audits keep the process reproducible.

GitHub and Netlify execute independently. GitHub CI alone does not delay Netlify publication. Require the stable GitHub check `wiki-ci` and Netlify's actual preview check on main before merging, with the branch current against main. Do not require another person's review for a solo-maintainer workflow. Disable force pushes/deletion of main. These are provider settings documented for later setup, not capabilities silently guaranteed by workflow YAML. If the GitHub account cannot enforce checks for the chosen repository visibility, do not describe browser verification as a release gate; the runbook must require an equivalent supported protection setup before enabling production auto publication.

## Static hosting configuration

Keep React Router ssr:false and the existing 57 prerendered routes. Publish only build/client at the domain root. No server adapter, Functions, Edge Functions, database, or runtime fetch of the original Google Doc is introduced.

Add root netlify.toml with:

- Publish directory: build/client.
- Build command: npm ci followed by the shared Netlify validation/build command.
- NPM_VERSION: 12.1.0.
- No production NODE_ENV during installation; devDependencies are required to build and validate.
- Narrowly scoped headers: retain default browser revalidation for HTML, route data, and guide images; immutable one-year browser caching only for the generated content-hashed /assets files after confirming their naming. Add X-Content-Type-Options: nosniff and Referrer-Policy: strict-origin-when-cross-origin globally. Do not introduce an untested CSP that breaks Emotion/Chakra or React Router inline scripts.

Pin Node 24.21.0 in .nvmrc as the initial known-good patch. GitHub reads the same file and explicitly installs npm 12.1.0. Retain package engines. Exact runtime pins are updated through reviewed changes and clean validation; they are not a permanent security-update freeze.

Netlify's default dependency install is npm install. Explicit npm ci in the build command ensures an authoritative lockfile install even though it adds an install pass. Never claim the default install itself is frozen. Check that the lockfile is unchanged after validation.

Known routes must resolve directly and with trailing slashes. Do not add a catch-all HTTP 200 SPA rewrite. Provide a root 404.html with a useful not-found message and real home link even without JavaScript. Generate it at build time using the existing Chakra provider and not-found presentation, without adding another content article or changing the 57-route source coverage contract. Do not copy the home page as a 404. Test both unknown page and missing asset responses; missing paths must remain HTTP 404 on Netlify.

## Validation commands and CI

Introduce shared commands with these responsibilities (final naming can follow repository conventions):

1. Core validation: content:check, verify:content, lint, format:check, typecheck, and unit tests. Use the established bounded-worker Vitest invocation if needed for reliable memory usage. Fail on the first failed command.
2. Static release build: npm run build, preparation of the static 404, and verify:static plus output checks for the new 404. Source baseline and asset fidelity assertions remain intact.
3. Browser validation: start a static preview of build/client, wait for HTTP readiness with a deadline, run guide/editorial/reduced-motion checks, and stop the server in cleanup on success or failure.
4. Netlify gate: core validation followed by static release build. It must fail before publication if either phase fails.

CI checks generated catalogue drift; it must not regenerate and silently repair committed content. A build must not depend on ignored .local-tools research artifacts or data downloads from the source document.

Add a pinned Playwright development dependency and lockfile entry. Existing browser scripts use a shared runtime loader: normal repository Playwright and browser environment by default; explicit GUIDE_BROWSER_ROOT can retain the established WSL runtime as an optional local override. Only the explicit override may introduce its custom browser/library paths. Hosted Linux installs Chromium and OS dependencies through Playwright's --with-deps command. No local WSL paths appear in the GitHub workflow.

Add one GitHub workflow for pull_request, pushes to main, and workflow_dispatch. Use ubuntu-24.04, read-only contents permissions, a stable job name wiki-ci, and a 30-minute timeout. Pin Actions to verified commit SHAs with readable version comments. Cache npm downloads by lockfile, not node_modules. Run npm ci, core validation, static build, Chromium installation, and browser validation. Cancel superseded runs for the same PR/ref. Upload browser failure logs and screenshots with seven-day retention; never upload environment dumps or credentials. Do not use pull_request_target or deployment credentials.

No workflow is scheduled to run repeatedly in this phase. No production upload action or Netlify token is needed because Netlify handles deployment through its Git integration.

## Local and hosted verification

A clean native Linux checkout must complete installation, core validation, build, static verification, and browser checks without the existing ignored tools. Confirm known pages contain source text and styles with JavaScript disabled; verify search, image viewer, source anchors, current-section navigation, responsive reading, and reduced motion through existing coverage. Add focused deployment assertions for 404 output and publish-directory boundaries where existing checks do not cover them.

Use a local static preview for app behavior, and validate Netlify configuration syntax with an appropriate parser or pinned Netlify tooling. The local preview may differ in host routing; do not infer deployed CDN behavior from it.

Provide an explicitly invoked deployed-site smoke command accepting a site/deploy URL. It makes read-only requests and checks the home page, a category, representative articles, trailing-slash behavior, assets, source text, and a random missing path returning 404. Run against the first real Netlify preview when the user connects it. Avoid any automatic scheduled monitor. Document that smoke checks after publication detect a problem but do not prevent the initial publication.

Before declaring a hosted deployment ready, verify the actual publish directory, absence of generated runtime functions, provider checks, expected commit SHA, preview URL, noindex header, and project visibility. Netlify supplies noindex for previews; noindex is not authentication.

## Failure handling and rollback

A failed core/build command aborts Netlify deployment. GitHub browser failures block merging only when the required check is configured and enforced. Retain actionable CI artifacts for investigation. A unavailable browser download or unavailable package registry must fail explicitly, not skip verification.

The runbook describes selecting a retained successful production deploy in Netlify for rollback, pausing auto publishing during incident response if necessary, then reverting/fixing the Git source before resuming. A subsequent Git-triggered production deploy can overwrite the rollback. Do not promise retention forever; Netlify's retention policy and actual account plan apply.

Keep a release record through Git commit SHA, Netlify deploy URL, and provider history. Do not add a database or bespoke release service.

## Later connection runbook

After local implementation is verified:

1. The user creates/selects the GitHub repository and connects its remote. They choose repository visibility. Ensure all intended application and deployment files are committed before the initial push; do not accidentally omit existing UI work.
2. Establish main as the remote production branch without rewriting existing history. No current branch rename is performed by this implementation.
3. Connect the repository through Netlify's GitHub integration; choose main, root base directory, and committed netlify.toml settings. Confirm the site is being treated as static and no runtime adapter is added by auto-detection.
4. Confirm Netlify team, site name, project visibility, and account usage plan. Start on the assigned netlify.app domain; custom DNS is separate later work.
5. Let checks run once, then configure required GitHub and Netlify checks using their actual displayed names. Confirm branch protection eligibility and enforcement before treating automatic production releases as gated.
6. Open a small pull request, inspect its preview, run deployed smoke verification, then merge when checks pass. Confirm the published commit and perform the same HTTP checks on production.
7. Review billing and rollback controls. Batch coherent releases rather than publishing every experimental commit.

Accounts on current credit-based Netlify plans charge credits for production deploys and traffic; previews avoid the production-deploy charge but their traffic is still metered. Confirm the user's actual plan rather than assuming free hosting at arbitrary traffic levels.

## Expected changed files

- netlify.toml and .nvmrc.
- .github/workflows/ci.yml.
- package.json/package-lock.json for shared commands and browser tooling.
- Shared browser-runtime and static preview orchestration scripts, with small updates to existing browser verification entry points.
- Build-time static 404 generation and deployment smoke validation.
- Focused verification for newly introduced behavior.
- README and docs/deployment.md with connection, release, and rollback instructions.

No source JSON, figure annotations, image content, article composition, or current navigation styling is intentionally changed.

## Acceptance criteria

- A clean Linux installation builds a complete static artifact with all existing content/figure fidelity checks passing.
- Runtime versions and browser tooling are reproducible and do not require local machine paths.
- GitHub workflow and Netlify command share validation logic; either propagates failures.
- Existing browser checks run against the built artifact and preserve their current coverage.
- Known routes retain prerendered HTML; a useful standalone 404 artifact exists; no catch-all soft-404 rule exists.
- Only publishable artifacts enter build/client; no runtime server deployment is configured.
- Configuration/runbook is ready for the user to connect Git and Netlify later.
- Completion report separates locally verified repository readiness from external settings and live-host checks that remain pending.

## Research basis

The approved direction and official-source references are collected in [Netlify deployment research](../../research/2026-09-24-netlify-deployment.md): Netlify build/dependency/preview/routing/caching/rollback documentation, React Router static prerendering, GitHub branch protection, and Playwright CI guidance. Account settings and service behavior must be checked again at actual connection time if they change.