# Google Doc sync: importer and text-edit reconciler

Date: 2026-09-26. Status: design approved in conversation; this written spec awaits review.
Research: [Keeping the wiki in sync with the Google Doc](../../research/2026-09-25-google-doc-sync.md).

## Goal

When Kanon edits [the guide](https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/edit), one command does four things:

- pulls the Doc;
- records a new source snapshot with stable block IDs;
- applies ordinary text edits to the articles;
- writes a report of everything that still needs a person.

Nothing publishes until someone reviews the diff, commits and pushes.

## Decisions

| Decision           | Choice                                                                                            | When       |
| ------------------ | ------------------------------------------------------------------------------------------------- | ---------- |
| Overall approach   | Option C from the research: build the generator in stages. This spec covers its first two stages. | 2026-09-25 |
| Baseline rule (D9) | The baseline changes only through the importer, and each capture keeps its fingerprints.          | 2026-09-25 |
| Scope              | Detect changes, apply text edits to today's hand-built articles, and flag structural changes.     | 2026-09-26 |
| Trigger            | A manual command. No scheduled job.                                                               | 2026-09-26 |
| Shape              | One command does everything, and `git diff` plus the report is the review step (approach A).      | 2026-09-26 |

## What the investigation found (2026-09-26)

| Check                    | Result                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live Doc since capture   | Unchanged. All 1,268 blocks match the baseline in order, with the same tags, anchors and text. All 90 images match by SHA-256, and every link points to the same target.                                                                              |
| Export delivery          | `export?format=html` returns 33.9 MB of gzip data with no content type, which Node's `fetch` leaves compressed. Decompressed, it is the same 45 MB HTML page with embedded PNG images. The download took about 28 seconds.                            |
| Porting the capture      | `jsdom` with the capture's rules reproduces all 1,268 blocks, anchors, links and image hashes from the frozen `source.html`. Parsing takes about 0.1 seconds once the embedded images are replaced with placeholders.                                 |
| Redirect links           | Google's redirect links carry `ust` and `usg` parameters that change with every export. All 5 such links differ in their raw form, and none differs in target.                                                                                        |
| List levels              | Each list level is part of a class on the `ul` or `ol` element, `lst-kix_<list>-<level>`. There are 272 lists: 147 at level 0, 97 at level 1 and 28 at level 2.                                                                                       |
| Line breaks              | The capture dropped `<br>`, which glued words together in 5 blocks (0434, 1021, 1065, 1079 and 1112). The site shows those words glued today, for example "101 total damageAt 2% Double Chance".                                                      |
| How articles use sources | Of 941 rendered source blocks, 865 are carried by exactly one paragraph or heading leaf that has no other source. That includes 35 cells of the Genus table. 60 blocks are figures only, and 16 are formulas, notes or headings grouped with figures. |
| Positional ID use        | `app/content/repository.ts` treats block IDs as numbers to find a block's article and its nearest visible neighbour. `tests/source-baseline.test.ts` pins the capture's counts and digests. Nothing else depends on IDs following position.           |

## Commands

| Command                                     | Effect                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run source:sync`                       | Fetches, parses, matches, applies changes, writes the report and runs `content:generate`.                               |
| `npm run source:check`                      | Runs the same steps with `--dry-run`. It prints the report summary and writes nothing.                                  |
| `node scripts/source-sync.ts --from <file>` | Uses a saved export instead of fetching. The file may be gzip or HTML. This makes runs repeatable offline and in tests. |
| `--force`                                   | Continues past the churn guard (see Failure handling).                                                                  |
| `--allow-dirty`                             | Runs even when content files have uncommitted changes.                                                                  |

Only the fetch touches the network. Builds, checks and tests stay offline. The command runs with native Node on Windows, so no Python is needed.

A typical update:

```sh
git switch -c content/doc-sync-2026-10-07
npm run source:sync
# Read content/source/changes/2026-10-07.md and resolve "Needs attention".
npm run check && npm run build
```

## Data flow

1. **Fetch.** Download `https://docs.google.com/document/d/<id>/export?format=html`. Detect gzip by its first bytes (`1f 8b`) and decompress it. Save the raw download as `.local-tools/source-doc/captures/<timestamp>.html.gz`; that folder is ignored and serves as provenance only. `--dry-run` doesn't save it.
2. **Parse** the HTML into snapshot blocks and images, following the rules below.
3. **Match** the parsed blocks to the current snapshot, `content/source/baseline.json`. Unchanged and edited blocks keep their IDs, and new blocks get new ones.
4. **Reconcile.** Apply the matches to articles, coverage, figures and taxonomy, and collect the flags.
5. **Write**, only after every step has succeeded in memory:
   - new images;
   - article, coverage, figure and taxonomy files;
   - the report;
   - `baseline.json` and `captures.json`, last;
   - then `content:generate`.

   A run that was interrupted can simply be run again. It produces the same result, because edits and removals are idempotent and inserts skip IDs that already exist.

## Parse rules

These rules port the capture's `inspect_source.py`, `audit_formatting.py` and `import-guide.py` to TypeScript. They are exact, so that parsing the frozen capture reproduces the baseline.

- **Blocks.** Every `p`, `li`, `h1` to `h6` and `table` element in the body, in document order, skipping any element nested inside another of these.
- **Text.** The element's text content. Each run of whitespace becomes one space, and the text is trimmed. Whitespace means Python's `str.split()` set: tab to carriage return, U+001C to U+0020, U+0085, U+00A0, U+1680, U+2000 to U+200A, U+2028, U+2029, U+202F, U+205F and U+3000. One rule is new: a whitespace run that contains a `<br>` becomes a newline instead of a space. The validator already treats a newline as a space, and the reconciler renders it as `breakAfter`.
- **Numbers.** Matches of `/\d+(?:[.,]\d+)*/g` in the text.
- **Links.** Every `a[href]`, with its raw text content as the label and its raw `href`.
- **Anchor.** The element's `id`, or else the first `id` among its descendants.
- **List items.** `ordered` and `listStart` (the `start` attribute plus the item's index) come from the parent `ol` or `ul`. `level` is new: it comes from the parent's `lst-kix_…-N` class.
- **Formatting runs.** A port of `formatting_runs`:
  - Class rules apply in stylesheet order, then inline `style`. Values inherit through ancestors, and text after a closing tag belongs to its parent element.
  - Offsets are half-open UTF-16 ranges in the whitespace-normalized text.
  - A run is `strong` when its weight is `bold` or at least 600, and `emphasis` when its style is `italic` or `oblique`.
  - `underline` comes from `text-decoration`.
  - `highlight` is any background other than `transparent`, `#ffffff` or `white`.
- **Images.** Embedded `data:image/png` or `data:image/jpeg` images, in document order.
  - Each image is stored as `/images/guide/<sha256>.<ext>`.
  - Width and height come from the PNG `IHDR` chunk or the JPEG start-of-frame marker.
  - Any other image type, or an image that isn't embedded, stops the run.
- **Placements.** A block's `figureIds` lists the images inside it.

Speed: embedded images are swapped for placeholders before parsing, so `jsdom` handles about 300 KB rather than 45 MB.

## Matching (identity)

Inputs: the current snapshot's blocks, which have IDs, and the parsed blocks, which don't yet.

1. **Unchanged.** Take the longest common subsequence of block keys. A key is the tag, exact text, link targets, formatting runs and image hashes.
   - Link targets are compared after unwrapping Google redirects, so a new `ust` value alone is not a change.
   - An unchanged block keeps its previous record, including its raw `href`s.
   - Its `listStart`, `level` and `anchor` are refreshed from the new parse.
2. **Same anchor or same image.** In the gaps between unchanged blocks:
   - headings with the same Google anchor pair up;
   - blocks with the same image hashes pair up.
3. **Edited.** In the remaining gaps, old and new blocks pair up in order, without crossing, when their word-level similarity is at least 0.6. Similarity is twice the length of the longest common subsequence of words, divided by the total word count.
4. **Removed and added.** Old blocks left unpaired are removed. New blocks left unpaired are added, and they take `block-NNNN` numbers from `nextBlock` in `captures.json`. Numbers are never reused, so a shared `#block-…` link never points at different content.
5. **Figures.** Within a paired block, figures match by hash in order. A new image gets the next `figure-NNN` number from `nextFigure`.

## Reconciliation rules

**Leaf generation.** A source block becomes inline runs:

- The text is split wherever formatting, links or newlines change.
- Each run carries the block's formatting flags.
- Links resolve to their canonical destination through `createDestinations().canonical(href, page, true)`, the resolver the validator already uses. Internal `#h.…` links become `/articles/<slug>#<block>`, and external links lose their Google wrapper.
- A newline becomes `breakAfter` on the run before it.

**One-to-one leaf.** A paragraph or heading leaf whose `sourceIds` is exactly `[id]`, and which is the only leaf carrying that source.

| Change                                                | Applied automatically                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Flagged instead                                                                                                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Edited block                                          | Its one-to-one leaf gets newly generated runs, keeping its `id`, kind and heading level. An `omitted` block stays omitted while its text still fits the omission's rule.                                                                                                                                                                                                                                                                                                                                                                                                                                         | Formulas, notes, groups, `strayText` entries, a leaf carrying several sources, or a tag change such as `p` to `li` or `h3` to `h2`.                                                  |
| Added empty or separator block                        | `layout-only` coverage with the standard reason.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | —                                                                                                                                                                                    |
| Added text block (`p`, `h2`–`h4`, `li`)               | Inserted after the predecessor's leaf, when the predecessor is one-to-one. The predecessor is the nearest earlier `rendered` block in the same article.<br>• A list item after a list item at the same level becomes the next item of the predecessor's list.<br>• A paragraph or heading after a paragraph or heading goes right after it, in the same container.<br>• A paragraph or heading after a list item goes right after the outermost list that holds the predecessor.<br>Headings map `h2` to level 2, `h3` to 3 and `h4` to 4. The coverage entry follows the predecessor's entry, in the same file. | `h1`, `h5`, `h6`, a table, a list item after a non-list block or at a different level, the Doc's first block, a predecessor inside a table, or a predecessor that is not one-to-one. |
| Added single-image block                              | A `figure` leaf, placed the same way, plus a figure entry with empty `alt` after the previous figure's entry, in the same file. The check fails until someone writes the alt text.                                                                                                                                                                                                                                                                                                                                                                                                                               | Several images, or an image with text.                                                                                                                                               |
| `layout-only` block that gains content                | Handled like an added block.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Same as for an added block.                                                                                                                                                          |
| Removed block, or a rendered block that becomes empty | Its one-to-one leaf is removed, along with a list item or list left empty, and its coverage entry is dropped. For an emptied block the entry becomes `layout-only`. Figures of removed blocks lose their leaf and figure entry.                                                                                                                                                                                                                                                                                                                                                                                  | Any other leaf shape.                                                                                                                                                                |
| Image replaced or moved to another block              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Always flagged, with the old and new figure IDs.                                                                                                                                     |

Taxonomy:

- Articles own a range of blocks by position in the snapshot, from `firstBlock` to `lastBlock`, not by ID number.
- A new block belongs to the article whose range holds its predecessor. When it falls after that range's last block, the range grows to include it. Content before the next article's opening heading belongs to the earlier article.
- When a range's first or last block is removed, the boundary moves to the nearest remaining block inside the range. A range left empty is flagged.
- `nonemptyBlocks` and `figures` are recalculated for every article.

A flagged change is never half-applied, and the capture records it in `captures.json` as `pending`; a test fails while that list is non-empty, because some flags (a heading level change, a sentence removed from a note) would otherwise pass the integrity validator. Its old leaf stays as it is, and the new snapshot makes `npm run check` fail, through a text mismatch, an unknown source ID or missing coverage, until someone resolves it. The report says what to do and suggests where.

Changes that need editorial review but don't fail the check go under "Review" in the report:

- a new heading, which may deserve its own article;
- an edited heading that starts an article;
- an edited chapter title;
- a changed anchor.

## Report

`content/source/changes/<YYYY-MM-DD>.md` is committed with the sync and formatted by Prettier. It contains:

1. **Summary:** capture time, the Doc's latest "Update Note" line, and counts of unchanged, edited, added and removed blocks and figures.
2. **Needs attention:** each flag, with the article, source ID, reason and suggested placement. `npm run check` fails until these are resolved.
3. **Review:** the non-blocking editorial items listed above.
4. **Per article:** edited blocks as "Before" and "After" quotes; added and removed blocks with their text; image changes.

## Snapshot files

- **`content/source/baseline.json`** stays the current snapshot, in the same shape as today with three changes:
  - `li` blocks gain `level`;
  - `text` may contain newlines;
  - `fingerprints` becomes `{ html, docx? }`, because new captures record the SHA-256 of the decompressed export and have no DOCX.
- **`content/source/captures.json`** is new. Each entry records:
  - `capturedAt`;
  - the fingerprints;
  - the Doc's update note;
  - block and figure counts;
  - `nextBlock` and `nextFigure`;
  - the report path;
  - `baselineDigest`: the SHA-256 of `JSON.stringify` of the parsed baseline.

  The first entry records the original capture of 2026-09-24 (the HTML and DOCX fingerprints, `nextBlock` 1269, `nextFigure` 91). Git history keeps every earlier baseline, so there is no separate snapshots folder.

- **`content/source/figure-audit.json`** stays unchanged. It is the evidence from the original visual audit. New figures get alt text in `app/content/figures/`, not audit records.

## Changes outside the importer

- **`app/content/repository.ts`**:
  - `pageForSource` finds a block's article, and the nearest-visible-block fallback measures distance, by position in `source-references.json` instead of by ID number;
  - the logic moves into a small pure function so it can be tested.
- **`app/content/types.ts`**: `SourceBaseline` gains `level?`, and `fingerprints.docx` becomes optional.
- **`tests/source-baseline.test.ts`** (D9). The assertions pinned to the frozen capture are replaced with invariants that hold for any capture:
  - **Removed:** the fixed counts, the fingerprint constants, the digests of content and taxonomy, and the assertions about specific block IDs.
  - **Kept:** formatting positions, figure bytes on disk, and the figure-audit digest.
  - **Added:**
    - taxonomy ranges cover every snapshot block once and in order;
    - slugs are unique ASCII;
    - derived counts match;
    - the last `captures.json` entry's `baselineDigest` matches `baseline.json`. A hand edit to the baseline therefore fails the tests, as it does today.
- **`package.json`**: `source:sync` and `source:check` scripts. No new dependencies; `jsdom` is already a dev dependency, and gzip is in `node:zlib`.
- **Docs:**
  - README: the commands, and the baseline rule changed from "frozen" to "changes only through `source:sync`";
  - AGENTS.md: the same rule;
  - `docs/source-guide-migration.md`: a pointer to the sync;
  - `archive/guide-migration/README.md`: a pointer to `source:sync`;
  - the research doc's status line.

## First sync

The last implementation step runs `npm run source:sync` against the live Doc. That capture is committed so the wiki starts from the new importer's snapshot. Since the Doc is unchanged, the expected result is:

- the 5 blocks with glued words get their line breaks:
  - 0434, 1065 and 1079 are one-to-one paragraphs, applied automatically;
  - the formulas 1021 and 1112 are flagged and fixed by hand in the same change;
- block 1071 gains a newline where a space already was;
- 569 list items gain `level`;
- the 5 redirect links keep their stored `href`s;
- nothing else changes.

## Verification

- **Unit tests with small fixtures, per AGENTS.md:**
  - **Parse:**
    - block selection;
    - whitespace;
    - `<br>`;
    - anchors;
    - list `ordered`, `listStart` and `level`;
    - links;
    - PNG and JPEG images;
    - gzip input.
    - The formatting cases port the fixture from `formatting-import.py`.
  - **Match:**
    - unchanged;
    - a new `ust` value alone;
    - edited;
    - added;
    - removed;
    - an anchored heading rename;
    - IDs that are never reused.
  - **Reconcile:** every row of the rules table.
  - **Report:** sections and flags.
  - **End to end:** a `source:sync --from <fixture>` run in a temporary directory, with no network.
- **Parity gate**, run once during implementation because it needs the ignored capture: `--from .local-tools/source-doc/source.html --dry-run` must reproduce `baseline.json` exactly, including formatting runs, apart from the documented line-break and `level` differences.
- **Generator gate**, run once. Regenerating every unchanged one-to-one leaf from today's baseline must match the current leaf character by character in text, formatting and link targets, after whitespace normalization. Any mismatch is either fixed in the generator or explained in the plan before the reconciler is trusted.
- `npm run check`, `npm run build` and `npm run verify:browser` after the first sync.

## Failure handling

The run stops, writes nothing and explains why when:

- the download fails, or isn't the guide's HTML;
- a "CH n:" chapter heading from the current snapshot is missing or out of order, which could happen if Kanon moves content into Doc tabs;
- fewer than 75% of the current blocks are matched as unchanged or edited, unless `--force` is passed;
- an image type is unsupported;
- files under `content/`, `app/content/` or `public/images/guide/` have uncommitted changes, unless `--allow-dirty` or `--dry-run` is passed.

## Out of scope

- A scheduled GitHub Action. The command runs unattended, so one can call it later.
- The converter and overlay (option B), and text-slug heading anchors.
- Placing structural changes automatically: new chapters or articles, list nesting changes, tables, multi-image groups.
- Writing alt text, which needs someone to look at the image.
- Google Docs tabs, beyond the chapter guard.
