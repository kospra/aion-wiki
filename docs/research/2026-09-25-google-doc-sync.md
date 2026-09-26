# Keeping the wiki in sync with the Google Doc

Date: 2026-09-25. Status: research and recommendation. The staged approach (option C) and D9 were approved on 2026-09-25; the importer and text-edit reconciler are specified in [the sync design](../superpowers/specs/2026-09-26-google-doc-sync-design.md) and run as `npm run source:sync`.

## Question

The wiki should follow [Kanon's live guide](https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/edit) as he updates it, including after the Global launch on 5 October 2026. Can the current architecture do that, and if not, what is the smallest sound change?

## How the wiki is built today

1. A one-time capture (`source.html`, `source.docx` in the ignored `.local-tools/source-doc/`) was frozen by an archived Python importer into `content/source/baseline.json`. The baseline holds 1,268 blocks with text, numbers, formatting offsets, links, heading anchors and figure hashes.
2. Agents then built the rendered articles by hand, in `app/content/chapters/*.json`: 1,287 blocks, including list wrappers, 37 groups, 3 notes, 1 table and 5 formulas. Alongside them sit `content/coverage/*.json` (one disposition per source block), `content/source/taxonomy.json` (44 article ranges), `content/source/category-contract.json` (12 chapters) and `app/content/figures/*.json` (90 alt texts, 3 marker keys).
3. `npm run content:generate` derives the catalogue and source references. `content-integrity.ts` proves every source character, number, format, link and figure survives in the articles. `verify-static.mjs` proves the same against the built HTML.

What is worth keeping: independent fidelity proof, committed artifacts, offline builds and content-addressed images.

Why it cannot follow edits:

- Block IDs are positional (`block-0001` to `block-1268`). One new paragraph near the top renumbers everything after it.
- Those IDs key 1,268 coverage entries, 44 article ranges, 941 rendered blocks, the marker keys and the public link fragments such as `/articles/armor#block-0167`.
- The article JSON was assembled once by hand, and the archived importer is marked “Do not run it to … import a newer live guide”.

## Evidence gathered on 2026-09-25

| Check                         | Result                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public export without sign-in | Works. Text export is 63 KB and byte-identical across fetches. HTML export is 45 MB with images embedded. No Last-Modified or ETag headers.                                                                                                                                                                                     |
| Content since capture         | Unchanged. 886 of 899 text blocks match in order; the other 13 differ only in export formatting (soft line breaks, dashes, divider lines).                                                                                                                                                                                      |
| Heading anchors               | 41 of 119 headings carry Google anchors (`h.…`); all 41 are unchanged and in order. 78 headings have none.                                                                                                                                                                                                                      |
| Images                        | 90 of 90 are byte-identical (SHA-256) and in the same order.                                                                                                                                                                                                                                                                    |
| List structure                | Nesting is explicit in the export: 272 lists at levels 0, 1 and 2 (147, 97, 28). A converter can rebuild it deterministically.                                                                                                                                                                                                  |
| Tables                        | The Doc has none. The wiki’s Global Genus table is an editorial restructure of a nested list.                                                                                                                                                                                                                                   |
| Identity under edits          | In a simulated edit (3 inserted paragraphs, 25 edited sentences, 6 deletions, an 8-paragraph new section), content alignment kept all 893 surviving IDs, re-identified 25 of 25 edited paragraphs with no wrong matches, and flagged all 11 new paragraphs as new. Positional numbering would have renumbered about 885 blocks. |

Kanon’s 20 September note says he will update with confirmed Global information and has not yet updated Wings, so edits are likely soon after launch.

## Options

### A. Reconcile into today’s hand-built articles

Revive the importer to capture a new baseline. Keep IDs stable by aligning each new block with the previous snapshot: unchanged and edited paragraphs keep their ID, and new paragraphs get new ones. A reconciler then patches the hand-built article JSON:

- Text edits update the matching leaf.
- New blocks go after their predecessor’s destination in the same article, flagged for review.
- Deletions remove leaves.
- Coverage and ranges follow automatically.

This stays closest to the current model and keeps every hand-built structure. But the reconciler must understand each hand-built shape (list wrappers, groups, table cells), and structural edits still need manual placement. The hand-built JSON keeps drifting from the Doc’s own structure.

### B. Generate articles from the Doc plus a small overlay

A deterministic converter turns each export into the same `GuidePage` blocks the app renders today: paragraphs, headings, nested lists, figures by hash, formatting runs, links, and groups for multi-image paragraphs and “⬅️” pairs. Editorial choices move into one overlay file keyed to things that survive edits:

| Editorial choice                 | Key                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Article boundaries               | Start heading anchor, or heading text                                          |
| Article titles, slugs, summaries | Article boundary                                                               |
| Chapter names and descriptions   | Chapter heading anchor (every “CH n:” heading has one)                         |
| Figure alt text and marker keys  | Image hash, plus the heading text a marker explains                            |
| Omissions                        | Rules (separators, “CH n:” titles, Doc navigation), plus text-keyed exceptions |
| Link fixes                       | Source link target (`#h.…`)                                                    |
| Formula paragraphs, layout hints | Text prefix or heading text                                                    |

The integrity and static checks keep running; they then prove the converter and overlay lost nothing. New overlay checks confirm every key still resolves and every image has alt text.

An update becomes mostly automatic, and the phase 1 rendering rules apply unchanged. The cost is the upfront build and a one-time review of how generated output differs from today’s hand-built JSON. The Genus table either becomes a generated view (D6) or reverts to the source’s nested list.

### C. Build B incrementally (recommended)

1. Port the importer to TypeScript. Add snapshots, identity carry-forward and a change report. This helps under A and B, and on its own already tells you what changed and where.
2. Build the converter and diff its output against today’s article JSON per article. Switch articles over as they reach parity, or accept the differences deliberately.
3. Retire hand-built article JSON once every article is generated.

This follows the existing architecture where it is strong: committed artifacts, independent validators, offline builds and hashed images. It replaces only what blocks sync: positional IDs and hand-assembled articles.

## Recommended design

1. **Snapshots.** `content/source/snapshots/<capture-date>/` holds the normalized blocks with stable IDs, formatting, links, anchors and image hashes. A manifest records fetch time, export hashes and the Doc’s own “Last Updated” line. `content/source/baseline.json` becomes the current snapshot.
2. **Importer.** `npm run source:sync` fetches the HTML export, parses it with the archived importer’s rules plus list levels, and writes a new snapshot. Builds and checks stay offline; only this command touches the network.
3. **Identity.** Align new blocks with the previous snapshot: exact matches in order, then similarity pairing (ratio ≥ 0.6) inside changed windows. Headings also match by anchor and images by hash. New blocks take the next free number, so IDs stay stable but stop being positional.
4. **Converter and overlay.** The converter produces `GuidePage` JSON from the snapshot and `content/overlay.json` (option B). During transition, a reconciler patches text-only edits into hand-built articles (option A).
5. **Stable public anchors.** Headings get text-slug IDs such as `#amp-stats`. Old `#block-…` IDs stay as aliases, so shared links keep working.
6. **Validation.** Keep today’s integrity and static checks against the current snapshot. Add overlay checks: every key resolves, no orphans, alt text for every image hash.
7. **Change report.** For each article, list:
   - added, edited and removed paragraphs, with text diffs;
   - new or removed images needing alt text;
   - overlay keys that no longer resolve;
   - summaries to review because their article changed.
8. **Automation.** `npm run source:check` hashes the text export and compares it with the last snapshot. A scheduled GitHub Action runs it every few hours. On a change it runs `source:sync` on a branch and opens a pull request with the report. Netlify builds a deploy preview, and nothing publishes until you merge. A daily full import also catches formatting-only or image-only edits, which the text hash misses. Opening pull requests from Actions needs the repository setting “Allow GitHub Actions to create and approve pull requests”.

## Edge cases

- **Images added or replaced.** A new hash needs alt text; the check fails until someone writes it. Removed images leave orphan overlay entries, which the report lists.
- **Headings renamed.** A heading without an anchor falls back to alignment, and the report asks for confirmation of any boundary it moved.
- **New chapter.** A new “CH n:” heading produces a proposed chapter and article entries in the report. The overlay then needs a slug, title and description.
- **Large rewrites.** Alignment degrades gracefully into more “new” and “removed” paragraphs, and the report makes them reviewable before merge.
- **Google Docs tabs.** The URL shows the tabs interface (`tab=t.0`), and today’s export covers the whole guide. If Kanon adds tabs, confirm the export still includes them. The importer should fail loudly when expected chapter headings disappear.
- **Links to Doc headings.** The author’s links resolve through heading anchors and keep working.

## Changes to project rules

- Replace “the baseline is frozen” with “the baseline changes only through the importer; each capture keeps its fingerprints and manifest”. This is decision D9 from the research.
- Under B, article JSON becomes generated and is not hand-edited; editorial work goes into the overlay.
- The rest stays: no invented facts, source fidelity, offline builds, and publishing only when requested.

## Sequencing

| Step                                                         | Size            | Delivers                                                                       |
| ------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------ |
| Phase 1 UI rules                                             | medium          | New-player reading before launch. Independent of sync, and already rule-based. |
| Importer port, snapshots, change report                      | small           | Know what changed after each Kanon edit.                                       |
| Identity carry-forward, stable anchors, text-edit reconciler | medium          | Most post-launch edits flow in through a reviewed pull request.                |
| Converter and overlay, switched per article                  | medium to large | Structural edits flow in; hand-built article JSON retires.                     |
| Scheduled Action and pull-request automation                 | small           | Hands-off detection.                                                           |

The first two sync steps are worth doing right after phase 1, so the importer is ready for Kanon’s first post-launch edit.
