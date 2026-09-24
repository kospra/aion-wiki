# Netlify static deployment research

Date: 2026-09-24
Status: Proposed architecture, not an approved implementation spec. Git host question pending; GitHub is the recommended assumption. No repository, Netlify project, or public deployment created.

## Project findings

- React Router config already uses ssr:false with staticPaths. The existing build emits 57 known HTML routes and client assets in build/client.
- Current local artifact is approximately 47 MiB, with public/images approximately 33 MiB. These are disk totals, not page-transfer estimates.
- No Git remote, provider configuration, or GitHub workflows exist. Current branch is codex/aion2-wiki. Existing UI edits and content research remain in the working tree.
- Node constraint is >=24.15 <25 and npm >=12.1 <13; local known-good versions are 24.21.0 and 12.1.0.
- Content, figure audits, baseline, coverage, and local images are committed inputs. Builds need no Google Doc access or runtime data service.
- Browser verification currently imports Playwright from ignored .local-tools/wsl-browser and sets local browser/library paths. A clean CI checkout cannot reproduce that setup without explicit provisioning or a portable import path.
- Existing checks cover generated catalogue drift, source integrity, lint, formatting, types, unit tests, static DOM/source fidelity, 57 routes at two viewport widths, no-JavaScript content, source colors, keyboard interactions, and reduced motion.

## Recommended architecture

Use native Netlify Git continuous deployment plus GitHub Actions validation. Keep the site entirely static. Publish only build/client; do not add the Netlify React Router runtime adapter, Functions, database, container infrastructure, or a second staging application. React Router explicitly supports prerendering with ssr:false onto static servers. [React Router prerendering](https://reactrouter.com/how-to/pre-rendering)

Short-lived feature branch -> pull request -> GitHub validation and Netlify Deploy Preview -> review -> merge to protected main -> Netlify validates/builds/publishes production -> deployment verification. Main is a proposed production branch name, not an instruction to rename or push the current branch yet.

Netlify's Git integration builds repository pushes and provides PR preview URLs. netlify.toml makes build command and publish directory reviewable in Git. [Build settings](https://docs.netlify.com/build/configure-builds/overview/) and [Deploy Previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/)

Important: Netlify builds and GitHub checks run independently. Netlify does not implicitly wait for a GitHub Actions workflow. Required checks on the production branch gate the merge; Netlify must also execute core validation before publishing each production commit. Branch protection availability depends on repository visibility and GitHub plan: public repositories support it on Free, private repositories require an eligible paid plan. Do not claim production is protected until the setting is verified. [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

## Alternatives and tradeoffs

| Approach                                                          | Benefit                                                                                               | Cost / limitation                                                                                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Native Netlify Git + GitHub CI (recommended)                      | Native PR previews, Git-linked deployments, familiar rollback; no Netlify deployment token in Actions | Separate builds; branch protection and Netlify's own checks must be explicitly configured                                                 |
| GitHub Actions builds and deploys an artifact through Netlify CLI | Can deploy exactly the artifact tested in CI; explicit release gates                                  | Requires deployment credentials and custom preview lifecycle/concurrency handling; disable native Git builds to avoid competing pipelines |
| Manual CLI upload                                                 | Useful for a one-off test or emergency                                                                | Local-state dependence and no enforced PR validation; unsuitable as the normal release workflow                                           |

CLI documentation currently lists --no-build, while a Netlify knowledge-base article says manual CLI deploys do not build. Avoid relying on that conflicting shorthand: pin the CLI if selected and explicitly define/test build behavior. Native Git integration avoids this ambiguity. [CLI deploy reference](https://cli.netlify.com/commands/deploy/)

## Reproducible build and validation

Pin a tested Node patch in .nvmrc and npm through Netlify NPM_VERSION and CI installation. Start with existing known-good versions, confirm availability on a clean hosted Linux build, then update through reviewed dependency PRs. Commit the lockfile and require npm ci for authoritative validation. Netlify documents npm install as its default dependency phase, so explicitly run npm ci at the start of the build command; account for the extra install rather than falsely describing the default as frozen. Do not set NODE_ENV=production before installation: the build and checks need devDependencies. [Netlify dependency configuration](https://docs.netlify.com/build/configure-builds/manage-dependencies/)

Define reusable repository commands for core validation and build validation:

- Core: content:check, verify:content, lint, format:check, typecheck, unit tests.
- Build: production build, then verify:static.
- Browser: serve the resulting static artifact, wait for readiness, run existing full guide/editorial/reduced-motion checks, stop server in cleanup; retain useful failure screenshots/logs with bounded retention.

GitHub CI should run the full sequence on PRs and main, with stable check names, timeouts, cancellation of superseded PR jobs, read-only repository permissions, and npm download caching keyed by lockfile. Do not regenerate catalogue content in CI; fail if committed generated output is stale. Pin third-party Actions to verified commit SHAs when implementing.

Netlify should run npm ci and the core/build gate before allowing a deploy to succeed. Full browser validation runs as a required GitHub merge check. If branch protection is unavailable, choose an explicit gated artifact-deployment workflow or include browser validation in Netlify's publish gate before claiming equivalent protection.

Make browser tooling reproducible with a pinned development dependency and ordinary installed Chromium on hosted Linux; retain the WSL override only for local convenience. Playwright documents installing browser dependencies with its --with-deps option in CI. [Playwright CI](https://playwright.dev/docs/ci)

## Routing, caching, and deployment acceptance

Serve known prerendered routes and their directory indexes directly. All article routes must work on a fresh request, refresh, and client navigation. Publish a proper 404.html for missing URLs; Netlify recognizes it automatically and returns a real 404. Prefer a useful static not-found document that works without JavaScript, rather than a catch-all HTTP 200 rewrite. Test missing asset URLs too. [Netlify redirect and 404 handling](https://docs.netlify.com/manage/routing/redirects/redirect-options/)

Use Netlify's default revalidation behavior for HTML and unhashed content. Long-lived browser caching is appropriate only for demonstrably content-hashed build assets; do not mark all guide images immutable just because they are static. Netlify's CDN invalidates changed static content on deploy, but browser caching is a separate layer. [Netlify caching](https://docs.netlify.com/build/caching/caching-overview/)

Keep only publishable output in build/client, including needed React Router navigation data. Verify there are no runtime functions and no accidentally published source baselines, QA captures, credentials, or tooling directories. Preview requests already receive Netlify's noindex header; noindex is not access control. Confirm project visibility explicitly during site setup. [Deploy overview](https://docs.netlify.com/deploy/deploy-overview/)

The first real Netlify preview must pass HTTP-level checks: known paths and trailing slashes, image loading, JS-disabled article content, search, anchors, image viewer, 404 status, and appropriate headers. A localhost test proves app behavior, not actual CDN routing. Record commit SHA and deploy URL to connect a release with tested source. Optional deployment-triggered smoke verification should check the exact deploy URL and expected SHA without rebuilding or publishing again; it is post-deploy detection, not a pre-publication gate.

## Rollback and cost

Document how to republish a retained successful production deploy, pause auto publishing during an incident if necessary, then revert/fix the source before resuming. New Git-triggered production deploys can overwrite a rollback. Rollback is limited to retained deployments; the documentation lists default automatic deletion after 30 days, or 90 days on paid plans, with exceptions for active/latest successful deploys. [Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)

For current credit-based accounts, published production deploys cost 15 credits, preview/branch deploy creation costs zero, and rolling back to a previous production deploy consumes no credits. Traffic still consumes bandwidth/request credits, including preview traffic. The currently listed Free plan includes 300 credits; 20 production deploys would consume that allowance before traffic. Use feature previews and release coherent changes; do not promise that this image-heavy wiki is free at arbitrary traffic levels. Existing legacy accounts may have different billing. Confirm the actual account plan before provisioning paid features. [How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/) and [Pricing](https://www.netlify.com/pricing/)

## Proposed implementation scope after design agreement

- netlify.toml: publish directory, pinned npm, checked build command, narrowly scoped headers.
- .nvmrc and reproducible CI tool versions.
- Repository validation scripts and portable browser tooling.
- GitHub Actions validation workflow and failure artifacts.
- Static 404 preparation and deployment-specific verification.
- README / deployment runbook: connect Git, select production branch, verify required checks, confirm visibility, preview/release/rollback.
- Document which settings live in provider accounts and cannot be enforced by committed files alone.

Deferred external details: Git host confirmation, repository owner/name and visibility, Netlify team/site, eligibility for branch protection, initial netlify.app name, and optional custom domain. Never invent account/repository identifiers. Start with a Netlify subdomain; domain and DNS changes can be a later explicit step. No external publication has occurred in this research phase.
