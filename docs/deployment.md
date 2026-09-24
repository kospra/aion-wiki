# Deployment and release runbook

The repository is prepared for a static Netlify site, but local configuration does not create a GitHub remote, connect Netlify, or publish anything. The intended production branch is `main`; this preparation does not rename the current branch. Publish only `build/client` at the domain root. No application secrets, server adapter, Functions, or runtime source-document fetch are needed.

## Validate a clean checkout

Use Node 24.21.0 from `.nvmrc` and npm 12.1.0. On a clean Linux checkout, run:

```bash
npm ci
npm run build:netlify
npx playwright install --with-deps chromium
npm run verify:browser:all
```

`build:netlify` runs the source/content, lint, format, type, and unit checks, then builds and audits the static artifact and its 404 page. The browser command serves that artifact locally and checks the guide, editorial behavior, and reduced motion. Native Netlify builds run `npm ci && npm run build:netlify` through `netlify.toml`; they do not wait for GitHub Actions. GitHub's `wiki-ci` job separately validates each pull request and builds/tests its own artifact. Both jobs must complete successfully before a protected merge, once provider checks are configured.

The local HTTP fixture tests prove that the smoke checker rejects soft 404s, missing images, wrong article content, mismatched content types, and stalled responses. They do not prove Netlify's live routing, headers, visibility, or actual build compatibility.

## Connect GitHub and Netlify

1. Create or select the GitHub repository, choose its visibility, and add its remote. Review the pending source/UI edits and ensure every intended application and deployment file is committed before the initial push. Do not accidentally omit the approved navigation changes. Push without rewriting existing history.
2. Establish `main` as the remote production branch. Keep day-to-day work in short-lived branches and pull requests. Confirm the remote's default branch before connecting Netlify.
3. In Netlify, import the GitHub repository through Git integration. **An initial import can trigger a deploy:** verify the GitHub repository's and intended Netlify site's visibility before importing. Select `main`, the repository root as the base directory, and the committed `netlify.toml` settings. Confirm the publish directory is `build/client` and that auto-detection has not added Functions, Edge Functions, or a runtime adapter. Leave extra branch deployments disabled initially; enable Deploy Previews for pull requests.
4. Confirm the Netlify team, site name, project visibility, and actual account usage plan. Begin with the assigned `netlify.app` domain. Custom DNS is separate later work. Check the plan's production deploy, preview traffic, bandwidth, and retention charges or limits before enabling regular publication. A preview's `noindex` signal discourages search indexing; it is **not access control**. Use provider access controls if private review is required.
5. Let GitHub and Netlify checks run at least once. Then select the **actual displayed check names** in GitHub branch protection or a ruleset: the stable GitHub `wiki-ci` check and the Netlify preview/deploy check. Require the branch to be current with `main`; prevent force pushes and deletion. A solo maintainer need not require another person's review. Required-check eligibility and enforcement depend on GitHub repository visibility and plan. If the selected visibility/plan cannot enforce both checks, arrange an equivalent supported protection setup **before** enabling production auto publication. Workflow YAML alone cannot enforce a release gate. In particular, a GitHub browser failure does not delay an independent native Netlify build unless merge protection enforces that check.
6. Open a small pull request. Confirm both provider checks, inspect the Netlify preview URL and expected commit SHA, and check its `noindex` response header and project visibility. Run the live smoke command against that preview:

   ```bash
   npm run verify:deployment -- https://YOUR-DEPLOY-URL.netlify.app
   ```

   The URL is an operator-supplied example, never a configured production target. The command makes read-only HTTP requests for known pages, trailing-slash forms, a referenced image, and random nonexistent page/asset paths. It requires genuine HTTP 404 responses and a useful not-found page. Resolve any preview issue before merging.

7. Merge only after enforced checks pass. Confirm Netlify's production deploy is built from the expected merge commit, with `build/client` published and no generated runtime functions. Run the same smoke command against the assigned production URL, review direct route refreshes and response headers, and record the Git commit SHA and Netlify deploy URL together. Smoke checks after publication detect problems; they cannot prevent the initial publication. Inspect Netlify's deployment and billing history after the first release. Batch coherent releases instead of publishing every experimental commit.

## Failure and rollback

A failing `build:netlify` command aborts Netlify's build. A failing GitHub browser check blocks merging only if the required check is configured and enforced. GitHub uploads available browser QA results and screenshots as failure artifacts with seven-day retention; workflow console logs follow separate GitHub retention settings. Investigate the failed command or preview before retrying; a missing package registry or browser download should fail visibly.

For a production incident, select a retained, previously successful production deploy in Netlify's deploy history and publish it as the rollback. If needed, pause automatic publishing while investigating so a new Git-triggered deploy does not overwrite the rollback. Netlify's retention and rollback controls depend on the actual plan; do not assume old deploys remain forever. Revert or fix the Git source, validate through a pull request, then resume publishing and confirm the next production commit and smoke results. Keep the Git SHA, deploy URL, and provider history as the release record.
