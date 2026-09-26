# Google Doc Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `npm run source:sync` and `npm run source:check`. They pull Kanon's Google Doc, record a new source snapshot with stable block IDs, apply one-to-one text edits to the hand-built articles, and write a change report. Then run the first real sync.

**Architecture:** Small, mostly pure modules live under `scripts/source/`:

- `parse.ts`: export HTML → blocks and images;
- `align.ts`: previous snapshot + parsed blocks → IDs and changes;
- `leaf.ts`: source block → inline runs;
- `reconcile.ts`: changes → articles, coverage, figures and taxonomy;
- `report.ts`: Markdown report;
- `sync.ts`: file and network I/O.

`scripts/source-sync.ts` is a thin CLI over `sync.ts`. The existing integrity validator stays the gate: anything the reconciler can't apply makes `npm run check` fail until someone resolves it.

**Tech Stack:** Node 24 (runs `.ts` directly), TypeScript 6, `jsdom` 30 (already a dev dependency), `node:zlib`, Prettier 3 API, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-26-google-doc-sync-design.md`. Research: `docs/research/2026-09-25-google-doc-sync.md`.

## Global Constraints

- No new dependencies. `jsdom` has no bundled types, so add the ambient declaration in Task 1 instead of `@types/jsdom`.
- Scripts run under Node's type stripping:
  - relative imports carry `.ts`;
  - type-only imports use `import type`;
  - no enums, namespaces or parameter properties.
- Only the fetch in `scripts/source/sync.ts` touches the network. Tests, `npm run check` and `npm run build` stay offline.
- `scripts/content-integrity.ts` keeps its checks unchanged. The only edit is exporting `isLayoutOnly`. Never loosen a check to absorb a Doc change.
- Tests use small neutral fixtures, not guide wording, game values or catalogue counts (AGENTS.md). Source-test files start with `// @vitest-environment node`.
- Preserve guide text, numbers, figure placements, links, highlights and regional or uncertainty wording. The reconciler writes only source text.
- Commit messages follow the repo style (an imperative sentence, no prefix) with no Claude attribution or co-author lines. Don't push.
- Block and figure numbers are never reused. New numbers come from `nextBlock` and `nextFigure` in the last `content/source/captures.json` entry.
- Export URL: `https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/export?format=html`.
- Thresholds from the spec:
  - word similarity for an edit: at least `0.6`;
  - the churn guard stops when fewer than `0.75` of the previous blocks pair up.

## Review Focus

1. **Two new blocks in a row:** the second must land after the first, not before it. Test: "keeps two new paragraphs in order" (Task 4).
2. **An article's first block removed:** the article's boundary must move to its next surviving block. Test: "moves an article boundary when its first block leaves" (Task 4).
3. **An edited paragraph that links to a Doc heading (`#h.…`):** the link must resolve to `/articles/<slug>#<block>`. Test: "resolves a link to a Doc heading inside an edited paragraph" (Task 4).
4. **A second run over the same export:** it must write nothing. Test: "writes nothing on a second run over the same export" (Task 6).
5. **A download that isn't the guide's HTML:** it must stop before writing anything. Test: "writes nothing when the export is not HTML" (Task 6).

## Execution notes

- **Verification gates.** Tasks 1 and 3 each end with a one-time gate script under `.local-tools/sync-gates/`, which is ignored. The Task 1 gate needs the original capture, `.local-tools/source-doc/source.html`, which exists only in the main checkout. Pass its absolute path.
- **This WSL setup** (see memory `wsl-linux-mirror-for-checks`): run npm commands in the Linux mirror, and copy files that commands write (Task 8's `captures.json`, Task 9's sync output) back into the checkout before committing.

---

### Task 1: Export parser

**Files:**

- Modify: `app/content/types.ts` (the `SourceBaseline` type)
- Modify: `tsconfig.json` (the `include` list)
- Create: `scripts/source/jsdom.d.ts`, `scripts/source/model.ts`, `scripts/source/text.ts`, `scripts/source/images.ts`, `scripts/source/parse.ts`
- Test: `tests/source-parse.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces:
  - `decodeExport(bytes: Uint8Array): string`
  - `parseExport(html: string): ParsedExport`
  - `imageSize(bytes: Uint8Array, extension: 'png' | 'jpg'): { width: number; height: number }`
  - `isSourceSpace(character: string): boolean`
  - `LINE_BREAK = '\n'`
  - `numbersIn(text: string): string[]`
  - The types in `model.ts`: `SourceBlock`, `SourceFigure`, `ParsedBlock`, `ParsedImage`, `ParsedExport`, `TaxonomyEntry`, `Capture`, `ContentSet`.

- [ ] **Step 1: Extend the snapshot type.** In `app/content/types.ts`, replace the `SourceBaseline` type's first lines through `listStart` with:

```ts
export type SourceBaseline = {
  /** SHA-256 of each capture's export files. Captures by `source:sync` have no DOCX. */
  fingerprints: { html: string; docx?: string };
  blocks: {
    id: string;
    tag?: string;
    /** Whitespace-normalized; a newline marks a line break in the source. */
    text: string;
    numbers: string[];
    figureIds: string[];
    anchor?: string;
    ordered?: boolean;
    listStart?: number;
    /** Nesting level of a list item, counted from 0. */
    level?: number;
```

(The `links`, `formatting` and `figures` members stay as they are.)

- [ ] **Step 2: Add the shared model, text rules and jsdom declaration.**

`scripts/source/jsdom.d.ts`:

```ts
// jsdom ships no type declarations; this covers the one constructor the importer uses.
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string);
    readonly window: Window & typeof globalThis;
  }
}
```

`scripts/source/model.ts`:

```ts
import type {
  CoverageEntry,
  Figure,
  GuidePage,
  SourceBaseline,
} from '../../app/content/types';

export type SourceBlock = SourceBaseline['blocks'][number];
export type SourceFigure = SourceBaseline['figures'][number];

/** A block read from an export, before it has an ID. */
export type ParsedBlock = {
  tag: string;
  text: string;
  numbers: string[];
  links: SourceBlock['links'];
  formatting: SourceBlock['formatting'];
  /** Indexes into `ParsedExport.images`, in document order. */
  images: number[];
  anchor?: string;
  ordered?: boolean;
  listStart?: number;
  level?: number;
};

export type ParsedImage = {
  sha256: string;
  extension: 'png' | 'jpg';
  bytes: Uint8Array;
  width: number;
  height: number;
};

export type ParsedExport = { blocks: ParsedBlock[]; images: ParsedImage[] };

export type TaxonomyEntry = {
  slug: string;
  chapter: number;
  title: string;
  sourceTitle?: string;
  firstBlock: string;
  lastBlock: string;
  nonemptyBlocks: number;
  figures: string[];
};

/** One entry per capture in content/source/captures.json. */
export type Capture = {
  capturedAt: string;
  fingerprints: SourceBaseline['fingerprints'];
  updateNote: string | null;
  blocks: number;
  figures: number;
  nextBlock: number;
  nextFigure: number;
  report: string | null;
  /** SHA-256 of JSON.stringify(baseline) as written by this capture. */
  baselineDigest: string;
};

/** Every committed file the sync reads and rewrites, keyed by file name. */
export type ContentSet = {
  baseline: SourceBaseline;
  overview: GuidePage;
  chapters: { file: string; pages: GuidePage[] }[];
  coverage: { file: string; entries: CoverageEntry[] }[];
  figures: { file: string; entries: Figure[] }[];
  taxonomy: TaxonomyEntry[];
  captures: Capture[];
};
```

`scripts/source/text.ts`:

```ts
// Whitespace the original capture collapsed: Python's str.split() set, plus the
// rest of ECMAScript's \s so the integrity validator normalizes the same text.
const spaceRanges: [number, number][] = [
  [0x09, 0x0d],
  [0x1c, 0x20],
  [0x85, 0x85],
  [0xa0, 0xa0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
];

/** Marks a `<br>` in block text; the validator reads it as a space. */
export const LINE_BREAK = '\n';

export function isSourceSpace(character: string): boolean {
  const code = character.codePointAt(0) ?? -1;
  return spaceRanges.some(([low, high]) => code >= low && code <= high);
}

/** The capture's numeric-token grammar, shared with the integrity validator. */
export const numbersIn = (text: string): string[] =>
  text.match(/\d+(?:[.,]\d+)*/gu) ?? [];
```

In `tsconfig.json`, add `"scripts/source/**/*"` and `"scripts/source-sync.ts"` to `include`, after `"scripts/static-not-found.tsx"`.

- [ ] **Step 3: Write the failing parser tests.** Create `tests/source-parse.test.ts`:

```ts
// @vitest-environment node
import { gzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { imageSize } from '../scripts/source/images.ts';
import { decodeExport, parseExport } from '../scripts/source/parse.ts';
import { isSourceSpace } from '../scripts/source/text.ts';

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const page = (body: string, style = '') =>
  `<html><head><style>${style}</style></head><body>${body}</body></html>`;

it('reads gzip and plain exports and rejects anything else', () => {
  const html = page('<p>One</p>');
  expect(decodeExport(gzipSync(html))).toBe(html);
  expect(decodeExport(Buffer.from(html))).toBe(html);
  expect(() => decodeExport(Buffer.from('%PDF-1.7'))).toThrow(
    'not an HTML document',
  );
});

it('treats the capture whitespace set as spaces', () => {
  for (const code of [0x20, 0xa0, 0x1c, 0x2028, 0xfeff])
    expect(isSourceSpace(String.fromCodePoint(code))).toBe(true);
  expect(isSourceSpace('a')).toBe(false);
});

it('selects top-level blocks in order and collapses whitespace', () => {
  const { blocks } = parseExport(
    page(
      '<h2 id="h.a">Title</h2><p>  A&nbsp;&nbsp;b <span>c</span>\n</p>' +
        '<ul class="lst-kix_x-0"><li><p>nested</p></li></ul>' +
        '<table><tr><td>cell</td></tr></table>',
    ),
  );
  expect(blocks.map((block) => [block.tag, block.text])).toEqual([
    ['h2', 'Title'],
    ['p', 'A b c'],
    ['li', 'nested'],
    ['table', 'cell'],
  ]);
  expect(blocks[0].anchor).toBe('h.a');
});

it('keeps an inner line break as a newline and drops breaks at the edges', () => {
  const { blocks } = parseExport(
    page('<p><br>damage<br>At 2%<br></p><p>30%<br>&nbsp;more</p>'),
  );
  expect(blocks.map((block) => block.text)).toEqual([
    'damage\nAt 2%',
    '30%\nmore',
  ]);
});

it('records list numbering and nesting level', () => {
  const { blocks } = parseExport(
    page(
      '<ol class="lst-kix_n-0 start" start="3"><li>c</li><li>d</li></ol>' +
        '<ul class="lst-kix_n-1"><li>e</li></ul>',
    ),
  );
  expect(
    blocks.map(({ ordered, listStart, level }) => ({
      ordered,
      listStart,
      level,
    })),
  ).toEqual([
    { ordered: true, listStart: 3, level: 0 },
    { ordered: true, listStart: 4, level: 0 },
    { ordered: false, listStart: undefined, level: 1 },
  ]);
});

it('keeps raw links, numbers and the first descendant anchor', () => {
  const { blocks } = parseExport(
    page(
      '<p><span id="h.x"></span>See <a href="https://www.google.com/url?q=https://example.com&amp;ust=1">1,200 and 5.5%</a></p>',
    ),
  );
  expect(blocks[0]).toMatchObject({
    anchor: 'h.x',
    numbers: ['1,200', '5.5'],
    links: [
      {
        label: '1,200 and 5.5%',
        href: 'https://www.google.com/url?q=https://example.com&ust=1',
      },
    ],
  });
});

// Ported from archive/guide-migration/formatting-import.py.
it('positions formatting runs like the original importer', () => {
  const style =
    '.normal { font-style: normal } .italic { font-style: italic } ' +
    '.bold { font-weight: 700 } .marked { text-decoration: underline; background-color: #ffff00 }';
  const { blocks } = parseExport(
    page(
      '<p class="italic">  🎮&nbsp;<span class="normal">P<span>erks</span></span>\n\t' +
        '<span class="italic normal">Per<span class="bold marked"><a style="text-decoration:inherit">ks</a></span></span>' +
        ' tail <span style="font-style:normal">plain</span> end </p>',
      style,
    ),
  );
  expect(blocks[0].text).toBe('🎮 Perks Perks tail plain end');
  expect(blocks[0].formatting).toEqual([
    { text: '🎮', start: 0, end: 2, emphasis: true },
    { text: 'Per', start: 9, end: 12, emphasis: true },
    {
      text: 'ks',
      start: 12,
      end: 14,
      strong: true,
      emphasis: true,
      underline: true,
      highlight: '#ffff00',
    },
    { text: 'tail', start: 15, end: 19, emphasis: true },
    { text: 'end', start: 26, end: 29, emphasis: true },
  ]);
});

it('extracts embedded images with hash, size and placement', () => {
  const { blocks, images } = parseExport(
    page(
      `<p>x<img src="data:image/png;base64,${png}"></p>` +
        `<p><img alt="" src="data:image/png;base64,${png}"></p>`,
    ),
  );
  expect(images).toHaveLength(2);
  expect(images[0]).toMatchObject({ extension: 'png', width: 1, height: 1 });
  expect(images[0].sha256).toMatch(/^[0-9a-f]{64}$/u);
  expect(blocks.map((block) => block.images)).toEqual([[0], [1]]);
});

it('stops on images it cannot place or read', () => {
  expect(() =>
    parseExport(page('<p><img src="https://example.com/a.png"></p>')),
  ).toThrow('Unsupported image');
  expect(() =>
    parseExport(page('<p><img src="data:image/gif;base64,R0lGOD"></p>')),
  ).toThrow('Unsupported image');
  expect(() =>
    parseExport(
      page(`<div><img src="data:image/png;base64,${png}"></div><p>x</p>`),
    ),
  ).toThrow('outside any');
});

it('reads PNG and JPEG dimensions from their headers', () => {
  const pngHeader = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2,
    0, 0, 0, 3,
  ]);
  expect(imageSize(pngHeader, 'png')).toEqual({ width: 2, height: 3 });
  const jpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b,
    0x08, 0x00, 0x02, 0x00, 0x03, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
  ]);
  expect(imageSize(jpeg, 'jpg')).toEqual({ width: 3, height: 2 });
});
```

- [ ] **Step 4: Run the tests to verify they fail.**

Run: `npm test -- tests/source-parse.test.ts`
Expected: FAIL. The imports `../scripts/source/images.ts` and `../scripts/source/parse.ts` do not resolve.

- [ ] **Step 5: Implement image sizes.** Create `scripts/source/images.ts`:

```ts
/** Width and height from a PNG IHDR chunk or a JPEG start-of-frame marker. */
export function imageSize(
  bytes: Uint8Array,
  extension: 'png' | 'jpg',
): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (extension === 'png') {
    if (bytes.length < 24 || view.getUint32(12) !== 0x49484452)
      throw new Error('PNG image has no IHDR chunk');
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Malformed JPEG marker');
    const marker = bytes[offset + 1];
    // Start-of-frame markers, excluding DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return {
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    offset += 2 + view.getUint16(offset + 2);
  }
  throw new Error('JPEG image has no start-of-frame marker');
}
```

- [ ] **Step 6: Implement the parser.** Create `scripts/source/parse.ts`:

```ts
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';
import { imageSize } from './images.ts';
import type {
  ParsedBlock,
  ParsedExport,
  ParsedImage,
  SourceBlock,
} from './model.ts';
import { isSourceSpace, LINE_BREAK, numbersIn } from './text.ts';

const BLOCKS = 'p,li,h1,h2,h3,h4,h5,h6,table';

/** Google serves the HTML export gzip-compressed without saying so; detect it by its bytes. */
export function decodeExport(bytes: Uint8Array): string {
  const raw =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? gunzipSync(bytes)
      : Buffer.from(bytes);
  const html = raw.toString('utf8');
  if (!/^\s*<html[\s>]/iu.test(html))
    throw new Error('The export is not an HTML document');
  return html;
}

const IMAGE_TAG = /<img\b[^>]*>/giu;
const EMBEDDED = /\ssrc="data:image\/(png|jpeg);base64,([^"]*)"/iu;

/** Swap embedded images for placeholders so the parser reads kilobytes, not megabytes. */
function extractImages(html: string): { html: string; images: ParsedImage[] } {
  const images: ParsedImage[] = [];
  const stripped = html.replace(IMAGE_TAG, (tag) => {
    const match = EMBEDDED.exec(tag);
    if (!match)
      throw new Error(`Unsupported image in the export: ${tag.slice(0, 80)}`);
    const bytes = Buffer.from(match[2], 'base64');
    const extension = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
    images.push({
      sha256: createHash('sha256').update(bytes).digest('hex'),
      extension,
      bytes,
      ...imageSize(bytes, extension),
    });
    return tag.replace(match[0], ` data-source-image="${images.length - 1}"`);
  });
  return { html: stripped, images };
}

type Style = Record<string, string>;
type Rule = [string, Style];
type Chunk = { text: string; style: Style; lineBreak?: boolean };
type Character = { value: string; origin: number };
type Formatting = SourceBlock['formatting'][number];

function declarations(body: string): Style {
  const result: Style = {};
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon >= 0)
      result[declaration.slice(0, colon).trim()] = declaration
        .slice(colon + 1)
        .trim();
  }
  return result;
}

/** Single-class rules in stylesheet order, as the original importer read them. */
function classRules(css: string): Rule[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]+)\}/gu)].flatMap(
    ([, selector, body]): Rule[] =>
      /^\.[A-Za-z0-9_-]+$/u.test(selector.trim())
        ? [[selector.trim().slice(1), declarations(body)]]
        : [],
  );
}

function styleOf(element: Element, inherited: Style, rules: Rule[]): Style {
  const names = new Set(element.classList);
  const applied: Style = {};
  for (const [name, values] of rules)
    if (names.has(name)) Object.assign(applied, values);
  Object.assign(applied, declarations(element.getAttribute('style') ?? ''));
  const current = { ...inherited };
  for (const [key, value] of Object.entries(applied))
    if (value !== 'inherit') current[key] = value;
  return current;
}

/** Text nodes with their inherited style; text after a closing tag belongs to its parent. */
function chunksOf(element: Element, rules: Rule[]): Chunk[] {
  const ancestors: Element[] = [];
  for (let parent = element.parentElement; parent; parent = parent.parentElement)
    ancestors.unshift(parent);
  let inherited: Style = {};
  for (const ancestor of ancestors)
    inherited = styleOf(ancestor, inherited, rules);
  const chunks: Chunk[] = [];
  const visit = (node: Element, parentStyle: Style) => {
    const style = styleOf(node, parentStyle, rules);
    if (node.tagName === 'BR') {
      chunks.push({ text: '', style, lineBreak: true });
      return;
    }
    for (const child of node.childNodes) {
      if (child.nodeType === 3)
        chunks.push({ text: child.textContent ?? '', style });
      else if (child.nodeType === 1) visit(child as Element, style);
    }
  };
  visit(element, inherited);
  return chunks;
}

/** One space per whitespace run, or a newline when the run holds a `<br>`; trimmed. */
function normalize(chunks: Chunk[]): Character[] {
  const characters: Character[] = [];
  const space = (value: string, origin: number) => {
    const last = characters.at(-1);
    if (!last) return;
    if (last.value === ' ' || last.value === LINE_BREAK) {
      if (value === LINE_BREAK) last.value = LINE_BREAK;
      return;
    }
    characters.push({ value, origin });
  };
  chunks.forEach((chunk, origin) => {
    if (chunk.lineBreak) space(LINE_BREAK, origin);
    else
      for (const value of chunk.text) {
        if (isSourceSpace(value)) space(' ', origin);
        else characters.push({ value, origin });
      }
  });
  while ([' ', LINE_BREAK].includes(characters.at(-1)?.value ?? ''))
    characters.pop();
  return characters;
}

/** Half-open UTF-16 ranges per text node, kept when the node carries inline styling. */
function formattingRuns(characters: Character[], chunks: Chunk[]): Formatting[] {
  const text = characters.map((character) => character.value).join('');
  const spans = new Map<number, [number, number]>();
  let offset = 0;
  for (const { value, origin } of characters) {
    if (value !== ' ' && value !== LINE_BREAK)
      spans.set(origin, [spans.get(origin)?.[0] ?? offset, offset + value.length]);
    offset += value.length;
  }
  const runs: Formatting[] = [];
  chunks.forEach((chunk, origin) => {
    const span = spans.get(origin);
    if (!span) return;
    const run: Formatting = {
      text: text.slice(span[0], span[1]),
      start: span[0],
      end: span[1],
    };
    const weight = chunk.style['font-weight'] ?? '';
    if (weight === 'bold' || (/^\d+$/u.test(weight) && Number(weight) >= 600))
      run.strong = true;
    if (['italic', 'oblique'].includes(chunk.style['font-style'] ?? ''))
      run.emphasis = true;
    if ((chunk.style['text-decoration'] ?? '').includes('underline'))
      run.underline = true;
    const highlight = (chunk.style['background-color'] ?? '').toLowerCase();
    if (highlight && !['transparent', '#ffffff', 'white'].includes(highlight))
      run.highlight = highlight;
    if (Object.keys(run).length > 3) runs.push(run);
  });
  return runs;
}

export function parseExport(source: string): ParsedExport {
  const { html, images } = extractImages(source);
  const { document } = new JSDOM(html).window;
  const rules = classRules(
    [...document.querySelectorAll('style')]
      .map((node) => node.textContent ?? '')
      .join('\n'),
  );
  let placed = 0;
  const blocks = [...document.body.querySelectorAll(BLOCKS)]
    .filter((element) => !element.parentElement?.closest(BLOCKS))
    .map((element): ParsedBlock => {
      const chunks = chunksOf(element, rules);
      const characters = normalize(chunks);
      const text = characters.map((character) => character.value).join('');
      const block: ParsedBlock = {
        tag: element.tagName.toLowerCase(),
        text,
        numbers: numbersIn(text),
        links: [...element.querySelectorAll('a[href]')].map((link) => ({
          label: link.textContent ?? '',
          href: link.getAttribute('href') ?? '',
        })),
        formatting: formattingRuns(characters, chunks),
        images: [...element.querySelectorAll('img[data-source-image]')].map(
          (image) => Number(image.getAttribute('data-source-image')),
        ),
      };
      const anchor = [element, ...element.querySelectorAll('[id]')]
        .map((node) => node.id)
        .find(Boolean);
      if (anchor) block.anchor = anchor;
      const list = element.parentElement;
      if (element.tagName === 'LI' && list) {
        if (list.tagName === 'OL') {
          block.ordered = true;
          block.listStart =
            Number(list.getAttribute('start') ?? '1') +
            [...list.children].indexOf(element);
        } else if (list.tagName === 'UL') block.ordered = false;
        const level = [...list.classList]
          .map((name) => /^lst-kix_\w+-(\d+)$/u.exec(name)?.[1])
          .find((value) => value !== undefined);
        if (level !== undefined) block.level = Number(level);
      }
      placed += block.images.length;
      return block;
    });
  if (placed !== images.length)
    throw new Error(
      'An image in the export sits outside any paragraph, list item, heading or table',
    );
  return { blocks, images };
}
```

- [ ] **Step 7: Run the tests to verify they pass.**

Run: `npm test -- tests/source-parse.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 8: Run the parity gate against the original capture.** Create `.local-tools/sync-gates/parity.ts`. The folder is ignored, so this is throwaway verification:

```ts
// One-time gate: the TypeScript parser must reproduce the committed baseline from the original capture.
import { readFileSync } from 'node:fs';
import type { SourceBaseline } from '../../app/content/types';
import { decodeExport, parseExport } from '../../scripts/source/parse.ts';

const baseline = JSON.parse(
  readFileSync('content/source/baseline.json', 'utf8'),
) as SourceBaseline;
const parsed = parseExport(decodeExport(readFileSync(process.argv[2])));
if (parsed.blocks.length !== baseline.blocks.length)
  throw new Error(`${parsed.blocks.length} blocks, expected ${baseline.blocks.length}`);
const differences = new Map<string, string[]>();
baseline.blocks.forEach((before, index) => {
  const after = parsed.blocks[index];
  const fields = ['tag', 'text', 'numbers', 'links', 'formatting', 'anchor', 'ordered', 'listStart'] as const;
  for (const field of fields)
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field]))
      differences.set(field, [...(differences.get(field) ?? []), before.id]);
  const hashes = before.figureIds.map((id) => baseline.figures.find((figure) => figure.id === id)?.sha256);
  if (JSON.stringify(hashes) !== JSON.stringify(after.images.map((image) => parsed.images[image].sha256)))
    differences.set('images', [...(differences.get('images') ?? []), before.id]);
});
for (const [field, ids] of differences) console.log(`${field}: ${ids.join(', ')}`);
console.log(`levels on ${parsed.blocks.filter((block) => block.level !== undefined).length} list items`);
```

Run from the repository root: `node .local-tools/sync-gates/parity.ts <absolute path to .local-tools/source-doc/source.html>`
Expected, exactly:

```
text: block-0434, block-1021, block-1065, block-1071, block-1079, block-1112
levels on 569 list items
```

A `formatting:` line naming only a subset of those six blocks is also acceptable, because their offsets after the new line break shift. Any other field or block is a parser bug. Fix it with a failing test first, then rerun the gate.

- [ ] **Step 9: Typecheck, lint and commit.**

Run: `npm run typecheck && npm run lint && npm test -- tests/source-parse.test.ts`
Expected: all pass.

```bash
git add app/content/types.ts tsconfig.json scripts/source tests/source-parse.test.ts
git commit -m "Parse the Google Doc HTML export in TypeScript"
```

---

### Task 2: Snapshot matcher

**Files:**

- Create: `scripts/source/align.ts`
- Test: `tests/source-align.test.ts`

**Interfaces:**

- Consumes: `ParsedExport`, `ParsedBlock` and `SourceBlock` (Task 1); `normalizeSourceUrl` from `app/content/reader.ts`.
- Produces:
  - `alignSnapshot(previous: SourceBaseline, parsed: ParsedExport, options: AlignOptions): Alignment`
  - `similarity(left: string, right: string): number`
  - `commonSubsequence<T>(left: T[], right: T[]): [number, number][]`
  - `type BlockChange = { kind: 'unchanged' | 'edited' | 'added'; id: string }`
  - `type AlignOptions = { fingerprints: SourceBaseline['fingerprints']; nextBlock: number; nextFigure: number; force?: boolean }`
  - `type Alignment = { baseline: SourceBaseline; changes: BlockChange[]; removed: string[]; newImages: { figure: SourceFigure; bytes: Uint8Array }[]; removedFigures: string[]; nextBlock: number; nextFigure: number }`
  - `changes` holds every new block, in snapshot order. `removed` holds previous block IDs, in previous order.

- [ ] **Step 1: Write the failing tests.** Create `tests/source-align.test.ts`:

```ts
// @vitest-environment node
import { expect, it } from 'vitest';
import type { SourceBaseline } from '../app/content/types';
import { alignSnapshot, similarity, type Alignment } from '../scripts/source/align.ts';
import { parseExport } from '../scripts/source/parse.ts';

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const empty: SourceBaseline = { fingerprints: { html: '' }, blocks: [], figures: [] };
const capture = (body: string) =>
  parseExport(`<html><head></head><body>${body}</body></html>`);
const first = (body: string) =>
  alignSnapshot(empty, capture(body), {
    fingerprints: { html: 'first' },
    nextBlock: 1,
    nextFigure: 1,
  });
const next = (previous: Alignment, body: string, force = false) =>
  alignSnapshot(previous.baseline, capture(body), {
    fingerprints: { html: 'next' },
    nextBlock: previous.nextBlock,
    nextFigure: previous.nextFigure,
    force,
  });
const kinds = (alignment: Alignment) =>
  alignment.changes.map(({ id, kind }) => `${id}:${kind}`);
const paragraphs = (...texts: string[]) =>
  texts.map((text) => `<p>${text}</p>`).join('');

it('measures word similarity', () => {
  expect(similarity('one two three', 'one two four')).toBeCloseTo(2 / 3);
  expect(similarity('', '')).toBe(1);
  expect(similarity('a', '')).toBe(0);
});

it('keeps unchanged IDs and numbers new blocks after the highest issued', () => {
  const v1 = first(paragraphs('one two three', 'four five six'));
  const v2 = next(v1, paragraphs('one two three', 'new words here', 'four five six'));
  expect(kinds(v2)).toEqual([
    'block-0001:unchanged',
    'block-0003:added',
    'block-0002:unchanged',
  ]);
  expect(v2.nextBlock).toBe(4);
});

it('pairs an edited paragraph by word similarity', () => {
  const v1 = first(paragraphs('a b c', 'd e f', 'one two three'));
  expect(kinds(next(v1, paragraphs('a b c', 'd e f', 'one two four')))).toEqual([
    'block-0001:unchanged',
    'block-0002:unchanged',
    'block-0003:edited',
  ]);
});

it('ignores new redirect tracking parameters and keeps the stored href', () => {
  const link = (ust: number) =>
    `<p><a href="https://www.google.com/url?q=https://example.com&amp;ust=${ust}">site</a></p>`;
  const v2 = next(first(link(1)), link(2));
  expect(kinds(v2)).toEqual(['block-0001:unchanged']);
  expect(v2.baseline.blocks[0].links[0].href).toContain('ust=1');
});

it('keeps a renamed heading by its anchor', () => {
  const v1 = first('<h2 id="h.a">Old name</h2>' + paragraphs('x y z', 'q r s', 't u v'));
  const v2 = next(v1, '<h2 id="h.a">Totally different</h2>' + paragraphs('x y z', 'q r s', 't u v'));
  expect(kinds(v2)[0]).toBe('block-0001:edited');
});

it('never reuses the number of a removed block', () => {
  const v1 = first(paragraphs('a b', 'c d', 'e f', 'g h', 'i j'));
  const v2 = next(v1, paragraphs('a b', 'c d', 'e f', 'g h'));
  expect(v2.removed).toEqual(['block-0005']);
  const v3 = next(v2, paragraphs('a b', 'c d', 'e f', 'g h', 'k l'));
  expect(kinds(v3).at(-1)).toBe('block-0006:added');
});

it('stops when a chapter heading disappears or most blocks change', () => {
  const v1 = first('<h1>CH 1: Start</h1>' + paragraphs('a b c', 'd e f', 'g h i', 'j k l'));
  expect(() => next(v1, paragraphs('a b c', 'd e f', 'g h i', 'j k l'))).toThrow(
    'Chapter heading',
  );
  const v2 = first(paragraphs('a b c', 'd e f', 'g h i', 'j k l'));
  const rewrite = paragraphs('m n o', 'p q r', 's t u', 'v w x');
  expect(() => next(v2, rewrite)).toThrow('Only 0 of 4 blocks');
  expect(next(v2, rewrite, true).removed).toHaveLength(4);
});

it('reuses figure IDs by image hash and numbers new images', () => {
  const image = `<p><img src="data:image/png;base64,${png}"></p>`;
  const v1 = first(image + paragraphs('a b c'));
  expect(v1.baseline.figures.map((figure) => figure.id)).toEqual(['figure-001']);
  const v2 = next(v1, image + paragraphs('a b c') + image);
  expect(v2.baseline.figures.map((figure) => [figure.id, figure.sourceId])).toEqual([
    ['figure-001', 'block-0001'],
    ['figure-002', 'block-0003'],
  ]);
  expect(v2.newImages.map(({ figure }) => figure.id)).toEqual(['figure-002']);
  expect(v2.baseline.figures[1].src).toMatch(/^\/images\/guide\/[0-9a-f]{64}\.png$/u);
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm test -- tests/source-align.test.ts`
Expected: FAIL. `../scripts/source/align.ts` does not resolve.

- [ ] **Step 3: Implement the matcher.** Create `scripts/source/align.ts`:

```ts
import { normalizeSourceUrl } from '../../app/content/reader.ts';
import type { SourceBaseline } from '../../app/content/types';
import type {
  ParsedBlock,
  ParsedExport,
  SourceBlock,
  SourceFigure,
} from './model.ts';

export type BlockChange = {
  kind: 'unchanged' | 'edited' | 'added';
  id: string;
};
export type AlignOptions = {
  fingerprints: SourceBaseline['fingerprints'];
  nextBlock: number;
  nextFigure: number;
  force?: boolean;
};
export type Alignment = {
  baseline: SourceBaseline;
  /** Every block of the new snapshot, in order. */
  changes: BlockChange[];
  /** Previous block IDs with no counterpart, in previous order. */
  removed: string[];
  newImages: { figure: SourceFigure; bytes: Uint8Array }[];
  removedFigures: string[];
  nextBlock: number;
  nextFigure: number;
};

const CHAPTER_TITLE = /^(?:CH|CHAPTER)\s*\d+\s*:/iu;
const MIN_SIMILARITY = 0.6;
const MIN_MATCHED = 0.75;

const target = (href: string) => normalizeSourceUrl(href) ?? href;

type Comparable = Pick<ParsedBlock, 'text' | 'links' | 'formatting'> & {
  tag?: string;
};

/** Equal keys mean an unchanged block; redirect tracking parameters don't count. */
function blockKey(block: Comparable, hashes: string[]): string {
  return JSON.stringify([
    block.tag ?? '',
    block.text,
    block.links.map((link) => [link.label, target(link.href)]),
    block.formatting,
    hashes,
  ]);
}

export function commonSubsequence<T>(left: T[], right: T[]): [number, number][] {
  const width = right.length + 1;
  const table = new Uint32Array((left.length + 1) * width);
  for (let i = left.length - 1; i >= 0; i--)
    for (let j = right.length - 1; j >= 0; j--)
      table[i * width + j] =
        left[i] === right[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) pairs.push([i++, j++]);
    else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
    else j++;
  }
  return pairs;
}

const words = (text: string) => text.split(/\s+/u).filter(Boolean);

/** Twice the common word subsequence over the total word count. */
export function similarity(left: string, right: string): number {
  const a = words(left);
  const b = words(right);
  if (!a.length && !b.length) return 1;
  return (2 * commonSubsequence(a, b).length) / (a.length + b.length);
}

function sourceBlock(
  id: string,
  after: ParsedBlock,
  figureIds: string[],
  before?: SourceBlock,
): SourceBlock {
  const block: SourceBlock = {
    id,
    tag: after.tag,
    text: after.text,
    numbers: after.numbers,
    figureIds,
    // Redirect links change tracking parameters on every export; keep the stored form.
    links: after.links.map((link, index) => {
      const kept = before?.links[index];
      return kept &&
        kept.label === link.label &&
        target(kept.href) === target(link.href)
        ? kept
        : link;
    }),
    formatting: after.formatting,
  };
  if (after.anchor !== undefined) block.anchor = after.anchor;
  if (after.ordered !== undefined) block.ordered = after.ordered;
  if (after.listStart !== undefined) block.listStart = after.listStart;
  if (after.level !== undefined) block.level = after.level;
  return block;
}

export function alignSnapshot(
  previous: SourceBaseline,
  parsed: ParsedExport,
  options: AlignOptions,
): Alignment {
  const oldHashes = new Map(previous.figures.map((figure) => [figure.id, figure.sha256]));
  const oldFigures = new Map(previous.figures.map((figure) => [figure.id, figure]));
  const hashesBefore = (block: SourceBlock) =>
    block.figureIds.map((id) => oldHashes.get(id) ?? '');
  const hashesAfter = (block: ParsedBlock) =>
    block.images.map((index) => parsed.images[index].sha256);
  const oldKeys = previous.blocks.map((block) => blockKey(block, hashesBefore(block)));
  const newKeys = parsed.blocks.map((block) => blockKey(block, hashesAfter(block)));

  // new index → previous index
  const pairs = new Map<number, number>();
  const unchanged = commonSubsequence(oldKeys, newKeys);
  for (const [before, after] of unchanged) pairs.set(after, before);
  const bounds: [number, number][] = [
    [-1, -1],
    ...unchanged,
    [previous.blocks.length, parsed.blocks.length],
  ];
  // Inside each gap, pair by heading anchor, image hashes or word similarity, without crossing.
  for (let gap = 1; gap < bounds.length; gap++) {
    const [oldStart, newStart] = bounds[gap - 1];
    const [oldEnd, newEnd] = bounds[gap];
    let from = newStart + 1;
    for (let o = oldStart + 1; o < oldEnd; o++) {
      const before = previous.blocks[o];
      let best = -1;
      let bestScore = 0;
      for (let n = from; n < newEnd; n++) {
        const after = parsed.blocks[n];
        const sameAnchor =
          !!before.anchor &&
          before.anchor === after.anchor &&
          /^h\d$/u.test(before.tag ?? '') &&
          /^h\d$/u.test(after.tag);
        const beforeImages = hashesBefore(before).join();
        const sameImages = !!beforeImages && beforeImages === hashesAfter(after).join();
        const score = sameAnchor || sameImages ? 1 : similarity(before.text, after.text);
        if (score >= MIN_SIMILARITY && score > bestScore) {
          best = n;
          bestScore = score;
        }
      }
      if (best >= 0) {
        pairs.set(best, o);
        from = best + 1;
      }
    }
  }

  if (pairs.size < previous.blocks.length * MIN_MATCHED && !options.force)
    throw new Error(
      `Only ${pairs.size} of ${previous.blocks.length} blocks match the last capture. If the Doc was rewritten, rerun with --force.`,
    );
  const pairedOld = new Set(pairs.values());
  previous.blocks.forEach((block, index) => {
    if (block.tag === 'h1' && CHAPTER_TITLE.test(block.text) && !pairedOld.has(index))
      throw new Error(
        `Chapter heading "${block.text}" is missing from the export; stopping before anything is written.`,
      );
  });

  let nextBlock = options.nextBlock;
  let nextFigure = options.nextFigure;
  const blocks: SourceBlock[] = [];
  const figures: SourceFigure[] = [];
  const changes: BlockChange[] = [];
  const newImages: Alignment['newImages'] = [];
  const keptFigures = new Set<string>();
  parsed.blocks.forEach((after, n) => {
    const o = pairs.get(n);
    const before = o === undefined ? undefined : previous.blocks[o];
    const id = before?.id ?? `block-${String(nextBlock++).padStart(4, '0')}`;
    const available = [...(before?.figureIds ?? [])];
    const figureIds = after.images.map((index) => {
      const image = parsed.images[index];
      const reuse = available.findIndex((figureId) => oldHashes.get(figureId) === image.sha256);
      if (reuse >= 0) {
        const [figureId] = available.splice(reuse, 1);
        keptFigures.add(figureId);
        figures.push({ ...oldFigures.get(figureId)!, sourceId: id });
        return figureId;
      }
      const figure: SourceFigure = {
        id: `figure-${String(nextFigure++).padStart(3, '0')}`,
        sourceId: id,
        sha256: image.sha256,
        src: `/images/guide/${image.sha256}.${image.extension}`,
        width: image.width,
        height: image.height,
      };
      figures.push(figure);
      newImages.push({ figure, bytes: image.bytes });
      return figure.id;
    });
    blocks.push(sourceBlock(id, after, figureIds, before));
    changes.push({
      id,
      kind: o === undefined ? 'added' : oldKeys[o] === newKeys[n] ? 'unchanged' : 'edited',
    });
  });

  return {
    baseline: { fingerprints: options.fingerprints, blocks, figures },
    changes,
    removed: previous.blocks.filter((_, index) => !pairedOld.has(index)).map((block) => block.id),
    newImages,
    removedFigures: previous.figures.filter((figure) => !keptFigures.has(figure.id)).map((figure) => figure.id),
    nextBlock,
    nextFigure,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `npm test -- tests/source-align.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Typecheck, lint, format and commit.**

Run: `npm run typecheck && npm run lint && npx prettier --write scripts/source tests/source-align.test.ts`

```bash
git add scripts/source/align.ts tests/source-align.test.ts
git commit -m "Match Doc captures to stable source block IDs"
```

---

### Task 3: Inline runs from a source block

**Files:**

- Create: `scripts/source/leaf.ts`
- Test: `tests/source-leaf.test.ts`

**Interfaces:**

- Consumes: `SourceBlock` and `LINE_BREAK` (Task 1); `Inline` from `app/content/types.ts`.
- Produces: `sourceRuns(block: SourceBlock, resolve: (href: string) => string | null): { runs: Inline[]; unresolved: string[] }`.

- [ ] **Step 1: Write the failing tests.** Create `tests/source-leaf.test.ts`:

```ts
// @vitest-environment node
import { expect, it } from 'vitest';
import { sourceRuns } from '../scripts/source/leaf.ts';
import type { SourceBlock } from '../scripts/source/model.ts';

const block = (
  text: string,
  formatting: SourceBlock['formatting'] = [],
  links: SourceBlock['links'] = [],
): SourceBlock => ({
  id: 'block-0001',
  tag: 'p',
  text,
  numbers: [],
  figureIds: [],
  links,
  formatting,
});
const same = (href: string) => href;

it('splits runs at formatting boundaries', () => {
  expect(
    sourceRuns(block('Go big now', [{ text: 'big', start: 3, end: 6, strong: true }]), same).runs,
  ).toEqual([{ text: 'Go ' }, { text: 'big', strong: true }, { text: ' now' }]);
});

it('fills a space between two runs with identical marks', () => {
  const shade = '#f8f9fa';
  expect(
    sourceRuns(
      block('a b', [
        { text: 'a', start: 0, end: 1, highlight: shade },
        { text: 'b', start: 2, end: 3, highlight: shade },
      ]),
      same,
    ).runs,
  ).toEqual([{ text: 'a b', highlight: shade }]);
});

it('turns a newline into breakAfter', () => {
  expect(sourceRuns(block('one\ntwo'), same).runs).toEqual([
    { text: 'one', breakAfter: true },
    { text: 'two' },
  ]);
});

it('links the label to its resolved target and reports unresolved links', () => {
  const resolve = (href: string) => (href === '#h.x' ? '/articles/a#block-0002' : null);
  expect(
    sourceRuns(block('See the guide', [], [{ label: 'the guide', href: '#h.x' }]), resolve).runs,
  ).toEqual([{ text: 'See ' }, { text: 'the guide', href: '/articles/a#block-0002' }]);
  expect(
    sourceRuns(block('See the guide', [], [{ label: 'the guide', href: '#h.y' }]), resolve)
      .unresolved,
  ).toEqual(['#h.y']);
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm test -- tests/source-leaf.test.ts`
Expected: FAIL. `../scripts/source/leaf.ts` does not resolve.

- [ ] **Step 3: Implement the generator.** Create `scripts/source/leaf.ts`:

```ts
import type { Inline } from '../../app/content/types';
import type { SourceBlock } from './model.ts';
import { LINE_BREAK } from './text.ts';

type Marks = Omit<Inline, 'text' | 'breakAfter'>;

const sameMarks = (a: Marks, b: Marks) =>
  a.strong === b.strong &&
  a.emphasis === b.emphasis &&
  a.underline === b.underline &&
  a.highlight === b.highlight &&
  a.href === b.href;

/** Truthy marks only, in the key order the article JSON uses. */
function run(text: string, marks: Marks): Inline {
  const result: Inline = { text };
  if (marks.strong) result.strong = true;
  if (marks.emphasis) result.emphasis = true;
  if (marks.underline) result.underline = true;
  if (marks.highlight) result.highlight = marks.highlight;
  if (marks.href) result.href = marks.href;
  return result;
}

/** Article runs for a source block: formatting, resolved links and line breaks. */
export function sourceRuns(
  block: SourceBlock,
  resolve: (href: string) => string | null,
): { runs: Inline[]; unresolved: string[] } {
  const text = block.text;
  const marks: Marks[] = Array.from({ length: text.length }, () => ({}));
  for (const formatting of block.formatting)
    for (let index = formatting.start; index < formatting.end; index++) {
      if (formatting.strong) marks[index].strong = true;
      if (formatting.emphasis) marks[index].emphasis = true;
      if (formatting.underline) marks[index].underline = true;
      if (formatting.highlight) marks[index].highlight = formatting.highlight;
    }
  const unresolved: string[] = [];
  const flat = text.split(LINE_BREAK).join(' ');
  let cursor = 0;
  for (const link of block.links) {
    const label = link.label.replace(/\s+/gu, ' ').trim();
    // Blank captured anchors belong to the neighbouring labeled link.
    if (!label) continue;
    const start = flat.indexOf(label, cursor);
    const href = start >= 0 ? resolve(link.href) : null;
    if (start < 0 || !href) {
      unresolved.push(link.href);
      continue;
    }
    cursor = start + label.length;
    for (let index = start; index < cursor; index++) marks[index].href = href;
  }
  // A space between two runs with identical marks joins them.
  const isGap = (character: string) => character === ' ' || character === LINE_BREAK;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== ' ') continue;
    let before = index - 1;
    while (before >= 0 && isGap(text[before])) before--;
    let after = index + 1;
    while (after < text.length && isGap(text[after])) after++;
    if (before >= 0 && after < text.length && sameMarks(marks[before], marks[after]))
      marks[index] = { ...marks[before] };
  }
  const runs: Inline[] = [];
  let current: Inline | undefined;
  for (let index = 0; index < text.length; index++) {
    if (text[index] === LINE_BREAK) {
      if (current) current.breakAfter = true;
      current = undefined;
      continue;
    }
    if (current && sameMarks(current, marks[index])) current.text += text[index];
    else {
      current = run(text[index], marks[index]);
      runs.push(current);
    }
  }
  return { runs, unresolved };
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `npm test -- tests/source-leaf.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the generator gate against today's articles.** Create `.local-tools/sync-gates/generator.ts`:

```ts
// One-time gate: regenerating every one-to-one leaf from today's baseline must render the same characters.
import { walkBlocks } from '../../app/content/reader.ts';
import type { Inline } from '../../app/content/types';
import { createDestinations, pagePath } from '../../scripts/content-destinations.ts';
import { loadCompleteGuide } from '../../scripts/guide-data.ts';
import { sourceRuns } from '../../scripts/source/leaf.ts';

const guide = await loadCompleteGuide();
const sources = new Map(guide.baseline.blocks.map((block) => [block.id, block]));
const anchors = new Map(
  guide.pages.map((page) => [pagePath(page), new Set(walkBlocks(page.blocks).map((block) => block.id))]),
);
const destinations = createDestinations(guide.baseline, guide.pages, guide.coverage, anchors, {});
const carriers = new Map<string, number>();
for (const page of guide.pages)
  for (const block of walkBlocks(page.blocks))
    for (const id of block.sourceIds) carriers.set(id, (carriers.get(id) ?? 0) + 1);
const signature = (runs: Inline[], canonical: (href: string) => string | null) =>
  runs.flatMap((run) =>
    [...run.text]
      .filter((character) => !/\s/u.test(character))
      .map((character) =>
        JSON.stringify([character, !!run.strong, !!run.emphasis, !!run.underline, run.highlight ?? '', run.href ? canonical(run.href) : '']),
      ),
  );
let checked = 0;
const differences: string[] = [];
for (const page of guide.pages)
  for (const block of walkBlocks(page.blocks)) {
    if (block.kind !== 'paragraph' && block.kind !== 'heading') continue;
    const [id] = block.sourceIds;
    if (block.sourceIds.length !== 1 || carriers.get(id) !== 1) continue;
    checked++;
    const { runs, unresolved } = sourceRuns(sources.get(id)!, (href) => destinations.canonical(href, page, true));
    const canonical = (href: string) => destinations.canonical(href, page, false);
    if (signature(runs, canonical).join() !== signature(block.content, canonical).join() || unresolved.length)
      differences.push(`${page.slug}/${block.id}${unresolved.length ? ` unresolved ${unresolved.join(' ')}` : ''}`);
  }
console.log(`checked ${checked} one-to-one leaves; ${differences.length} differ`);
for (const difference of differences) console.log(`  ${difference}`);
```

Run from the repository root: `node .local-tools/sync-gates/generator.ts`
Expected: `checked 865 one-to-one leaves; 0 differ`.

Every difference is either a generator bug, fixed with a failing test in `tests/source-leaf.test.ts` first, or an editorial choice in today's leaf. Record each editorial choice in the ledger as a `Ruling:`.

- [ ] **Step 6: Typecheck, lint, format and commit.**

Run: `npm run typecheck && npm run lint && npx prettier --write scripts/source tests/source-leaf.test.ts`

```bash
git add scripts/source/leaf.ts tests/source-leaf.test.ts
git commit -m "Generate article runs from source blocks"
```

---

### Task 4: Reconciler

**Files:**

- Modify: `scripts/content-integrity.ts` (export `isLayoutOnly`; no other change)
- Create: `scripts/source/captures.ts`, `scripts/source/reconcile.ts`, `tests/fixtures/source-sync.ts`
- Test: `tests/source-reconcile.test.ts`

**Interfaces:**

- Consumes:
  - `Alignment` and `alignSnapshot` (Task 2);
  - `sourceRuns` (Task 3);
  - `ContentSet`, `TaxonomyEntry` and `SourceBlock` (Task 1);
  - `createDestinations` and `pagePath` from `scripts/content-destinations.ts`;
  - `isLayoutOnly` from `scripts/content-integrity.ts`;
  - `walkBlocks` from `app/content/reader.ts`.
- Produces:
  - `reconcile(current: ContentSet, alignment: Alignment): Reconciliation`
  - `type Flag = { sourceId: string; pageSlug: string | null; reason: string }`
  - `type Touch = { kind: 'edited' | 'added' | 'removed'; sourceId: string; pageSlug: string | null; before?: string; after?: string }`
  - `type Reconciliation = { content: ContentSet; flags: Flag[]; reviews: Flag[]; touched: Touch[] }`
  - `EMPTY_REASON` and `DIVIDER_REASON`
  - From `captures.ts`: `sha256(value: string | Uint8Array): string`, `baselineDigest(baseline: SourceBaseline): string` and `updateNote(blocks: { text: string }[]): string | null`
  - The test fixture: `exportHtml(body: string): string`, `FIRST: string`, `fixtureContent(): ContentSet`, `alignFixture(content: ContentSet, body: string, force?: boolean): Alignment` and `guideInput(content: ContentSet): GuideValidationInput`

- [ ] **Step 1: Export the validator's layout rule.** In `scripts/content-integrity.ts`, change `function isLayoutOnly(` to `export function isLayoutOnly(`.

- [ ] **Step 2: Add the capture helpers.** Create `scripts/source/captures.ts`:

```ts
import { createHash } from 'node:crypto';
import type { SourceBaseline } from '../../app/content/types';

export const sha256 = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

/** Recorded per capture; a hand edit to baseline.json no longer matches it. */
export const baselineDigest = (baseline: SourceBaseline): string =>
  sha256(JSON.stringify(baseline));

/** The author's own latest update line, for the report and capture log. */
export const updateNote = (blocks: { text: string }[]): string | null =>
  blocks.find((block) => /update note/iu.test(block.text))?.text ?? null;
```

- [ ] **Step 3: Add the shared fixture.** Create `tests/fixtures/source-sync.ts`:

```ts
import type { GuideValidationInput } from '../../scripts/content-integrity.ts';
import { alignSnapshot, type Alignment } from '../../scripts/source/align.ts';
import { baselineDigest } from '../../scripts/source/captures.ts';
import type { ContentSet } from '../../scripts/source/model.ts';
import { parseExport } from '../../scripts/source/parse.ts';
import type { Block } from '../../app/content/types';

export const exportHtml = (body: string) =>
  `<html><head><style>.b{font-weight:700}</style></head><body>${body}</body></html>`;

/** block-0001..0008: two overview paragraphs, a chapter title, a heading, a paragraph, two list items, a spacer. */
export const FIRST =
  '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1>' +
  '<h2 id="h.intro">Intro</h2><p>Alpha has 10 points.</p>' +
  '<ul class="lst-kix_a-0"><li>First item</li><li>Second item</li></ul><p></p>';

const leaf = (id: string, text: string): Block => ({
  id,
  sourceIds: [id],
  kind: 'paragraph',
  content: [{ text }],
});
const rendered = (id: string, pageSlug: string) => ({
  sourceId: id,
  disposition: 'rendered' as const,
  primary: { pageSlug, blockIds: [id] },
});

export function fixtureContent(): ContentSet {
  const baseline = alignSnapshot(
    { fingerprints: { html: '' }, blocks: [], figures: [] },
    parseExport(exportHtml(FIRST)),
    { fingerprints: { html: 'first' }, nextBlock: 1, nextFigure: 1 },
  ).baseline;
  const sourceUrl = 'https://docs.google.com/document/d/doc/edit';
  return {
    baseline,
    overview: {
      slug: 'about',
      title: 'About',
      category: null,
      summary: 'About summary',
      status: 'source-backed',
      sourceUrl,
      blocks: [leaf('block-0001', 'About text'), leaf('block-0002', 'More about text')],
    },
    chapters: [
      {
        file: 'chapter-01.json',
        pages: [
          {
            slug: 'basics',
            title: 'Basics',
            category: 'basics',
            summary: 'Basics summary',
            status: 'source-backed',
            sourceUrl,
            blocks: [
              { id: 'block-0004', sourceIds: ['block-0004'], kind: 'heading', level: 2, content: [{ text: 'Intro' }] },
              leaf('block-0005', 'Alpha has 10 points.'),
              {
                id: 'list-1',
                sourceIds: [],
                kind: 'list',
                ordered: false,
                items: [[leaf('block-0006', 'First item')], [leaf('block-0007', 'Second item')]],
              },
            ],
          },
        ],
      },
    ],
    coverage: [
      {
        file: 'group-a.json',
        entries: [
          rendered('block-0001', 'about'),
          rendered('block-0002', 'about'),
          {
            sourceId: 'block-0003',
            disposition: 'omitted',
            omission: 'chapter-title',
            pageSlug: 'basics',
            reason: 'Google Docs chapter title; the article header shows the chapter.',
          },
          rendered('block-0004', 'basics'),
          rendered('block-0005', 'basics'),
          rendered('block-0006', 'basics'),
          rendered('block-0007', 'basics'),
          { sourceId: 'block-0008', disposition: 'layout-only', reason: 'Empty document spacing is normalized by article layout.' },
        ],
      },
    ],
    figures: [{ file: 'group-a.json', entries: [] }],
    taxonomy: [
      { slug: 'about', chapter: 0, title: 'About', firstBlock: 'block-0001', lastBlock: 'block-0002', nonemptyBlocks: 2, figures: [] },
      { slug: 'basics', chapter: 1, title: 'Basics', firstBlock: 'block-0003', lastBlock: 'block-0008', nonemptyBlocks: 5, figures: [] },
    ],
    captures: [
      {
        capturedAt: '2026-01-01T00:00:00.000Z',
        fingerprints: { html: 'first' },
        updateNote: null,
        blocks: 8,
        figures: 0,
        nextBlock: 9,
        nextFigure: 1,
        report: null,
        baselineDigest: baselineDigest(baseline),
      },
    ],
  };
}

export function alignFixture(content: ContentSet, body: string, force = false): Alignment {
  const last = content.captures.at(-1)!;
  return alignSnapshot(content.baseline, parseExport(exportHtml(body)), {
    fingerprints: { html: 'next' },
    nextBlock: last.nextBlock,
    nextFigure: last.nextFigure,
    force,
  });
}

export const guideInput = (content: ContentSet): GuideValidationInput => ({
  baseline: content.baseline,
  pages: [content.overview, ...content.chapters.flatMap((file) => file.pages)],
  figures: content.figures.flatMap((file) => file.entries),
  coverage: content.coverage.flatMap((file) => file.entries),
});
```

- [ ] **Step 4: Write the failing tests.** Create `tests/source-reconcile.test.ts`:

```ts
// @vitest-environment node
import { expect, it } from 'vitest';
import { walkBlocks } from '../app/content/reader';
import type { Block } from '../app/content/types';
import { validateGuide } from '../scripts/content-integrity.ts';
import type { ContentSet } from '../scripts/source/model.ts';
import { reconcile } from '../scripts/source/reconcile.ts';
import { alignFixture, fixtureContent, guideInput } from './fixtures/source-sync.ts';

const HEAD = '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2>';
const LIST = '<ul class="lst-kix_a-0"><li>First item</li><li>Second item</li></ul><p></p>';
const basics = (content: ContentSet) => content.chapters[0].pages[0];
const texts = (blocks: Block[]) =>
  walkBlocks(blocks).flatMap((block) =>
    block.kind === 'paragraph' || block.kind === 'heading'
      ? [block.content.map((run) => run.text).join('')]
      : [],
  );
const run = (content: ContentSet, body: string) => reconcile(content, alignFixture(content, body));

it('starts from a valid fixture', () => {
  expect(validateGuide(guideInput(fixtureContent()))).toEqual([]);
});

it('applies an edit, an insert and a removal and stays valid', () => {
  const result = run(
    fixtureContent(),
    HEAD +
      '<p>Alpha has <span class="b">12</span> points.</p><p>Beta arrives.</p>' +
      '<ul class="lst-kix_a-0"><li>First item</li></ul><p></p>',
  );
  expect(result.flags).toEqual([]);
  expect(texts(basics(result.content).blocks)).toEqual(['Intro', 'Alpha has 12 points.', 'Beta arrives.', 'First item']);
  expect(result.touched.map(({ kind, sourceId }) => `${kind}:${sourceId}`)).toEqual([
    'removed:block-0007',
    'edited:block-0005',
    'added:block-0009',
  ]);
  expect(result.content.taxonomy[1]).toMatchObject({ lastBlock: 'block-0008', nonemptyBlocks: 5 });
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('keeps two new paragraphs in order', () => {
  const result = run(
    fixtureContent(),
    HEAD + '<p>Alpha has 10 points.</p><p>Beta arrives.</p><p>Gamma follows.</p>' + LIST,
  );
  expect(texts(basics(result.content).blocks).slice(1, 4)).toEqual([
    'Alpha has 10 points.',
    'Beta arrives.',
    'Gamma follows.',
  ]);
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('places a new list item after its predecessor at the same level', () => {
  const result = run(
    fixtureContent(),
    HEAD + '<p>Alpha has 10 points.</p><ul class="lst-kix_a-0"><li>First item</li><li>Between items</li><li>Second item</li></ul><p></p>',
  );
  expect(texts(basics(result.content).blocks).slice(2)).toEqual(['First item', 'Between items', 'Second item']);
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('moves an article boundary when its first block leaves', () => {
  const result = run(fixtureContent(), '<p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2><p>Alpha has 10 points.</p>' + LIST);
  expect(result.content.taxonomy[0]).toMatchObject({ firstBlock: 'block-0002', lastBlock: 'block-0002', nonemptyBlocks: 1 });
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('resolves a link to a Doc heading inside an edited paragraph', () => {
  const result = run(fixtureContent(), HEAD + '<p>Alpha has 10 points. See <a href="#h.intro">Intro</a>.</p>' + LIST);
  const alpha = walkBlocks(basics(result.content).blocks).find((block) => block.id === 'block-0005');
  expect(alpha?.kind === 'paragraph' && alpha.content).toContainEqual({ text: 'Intro', href: '/articles/basics#block-0004' });
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('flags what it cannot place and leaves the check failing', () => {
  const content = fixtureContent();
  basics(content).blocks[1] = {
    id: 'block-0005',
    sourceIds: ['block-0005'],
    kind: 'note',
    label: 'Note',
    tone: 'context',
    content: [{ text: 'Alpha has 10 points.' }],
  };
  const result = run(
    content,
    '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><p>New opener</p><h2 id="h.intro">Intro</h2>' +
      '<p>Alpha has 11 points.</p><ul class="lst-kix_a-0"><li>First item</li></ul>' +
      '<ul class="lst-kix_a-1"><li>Nested item</li></ul><ul class="lst-kix_a-0"><li>Second item</li></ul><p></p>',
  );
  expect(result.flags.map(({ sourceId, reason }) => `${sourceId}: ${reason}`)).toEqual([
    'block-0009: A new block at the start of an article; place it by hand',
    'block-0005: Edited, but its text sits in a formula, note or group; update it by hand',
    'block-0010: A new list item that starts a list or changes level; place it by hand',
  ]);
  const errors = validateGuide(guideInput(result.content));
  expect(errors).toContain('block-0009: missing coverage');
  expect(errors).toContain('block-0010: missing coverage');
  expect(errors.some((error) => error.startsWith('block-0005: source text missing or changed'))).toBe(true);
});
```

- [ ] **Step 5: Run the tests to verify they fail.**

Run: `npm test -- tests/source-reconcile.test.ts`
Expected: FAIL. `../scripts/source/reconcile.ts` does not resolve.

- [ ] **Step 6: Implement the reconciler.** Create `scripts/source/reconcile.ts`:

```ts
import { walkBlocks } from '../../app/content/reader.ts';
import type { Block, CoverageEntry, Figure, GuidePage } from '../../app/content/types';
import { createDestinations, pagePath } from '../content-destinations.ts';
import { isLayoutOnly } from '../content-integrity.ts';
import type { Alignment } from './align.ts';
import { sourceRuns } from './leaf.ts';
import type { ContentSet, SourceBlock, TaxonomyEntry } from './model.ts';

export type Flag = { sourceId: string; pageSlug: string | null; reason: string };
export type Touch = {
  kind: 'edited' | 'added' | 'removed';
  sourceId: string;
  pageSlug: string | null;
  before?: string;
  after?: string;
};
export type Reconciliation = {
  content: ContentSet;
  /** Changes left for a person; each one keeps `npm run check` failing until resolved. */
  flags: Flag[];
  /** Applied changes an editor should look at. */
  reviews: Flag[];
  touched: Touch[];
};

export const EMPTY_REASON = 'Empty document spacing is normalized by article layout.';
export const DIVIDER_REASON = 'Google Docs divider line; article spacing separates sections.';

type Slot = { block: Block; container: Block[]; index: number };
type Location = Slot & { page: GuidePage; ancestors: Slot[] };
type LeafKind = 'paragraph' | 'heading' | 'figure';

function locate(pages: GuidePage[]): Map<string, Location[]> {
  const result = new Map<string, Location[]>();
  const visit = (page: GuidePage, container: Block[], ancestors: Slot[]) =>
    container.forEach((block, index) => {
      const slot = { block, container, index };
      for (const id of block.sourceIds)
        result.set(id, [...(result.get(id) ?? []), { ...slot, page, ancestors }]);
      const inner = [...ancestors, slot];
      if (block.kind === 'list') block.items.forEach((item) => visit(page, item, inner));
      else if (block.kind === 'group') visit(page, block.blocks, inner);
      else if (block.kind === 'table')
        block.rows.forEach((row) => row.forEach((cell) => visit(page, cell, inner)));
    });
  pages.forEach((page) => visit(page, page.blocks, []));
  return result;
}

function leafKind(block: SourceBlock): LeafKind | null {
  if (block.figureIds.length)
    return block.figureIds.length === 1 && !block.text.trim() ? 'figure' : null;
  if (block.tag === 'p' || block.tag === 'li') return 'paragraph';
  if (block.tag === 'h2' || block.tag === 'h3' || block.tag === 'h4') return 'heading';
  return null;
}

function newLeaf(block: SourceBlock, kind: LeafKind): Block {
  const base = { id: block.id, sourceIds: [block.id] };
  if (kind === 'figure') return { ...base, kind, figureId: block.figureIds[0] };
  if (kind === 'heading')
    return { ...base, kind, level: Number(block.tag!.slice(1)) as 2 | 3 | 4, content: [] };
  return { ...base, kind, content: [] };
}

export function reconcile(current: ContentSet, alignment: Alignment): Reconciliation {
  const content = structuredClone(current);
  content.baseline = alignment.baseline;
  const flags: Flag[] = [];
  const reviews: Flag[] = [];
  const touched: Touch[] = [];
  const pending: { leaf: Block; sourceId: string; page: GuidePage }[] = [];
  const snapshot = alignment.baseline.blocks;
  const previous = new Map(current.baseline.blocks.map((block) => [block.id, block]));
  const next = new Map(snapshot.map((block) => [block.id, block]));
  const order = new Map(snapshot.map((block, index) => [block.id, index]));
  const pages = [content.overview, ...content.chapters.flatMap((file) => file.pages)];
  const pageBySlug = new Map(pages.map((page) => [page.slug, page]));
  const flag = (sourceId: string, pageSlug: string | null, reason: string) => {
    flags.push({ sourceId, pageSlug, reason });
  };
  const review = (sourceId: string, pageSlug: string | null, reason: string) => {
    reviews.push({ sourceId, pageSlug, reason });
  };

  const entryOf = (id: string) => {
    for (const file of content.coverage) {
      const index = file.entries.findIndex((entry) => entry.sourceId === id);
      if (index >= 0) return { entries: file.entries, index, entry: file.entries[index] };
    }
    return null;
  };
  /** Coverage stays in snapshot order: a new entry follows the previous block's entry. */
  const insertEntry = (entry: CoverageEntry) => {
    for (let index = order.get(entry.sourceId)! - 1; index >= 0; index--) {
      const found = entryOf(snapshot[index].id);
      if (found) {
        found.entries.splice(found.index + 1, 0, entry);
        return;
      }
    }
    content.coverage[0].entries.unshift(entry);
  };
  const insertFigure = (figureId: string) => {
    const figures = alignment.baseline.figures;
    const position = figures.findIndex((figure) => figure.id === figureId);
    const entry: Figure = { ...figures[position], alt: '' };
    for (let index = position - 1; index >= 0; index--)
      for (const file of content.figures) {
        const found = file.entries.findIndex((figure) => figure.id === figures[index].id);
        if (found >= 0) {
          file.entries.splice(found + 1, 0, entry);
          return;
        }
      }
    content.figures[0].entries.unshift(entry);
  };
  const removeFigure = (figureId: string) => {
    for (const file of content.figures)
      file.entries = file.entries.filter((figure) => figure.id !== figureId);
  };
  const sole = (id: string, kinds: LeafKind[]) => {
    const found = locate(pages).get(id) ?? [];
    const [location] = found;
    return found.length === 1 &&
      location.block.sourceIds.length === 1 &&
      (kinds as string[]).includes(location.block.kind)
      ? location
      : null;
  };
  const removeSlot = (location: Location) => {
    location.container.splice(location.index, 1);
    const parent = location.ancestors.at(-1);
    if (parent?.block.kind === 'list' && !location.container.length) {
      parent.block.items = parent.block.items.filter((item) => item !== location.container);
      if (!parent.block.items.length) parent.container.splice(parent.index, 1);
    }
  };

  // 1. An article whose first block left starts at its next surviving block.
  const removed = new Set(alignment.removed);
  const previousOrder = new Map(current.baseline.blocks.map((block, index) => [block.id, index]));
  for (const entry of content.taxonomy) {
    if (!removed.has(entry.firstBlock)) continue;
    const range = current.baseline.blocks.slice(
      previousOrder.get(entry.firstBlock)!,
      previousOrder.get(entry.lastBlock)! + 1,
    );
    const survivor = range.find((block) => !removed.has(block.id));
    if (survivor) entry.firstBlock = survivor.id;
    else flag(entry.firstBlock, entry.slug, 'Every block of this article left the Doc; retire or merge the article by hand');
  }

  // 2. Removed blocks.
  for (const id of alignment.removed) {
    const before = previous.get(id)!;
    const found = entryOf(id);
    const locations = locate(pages).get(id) ?? [];
    const slug = found?.entry.primary?.pageSlug ?? found?.entry.pageSlug ?? locations[0]?.page.slug ?? null;
    if (!locations.length) {
      // Nothing rendered it, or an interrupted run already removed its leaf.
      if (found) found.entries.splice(found.index, 1);
      continue;
    }
    const leaf = sole(id, ['paragraph', 'heading', 'figure']);
    if (!found || found.entry.disposition !== 'rendered' || !leaf) {
      flag(id, slug, 'Removed from the Doc, but its article leaf has another shape; remove it by hand');
      continue;
    }
    removeSlot(leaf);
    found.entries.splice(found.index, 1);
    before.figureIds.forEach(removeFigure);
    touched.push({ kind: 'removed', sourceId: id, pageSlug: slug, before: before.text });
  }

  // 3. Articles own their blocks by snapshot position; new blocks join the article before them.
  const pageOf = new Map<string, string>();
  const starts = new Map(content.taxonomy.map((entry) => [entry.firstBlock, entry]));
  let article: TaxonomyEntry | undefined;
  for (const block of snapshot) {
    article = starts.get(block.id) ?? article;
    if (!article) {
      flag(block.id, null, 'Comes before the first article; place it by hand');
      continue;
    }
    pageOf.set(block.id, article.slug);
    article.lastBlock = block.id;
  }

  const add = (id: string): void => {
    const block = next.get(id)!;
    const slug = pageOf.get(id);
    if (!slug) return;
    const existing = locate(pages).get(id);
    if (existing?.length) {
      // An interrupted run already placed it.
      if (!entryOf(id))
        insertEntry({ sourceId: id, disposition: 'rendered', primary: { pageSlug: existing[0].page.slug, blockIds: [id] } });
      return;
    }
    if (isLayoutOnly(block)) {
      insertEntry({ sourceId: id, disposition: 'layout-only', reason: block.text ? DIVIDER_REASON : EMPTY_REASON });
      return;
    }
    const kind = leafKind(block);
    if (!kind) return flag(id, slug, 'A new h1, h5, h6, table, image group or image with text; place it by hand');
    let predecessor: SourceBlock | undefined;
    for (let index = order.get(id)! - 1; index >= 0; index--) {
      const candidate = snapshot[index];
      if (pageOf.get(candidate.id) !== slug) break;
      if (entryOf(candidate.id)?.entry.disposition === 'rendered') {
        predecessor = candidate;
        break;
      }
    }
    if (!predecessor) return flag(id, slug, 'A new block at the start of an article; place it by hand');
    const anchor = sole(predecessor.id, ['paragraph', 'heading', 'figure']);
    if (!anchor) return flag(id, slug, `The block before it (${predecessor.id}) is not a single leaf; place it by hand`);
    if (anchor.ancestors.some((slot) => slot.block.kind === 'table'))
      return flag(id, slug, 'The block before it sits in a table; place it by hand');
    const leaf = newLeaf(block, kind);
    if (block.tag === 'li') {
      const list = anchor.ancestors.at(-1)?.block;
      const items = list?.kind === 'list' ? list.items : undefined;
      const item = items ? items.indexOf(anchor.container) : -1;
      if (!items || item < 0 || predecessor.tag !== 'li' || predecessor.level !== block.level)
        return flag(id, slug, 'A new list item that starts a list or changes level; place it by hand');
      items.splice(item + 1, 0, [leaf]);
    } else {
      const outer = predecessor.tag === 'li' ? anchor.ancestors.find((slot) => slot.block.kind === 'list') : undefined;
      const target = outer ?? anchor;
      target.container.splice(target.index + 1, 0, leaf);
    }
    insertEntry({ sourceId: id, disposition: 'rendered', primary: { pageSlug: slug, blockIds: [id] } });
    if (leaf.kind === 'figure') insertFigure(leaf.figureId);
    else pending.push({ leaf, sourceId: id, page: pageBySlug.get(slug)! });
    touched.push({ kind: 'added', sourceId: id, pageSlug: slug, after: block.text });
    if (leaf.kind === 'heading') review(id, slug, 'A new heading; decide whether it starts a new article');
  };

  const edit = (id: string): void => {
    const before = previous.get(id)!;
    const after = next.get(id)!;
    const found = entryOf(id);
    if (!found) return add(id);
    const { entry } = found;
    if (entry.disposition === 'omitted') {
      review(
        id,
        entry.pageSlug ?? null,
        entry.omission === 'chapter-title'
          ? 'A chapter heading changed; check the chapter name in category-contract.json'
          : 'A Google Docs leftover changed; check it still fits its omission',
      );
      return;
    }
    if (entry.disposition === 'layout-only') {
      if (isLayoutOnly(after)) return;
      found.entries.splice(found.index, 1);
      return add(id);
    }
    const pageSlug = entry.primary!.pageSlug;
    if (isLayoutOnly(after)) {
      const leaf = sole(id, ['paragraph', 'heading']);
      if (!leaf) return flag(id, pageSlug, 'Now empty, but its article leaf has another shape; remove it by hand');
      removeSlot(leaf);
      found.entries[found.index] = { sourceId: id, disposition: 'layout-only', reason: after.text ? DIVIDER_REASON : EMPTY_REASON };
      touched.push({ kind: 'removed', sourceId: id, pageSlug, before: before.text });
      return;
    }
    if (before.tag !== after.tag)
      return flag(id, pageSlug, `Changed from ${before.tag} to ${after.tag}; update the leaf by hand`);
    if (before.figureIds.join() !== after.figureIds.join())
      return flag(id, pageSlug, 'Its images changed; update the figures by hand');
    if (entry.strayText) return flag(id, pageSlug, 'Edited next to a figure with stray-text handling; update it by hand');
    const leaf = sole(id, ['paragraph', 'heading']);
    if (!leaf) return flag(id, pageSlug, 'Edited, but its text sits in a formula, note or group; update it by hand');
    pending.push({ leaf: leaf.block, sourceId: id, page: leaf.page });
    touched.push({ kind: 'edited', sourceId: id, pageSlug, before: before.text, after: after.text });
    if (content.taxonomy.some((range) => range.firstBlock === id))
      review(id, pageSlug, 'Edited the heading that opens this article; check the article title');
    if (before.anchor !== after.anchor)
      review(id, pageSlug, 'Its Google anchor changed; check links from other sections');
  };

  // 4. Edits and additions in snapshot order, so consecutive new blocks chain.
  for (const { id, kind } of alignment.changes) {
    if (kind === 'edited') edit(id);
    else if (kind === 'added') add(id);
  }

  // 5. Runs last, once every destination exists.
  const anchors = new Map(pages.map((page) => [pagePath(page), new Set(walkBlocks(page.blocks).map((block) => block.id))]));
  const destinations = createDestinations(
    alignment.baseline,
    pages,
    content.coverage.flatMap((file) => file.entries),
    anchors,
    {},
  );
  for (const { leaf, sourceId, page } of pending) {
    if (leaf.kind !== 'paragraph' && leaf.kind !== 'heading') continue;
    const { runs, unresolved } = sourceRuns(next.get(sourceId)!, (href) => destinations.canonical(href, page, true));
    leaf.content = runs;
    for (const href of unresolved) flag(sourceId, page.slug, `Link target not found: ${href}`);
  }

  // 6. Derived taxonomy counts.
  for (const entry of content.taxonomy) {
    const blocks = snapshot.filter((block) => pageOf.get(block.id) === entry.slug);
    if (!blocks.length) continue;
    entry.nonemptyBlocks = blocks.filter((block) => block.text || block.figureIds.length).length;
    entry.figures = blocks.flatMap((block) => block.figureIds);
  }
  return { content, flags, reviews, touched };
}
```

- [ ] **Step 7: Run the tests to verify they pass.**

Run: `npm test -- tests/source-reconcile.test.ts`
Expected: PASS, 7 tests.

If the flags test's order differs, compare it against the processing order before touching the implementation. Pages are assigned first, then edits and additions run in snapshot order. block-0009 ("New opener") comes before block-0005 in the snapshot.

- [ ] **Step 8: Run the related suites, typecheck, lint, format and commit.**

Run: `npm test -- tests/source- tests/content-integrity.test.ts && npm run typecheck && npm run lint && npx prettier --write scripts/source tests/fixtures/source-sync.ts tests/source-reconcile.test.ts`
Expected: all pass.

```bash
git add scripts/content-integrity.ts scripts/source/captures.ts scripts/source/reconcile.ts tests/fixtures/source-sync.ts tests/source-reconcile.test.ts
git commit -m "Apply one-to-one Doc changes to the articles"
```

---

### Task 5: Change report

**Files:**

- Create: `scripts/source/report.ts`
- Test: `tests/source-report.test.ts`

**Interfaces:**

- Consumes: `Alignment` (Task 2), `Reconciliation` (Task 4), `Capture` (Task 1) and `updateNote` (Task 4).
- Produces: `renderReport(input: { capture: Capture; alignment: Alignment; result: Reconciliation; titles: Map<string, string> }): string`. The output is Markdown, which the sync formats with Prettier.

- [ ] **Step 1: Write the failing test.** Create `tests/source-report.test.ts`:

```ts
// @vitest-environment node
import { expect, it } from 'vitest';
import { updateNote } from '../scripts/source/captures.ts';
import { reconcile } from '../scripts/source/reconcile.ts';
import { renderReport } from '../scripts/source/report.ts';
import { alignFixture, fixtureContent } from './fixtures/source-sync.ts';

const capture = {
  capturedAt: '2026-10-07T12:00:00.000Z',
  fingerprints: { html: 'next' },
  updateNote: 'Update Note 10/6: new values',
  blocks: 9,
  figures: 0,
  nextBlock: 10,
  nextFigure: 1,
  report: 'content/source/changes/2026-10-07.md',
  baselineDigest: 'digest',
};

it('finds the author update note', () => {
  expect(updateNote([{ text: 'Intro' }, { text: '***Update Note 9/20: x' }])).toBe('***Update Note 9/20: x');
  expect(updateNote([{ text: 'Intro' }])).toBeNull();
});

it('summarizes counts, flags and per-article changes', () => {
  const content = fixtureContent();
  const alignment = alignFixture(
    content,
    '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><p>New opener</p><h2 id="h.intro">Intro</h2>' +
      '<p>Alpha has 12 points.</p><ul class="lst-kix_a-0"><li>First item</li><li>Second item</li></ul><p></p>',
  );
  const report = renderReport({
    capture,
    alignment,
    result: reconcile(content, alignment),
    titles: new Map([['about', 'About'], ['basics', 'Basics']]),
  });
  expect(report).toContain('# Google Doc sync 2026-10-07');
  expect(report).toContain('Update Note 10/6: new values');
  expect(report).toContain('| Edited | 1 |');
  expect(report).toContain('| Added | 1 |');
  expect(report).toContain('- `block-0009` in Basics: A new block at the start of an article; place it by hand');
  expect(report).toContain('### Basics');
  expect(report).toContain('- **Edited** `block-0005`: “Alpha has 10 points.” → “Alpha has 12 points.”');
});

it('says so when nothing needs attention', () => {
  const content = fixtureContent();
  const alignment = alignFixture(
    content,
    '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2>' +
      '<p>Alpha has 10 points.</p><ul class="lst-kix_a-0"><li>First item</li><li>Second item</li></ul><p></p>',
  );
  const report = renderReport({ capture, alignment, result: reconcile(content, alignment), titles: new Map() });
  expect(report).toContain('Nothing. `npm run check` should pass.');
  expect(report).toContain('No block changes.');
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- tests/source-report.test.ts`
Expected: FAIL. `../scripts/source/report.ts` does not resolve.

- [ ] **Step 3: Implement the report.** Create `scripts/source/report.ts`:

```ts
import type { Alignment } from './align.ts';
import type { Capture } from './model.ts';
import type { Flag, Reconciliation } from './reconcile.ts';

const quote = (text = '') => `“${text.replace(/\s*\n\s*/gu, ' / ')}”`;

export function renderReport({
  capture,
  alignment,
  result,
  titles,
}: {
  capture: Capture;
  alignment: Alignment;
  result: Reconciliation;
  titles: Map<string, string>;
}): string {
  const title = (slug: string | null) => (slug ? (titles.get(slug) ?? slug) : 'no article');
  const count = (kind: string) => alignment.changes.filter((change) => change.kind === kind).length;
  const items = (list: Flag[], empty: string) =>
    list.length
      ? list.map(({ sourceId, pageSlug, reason }) => `- \`${sourceId}\` in ${title(pageSlug)}: ${reason}`)
      : [empty];
  const lines = [
    `# Google Doc sync ${capture.capturedAt.slice(0, 10)}`,
    '',
    `Captured ${capture.capturedAt}. Latest update note: ${capture.updateNote ? quote(capture.updateNote) : 'none found'}.`,
    '',
    '| Change | Count |',
    '| --- | ---: |',
    `| Unchanged | ${count('unchanged')} |`,
    `| Edited | ${count('edited')} |`,
    `| Added | ${count('added')} |`,
    `| Removed | ${alignment.removed.length} |`,
    `| New images | ${alignment.newImages.length} |`,
    `| Removed images | ${alignment.removedFigures.length} |`,
    '',
    '## Needs attention',
    '',
    ...items(result.flags, 'Nothing. `npm run check` should pass.'),
    '',
    '## Review',
    '',
    ...items(result.reviews, 'Nothing.'),
    '',
    '## Changes by article',
    '',
  ];
  const slugs = [...new Set(result.touched.map((touch) => touch.pageSlug))];
  if (!slugs.length) lines.push('No block changes.');
  for (const slug of slugs) {
    lines.push(`### ${title(slug)}`, '');
    for (const touch of result.touched.filter((item) => item.pageSlug === slug)) {
      if (touch.kind === 'edited')
        lines.push(`- **Edited** \`${touch.sourceId}\`: ${quote(touch.before)} → ${quote(touch.after)}`);
      else if (touch.kind === 'added') lines.push(`- **Added** \`${touch.sourceId}\`: ${quote(touch.after)}`);
      else lines.push(`- **Removed** \`${touch.sourceId}\`: ${quote(touch.before)}`);
    }
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `npm test -- tests/source-report.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Typecheck, lint, format and commit.**

Run: `npm run typecheck && npm run lint && npx prettier --write scripts/source/report.ts tests/source-report.test.ts`

```bash
git add scripts/source/report.ts tests/source-report.test.ts
git commit -m "Report Doc changes per article"
```

---

### Task 6: Sync command

**Files:**

- Create: `scripts/source/sync.ts`, `scripts/source-sync.ts`
- Modify: `package.json` (the `scripts` block)
- Test: `tests/source-sync.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–5.
- Produces:
  - `runSync(options: SyncOptions): Promise<SyncResult>`
  - `loadContent(root: string): Promise<ContentSet>`
  - `uncommittedContent(root: string): string[]`
  - `EXPORT_URL`
  - `type SyncOptions = { root: string; dryRun?: boolean; from?: string; force?: boolean; allowDirty?: boolean; now?: Date; download?: () => Promise<Uint8Array>; log?: (line: string) => void }`
  - `type SyncResult = { changed: boolean; flags: number; reportPath: string | null }`

- [ ] **Step 1: Write the failing tests.** Create `tests/source-sync.test.ts`:

```ts
// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { validateGuide } from '../scripts/content-integrity.ts';
import { baselineDigest } from '../scripts/source/captures.ts';
import type { ContentSet } from '../scripts/source/model.ts';
import { loadContent, runSync } from '../scripts/source/sync.ts';
import { exportHtml, fixtureContent, guideInput } from './fixtures/source-sync.ts';

const SECOND =
  '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2>' +
  '<p>Alpha has 12 points.</p><p>Beta arrives.</p><ul class="lst-kix_a-0"><li>First item</li></ul><p></p>';

async function write(root: string, path: string, value: unknown) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value, null, 2));
}

async function fixtureRoot(content: ContentSet = fixtureContent()) {
  const root = await mkdtemp(join(tmpdir(), 'doc-sync-'));
  await write(root, 'content/source/baseline.json', content.baseline);
  await write(root, 'content/source/taxonomy.json', content.taxonomy);
  await write(root, 'content/source/captures.json', content.captures);
  await write(root, 'app/content/source-overview.json', content.overview);
  for (const { file, pages } of content.chapters) await write(root, `app/content/chapters/${file}`, pages);
  for (const { file, entries } of content.coverage) await write(root, `content/coverage/${file}`, entries);
  for (const { file, entries } of content.figures) await write(root, `app/content/figures/${file}`, entries);
  await write(root, 'export.html.gz', gzipSync(exportHtml(SECOND)));
  return root;
}
const now = new Date('2026-10-07T12:00:00.000Z');

it('updates articles, snapshot and captures from a saved export', async () => {
  const root = await fixtureRoot();
  const result = await runSync({ root, from: join(root, 'export.html.gz'), allowDirty: true, now });
  expect(result).toEqual({ changed: true, flags: 0, reportPath: 'content/source/changes/2026-10-07.md' });
  const content = await loadContent(root);
  expect(validateGuide(guideInput(content))).toEqual([]);
  expect(content.captures).toHaveLength(2);
  expect(content.captures[1]).toMatchObject({
    nextBlock: 10,
    report: 'content/source/changes/2026-10-07.md',
    baselineDigest: baselineDigest(content.baseline),
  });
  expect(await readFile(join(root, result.reportPath!), 'utf8')).toContain('Beta arrives.');
  expect(existsSync(join(root, '.local-tools/source-doc/captures/2026-10-07T12-00-00-000Z.html.gz'))).toBe(true);
});

it('writes nothing on a second run over the same export', async () => {
  const root = await fixtureRoot();
  await runSync({ root, from: join(root, 'export.html.gz'), allowDirty: true, now });
  const before = await readFile(join(root, 'content/source/captures.json'), 'utf8');
  expect(await runSync({ root, from: join(root, 'export.html.gz'), allowDirty: true, now })).toEqual({
    changed: false,
    flags: 0,
    reportPath: null,
  });
  expect(await readFile(join(root, 'content/source/captures.json'), 'utf8')).toBe(before);
});

it('writes nothing on a dry run', async () => {
  const root = await fixtureRoot();
  const before = await readFile(join(root, 'content/source/baseline.json'), 'utf8');
  expect(await runSync({ root, from: join(root, 'export.html.gz'), dryRun: true, now })).toEqual({
    changed: true,
    flags: 0,
    reportPath: null,
  });
  expect(await readFile(join(root, 'content/source/baseline.json'), 'utf8')).toBe(before);
});

it('writes nothing when the export is not HTML', async () => {
  const root = await fixtureRoot();
  await write(root, 'broken.html', '%PDF-1.7');
  const before = await readFile(join(root, 'content/source/baseline.json'), 'utf8');
  await expect(runSync({ root, from: join(root, 'broken.html'), allowDirty: true, now })).rejects.toThrow(
    'not an HTML document',
  );
  expect(await readFile(join(root, 'content/source/baseline.json'), 'utf8')).toBe(before);
});

it('refuses to run over uncommitted content changes', async () => {
  const root = await fixtureRoot();
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd: root });
  git('init', '--quiet');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');
  await write(root, 'content/coverage/group-a.json', '[]');
  await expect(runSync({ root, from: join(root, 'export.html.gz'), now })).rejects.toThrow('uncommitted changes');
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm test -- tests/source-sync.test.ts`
Expected: FAIL. `../scripts/source/sync.ts` does not resolve.

- [ ] **Step 3: Implement the runner.** Create `scripts/source/sync.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { format, resolveConfig } from 'prettier';
import type { CoverageEntry, Figure, GuidePage, SourceBaseline } from '../../app/content/types';
import { alignSnapshot } from './align.ts';
import { baselineDigest, sha256, updateNote } from './captures.ts';
import type { Capture, ContentSet, TaxonomyEntry } from './model.ts';
import { decodeExport, parseExport } from './parse.ts';
import { reconcile } from './reconcile.ts';
import { renderReport } from './report.ts';

export const EXPORT_URL =
  'https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/export?format=html';

export type SyncOptions = {
  root: string;
  dryRun?: boolean;
  from?: string;
  force?: boolean;
  allowDirty?: boolean;
  now?: Date;
  download?: () => Promise<Uint8Array>;
  log?: (line: string) => void;
};
export type SyncResult = { changed: boolean; flags: number; reportPath: string | null };

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;

async function writeFormatted(path: string, text: string, parser: 'json' | 'markdown') {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await format(text, { ...(await resolveConfig(path)), parser }));
}
const writeJson = (path: string, value: unknown) => writeFormatted(path, JSON.stringify(value, null, 2), 'json');

async function files<T>(dir: string, pattern: RegExp): Promise<{ file: string; value: T }[]> {
  const names = (await readdir(dir)).filter((name) => pattern.test(name)).sort();
  return Promise.all(names.map(async (file) => ({ file, value: await readJson<T>(join(dir, file)) })));
}

export async function loadContent(root: string): Promise<ContentSet> {
  const at = (path: string) => join(root, path);
  const chapters = await files<GuidePage[]>(at('app/content/chapters'), /^chapter-\d+\.json$/u);
  const coverage = await files<CoverageEntry[]>(at('content/coverage'), /^group-[a-z]\.json$/u);
  const figures = await files<Figure[]>(at('app/content/figures'), /^group-[a-z]\.json$/u);
  return {
    baseline: await readJson<SourceBaseline>(at('content/source/baseline.json')),
    overview: await readJson<GuidePage>(at('app/content/source-overview.json')),
    chapters: chapters.map(({ file, value }) => ({ file, pages: value })),
    coverage: coverage.map(({ file, value }) => ({ file, entries: value })),
    figures: figures.map(({ file, value }) => ({ file, entries: value })),
    taxonomy: await readJson<TaxonomyEntry[]>(at('content/source/taxonomy.json')),
    captures: await readJson<Capture[]>(at('content/source/captures.json')),
  };
}

export function uncommittedContent(root: string): string[] {
  try {
    return execFileSync('git', ['status', '--porcelain', '--', 'content', 'app/content', 'public/images/guide'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    throw new Error('Could not ask git about uncommitted changes; pass --allow-dirty to skip this check');
  }
}

async function download(): Promise<Uint8Array> {
  const response = await fetch(EXPORT_URL);
  if (!response.ok) throw new Error(`The Doc export failed with HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const { root, log = () => {} } = options;
  if (!options.dryRun && !options.allowDirty) {
    const dirty = uncommittedContent(root);
    if (dirty.length)
      throw new Error(
        `Content files have uncommitted changes; commit or stash them, or pass --allow-dirty:\n${dirty.join('\n')}`,
      );
  }
  const content = await loadContent(root);
  const last = content.captures.at(-1);
  if (!last) throw new Error('content/source/captures.json has no capture to continue from');
  const raw = options.from ? new Uint8Array(await readFile(options.from)) : await (options.download ?? download)();
  const html = decodeExport(raw);
  const alignment = alignSnapshot(content.baseline, parseExport(html), {
    fingerprints: { html: sha256(html) },
    nextBlock: last.nextBlock,
    nextFigure: last.nextFigure,
    force: options.force,
  });
  if (
    JSON.stringify(alignment.baseline.blocks) === JSON.stringify(content.baseline.blocks) &&
    JSON.stringify(alignment.baseline.figures) === JSON.stringify(content.baseline.figures)
  ) {
    log('No changes since the last capture.');
    return { changed: false, flags: 0, reportPath: null };
  }
  const result = reconcile(content, alignment);
  const capturedAt = (options.now ?? new Date()).toISOString();
  const reportPath = `content/source/changes/${capturedAt.slice(0, 10)}.md`;
  const capture: Capture = {
    capturedAt,
    fingerprints: alignment.baseline.fingerprints,
    updateNote: updateNote(alignment.baseline.blocks),
    blocks: alignment.baseline.blocks.length,
    figures: alignment.baseline.figures.length,
    nextBlock: alignment.nextBlock,
    nextFigure: alignment.nextFigure,
    report: reportPath,
    baselineDigest: baselineDigest(alignment.baseline),
  };
  const count = (kind: string) => alignment.changes.filter((change) => change.kind === kind).length;
  log(
    `Unchanged ${count('unchanged')}, edited ${count('edited')}, added ${count('added')}, removed ${alignment.removed.length}; ` +
      `${result.flags.length} need attention, ${result.reviews.length} to review.`,
  );
  for (const { sourceId, reason } of result.flags) log(`  ${sourceId}: ${reason}`);
  if (options.dryRun) return { changed: true, flags: result.flags.length, reportPath: null };

  // Images first and the snapshot last, so an interrupted run can simply run again.
  for (const { figure, bytes } of alignment.newImages) {
    const path = join(root, 'public', figure.src);
    if (!existsSync(path)) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    }
  }
  const out = result.content;
  for (const { file, pages } of out.chapters) await writeJson(join(root, 'app/content/chapters', file), pages);
  await writeJson(join(root, 'app/content/source-overview.json'), out.overview);
  for (const { file, entries } of out.coverage) await writeJson(join(root, 'content/coverage', file), entries);
  for (const { file, entries } of out.figures) await writeJson(join(root, 'app/content/figures', file), entries);
  await writeJson(join(root, 'content/source/taxonomy.json'), out.taxonomy);
  const titles = new Map([out.overview, ...out.chapters.flatMap((file) => file.pages)].map((page) => [page.slug, page.title]));
  await writeFormatted(join(root, reportPath), renderReport({ capture, alignment, result, titles }), 'markdown');
  const archive = join(root, '.local-tools/source-doc/captures', `${capturedAt.replace(/[:.]/gu, '-')}.html.gz`);
  await mkdir(dirname(archive), { recursive: true });
  await writeFile(archive, raw[0] === 0x1f && raw[1] === 0x8b ? raw : gzipSync(raw));
  await writeJson(join(root, 'content/source/baseline.json'), alignment.baseline);
  await writeJson(join(root, 'content/source/captures.json'), [...content.captures, capture]);
  return { changed: true, flags: result.flags.length, reportPath };
}
```

Create `scripts/source-sync.ts`:

```ts
// Pull Kanon's Google Doc into the source snapshot and articles. See README "Syncing with the Google Doc".
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSync } from './source/sync.ts';

const args = process.argv.slice(2);
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined;
try {
  const result = await runSync({
    root: resolve(fileURLToPath(new URL('..', import.meta.url))),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    allowDirty: args.includes('--allow-dirty'),
    from,
    log: (line) => console.log(line),
  });
  if (result.reportPath) console.log(`Report: ${result.reportPath}`);
  if (result.flags) console.log(`${result.flags} item(s) need attention; npm run check fails until they are resolved.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
```

In `package.json` `scripts`, after `"content:check"`, add:

```json
    "source:sync": "node scripts/source-sync.ts && npm run content:generate",
    "source:check": "node scripts/source-sync.ts --dry-run",
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `npm test -- tests/source-sync.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Check the command against the live Doc without writing anything.**

Run: `npm run source:check`
Expected: a line reading `Unchanged 1262, edited 6, added 0, removed 0; 2 need attention, 0 to review.`, followed by the `block-1021` and `block-1112` formula flags. No files change: confirm with `git status --short`.

Any other edit or flag means the Doc changed since 2026-09-26, or there's a bug. Read the flag lines, and check the Doc's update note before going on.

- [ ] **Step 6: Typecheck, lint, format and commit.**

Run: `npm run typecheck && npm run lint && npx prettier --write scripts/source scripts/source-sync.ts tests/source-sync.test.ts package.json`

```bash
git add scripts/source/sync.ts scripts/source-sync.ts package.json tests/source-sync.test.ts
git commit -m "Add the source:sync and source:check commands"
```

---

### Task 7: Article ranges by source position

**Files:**

- Create: `app/content/source-order.ts`
- Modify: `app/content/repository.ts` (the `sourceNumber` and `pageForSource` functions, and the `destination()` sort)
- Test: `tests/source-order.test.ts`

**Interfaces:**

- Consumes: `source-references.json` block order, which already follows the snapshot.
- Produces:
  - `sourcePositions(ids: string[]): Map<string, number>`
  - `pageForSource(sourceId: string, positions: Map<string, number>, ranges: SourceRange[]): string | undefined`
  - `sourceDistance(positions: Map<string, number>, a: string, b: string): number`
  - `type SourceRange = { slug: string; firstBlock: string; lastBlock: string }`

- [ ] **Step 1: Write the failing test.** Create `tests/source-order.test.ts`:

```ts
import { expect, it } from 'vitest';
import { pageForSource, sourceDistance, sourcePositions } from '../app/content/source-order';

it('places blocks in article ranges by snapshot order, not ID number', () => {
  const positions = sourcePositions(['block-0001', 'block-0002', 'block-1269', 'block-0003']);
  const ranges = [
    { slug: 'first', firstBlock: 'block-0001', lastBlock: 'block-0002' },
    { slug: 'second', firstBlock: 'block-1269', lastBlock: 'block-0003' },
  ];
  expect(pageForSource('block-1269', positions, ranges)).toBe('second');
  expect(pageForSource('block-0003', positions, ranges)).toBe('second');
  expect(pageForSource('block-9999', positions, ranges)).toBeUndefined();
  expect(sourceDistance(positions, 'block-0002', 'block-0003')).toBe(2);
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- tests/source-order.test.ts`
Expected: FAIL. `../app/content/source-order` does not resolve.

- [ ] **Step 3: Implement it and use it in the repository.** Create `app/content/source-order.ts`:

```ts
/** Source block IDs stop following position once the Doc is re-imported; order comes from the snapshot. */
export type SourceRange = { slug: string; firstBlock: string; lastBlock: string };

const FAR = Number.MAX_SAFE_INTEGER;

export function sourcePositions(ids: string[]): Map<string, number> {
  return new Map(ids.map((id, index) => [id, index]));
}

export function pageForSource(
  sourceId: string,
  positions: Map<string, number>,
  ranges: SourceRange[],
): string | undefined {
  const position = positions.get(sourceId);
  if (position === undefined) return undefined;
  return ranges.find(
    ({ firstBlock, lastBlock }) =>
      position >= (positions.get(firstBlock) ?? FAR) && position <= (positions.get(lastBlock) ?? -1),
  )?.slug;
}

export function sourceDistance(positions: Map<string, number>, a: string, b: string): number {
  return Math.abs((positions.get(a) ?? FAR) - (positions.get(b) ?? FAR));
}
```

In `app/content/repository.ts`:

1. Add `import { pageForSource, sourceDistance, sourcePositions } from './source-order';` after the `./reader` import.
2. Delete the local `sourceNumber` and `pageForSource` functions, and put this in their place:

```ts
const positions = sourcePositions(sourceReferences.blocks.map((block) => block.id));
```

3. In `destination()`:
   - Replace `const slug = pageForSource(sourceId);` with `const slug = pageForSource(sourceId, positions, taxonomy);`.
   - Replace the sort comparator body with `sourceDistance(positions, a, sourceId) - sourceDistance(positions, b, sourceId),`.

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `npm test -- tests/source-order.test.ts tests/article-page.test.tsx tests/wiki-directory.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint, format and commit.**

Run: `npm run typecheck && npm run lint && npx prettier --write app/content/source-order.ts app/content/repository.ts tests/source-order.test.ts`

```bash
git add app/content/source-order.ts app/content/repository.ts tests/source-order.test.ts
git commit -m "Find a source block's article by snapshot position"
```

---

### Task 8: The capture log, D9 tests and docs

**Files:**

- Create: `content/source/captures.json`
- Modify: `tests/source-baseline.test.ts` (full rewrite), `README.md`, `AGENTS.md`, `docs/source-guide-migration.md`, `archive/guide-migration/README.md`, `docs/research/2026-09-25-google-doc-sync.md`

**Interfaces:**

- Consumes: `baselineDigest` and `updateNote` (Task 4); `Capture` and `TaxonomyEntry` (Task 1).
- Produces: `content/source/captures.json`, with one entry for the original capture, which `runSync` continues from.

- [ ] **Step 1: Rewrite the baseline test for D9.** Replace `tests/source-baseline.test.ts` with:

```ts
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { SourceBaseline } from '../app/content/types';
import { baselineDigest } from '../scripts/source/captures.ts';
import type { Capture, TaxonomyEntry } from '../scripts/source/model.ts';

const load = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const baseline = load<SourceBaseline>('content/source/baseline.json');
const captures = load<Capture[]>('content/source/captures.json');
const taxonomy = load<TaxonomyEntry[]>('content/source/taxonomy.json');
const sourceDigest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
// The original visual audit is provenance and never changes with a sync.
const figureAuditSourceDigest = 'b6875fb48a72944260c42deb28d2633e88f4889211a77c8e00735abb4bf83f44';

it('changes the baseline only through the importer', () => {
  // npm run source:sync records each capture's digest; a hand edit no longer matches.
  expect(baselineDigest(baseline)).toBe(captures.at(-1)?.baselineDigest);
});

it('numbers blocks and figures uniquely, below the next free numbers', () => {
  const last = captures.at(-1)!;
  const blockIds = baseline.blocks.map((block) => block.id);
  const figureIds = baseline.figures.map((figure) => figure.id);
  expect(new Set(blockIds).size).toBe(blockIds.length);
  expect(new Set(figureIds).size).toBe(figureIds.length);
  for (const id of blockIds) expect(id).toMatch(/^block-\d{4,}$/u);
  for (const id of figureIds) expect(id).toMatch(/^figure-\d{3,}$/u);
  expect(Math.max(...blockIds.map((id) => Number(id.slice(6))))).toBeLessThan(last.nextBlock);
  expect(Math.max(...figureIds.map((id) => Number(id.slice(7))))).toBeLessThan(last.nextFigure);
});

it('stores the exact original bytes at every figure path', () => {
  for (const figure of baseline.figures) {
    const path = join('public', figure.src.replace(/^\//, ''));
    expect(existsSync(path), figure.id).toBe(true);
    expect(createHash('sha256').update(readFileSync(path)).digest('hex'), figure.id).toBe(figure.sha256);
  }
});

it('covers every source block with one article range, in order', () => {
  const positions = new Map(baseline.blocks.map((block, index) => [block.id, index]));
  let expected = 0;
  for (const page of taxonomy) {
    expect(positions.get(page.firstBlock), page.slug).toBe(expected);
    const last = positions.get(page.lastBlock)!;
    expect(last, page.slug).toBeGreaterThanOrEqual(expected);
    const blocks = baseline.blocks.slice(expected, last + 1);
    expect(page.nonemptyBlocks, page.slug).toBe(blocks.filter((block) => block.text || block.figureIds.length).length);
    expect(page.figures, page.slug).toEqual(blocks.flatMap((block) => block.figureIds));
    expected = last + 1;
  }
  expect(expected).toBe(baseline.blocks.length);
});

it('uses distinct ASCII slugs', () => {
  expect(new Set(taxonomy.map((page) => page.slug)).size).toBe(taxonomy.length);
  for (const page of taxonomy) expect(page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

it('retains complete normalized figure audit evidence', () => {
  const preserved = load<unknown[]>('content/source/figure-audit.json');
  expect(sourceDigest(preserved)).toBe(figureAuditSourceDigest);
});

it('positions every formatting run in whitespace-normalized UTF-16 source text', () => {
  for (const block of baseline.blocks) {
    const normalized = block.text.replace(/\s+/gu, ' ').trim();
    for (const run of block.formatting) {
      expect(Number.isInteger(run.start), block.id).toBe(true);
      expect(run.start, block.id).toBeGreaterThanOrEqual(0);
      expect(run.end, block.id).toBeGreaterThan(run.start);
      expect(normalized.slice(run.start, run.end), block.id).toBe(run.text.replace(/\s+/gu, ' ').trim());
    }
  }
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- tests/source-baseline.test.ts`
Expected: FAIL with `ENOENT` for `content/source/captures.json`.

- [ ] **Step 3: Record the original capture.** Run from the repository root:

```bash
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { baselineDigest, updateNote } from './scripts/source/captures.ts';
const baseline = JSON.parse(readFileSync('content/source/baseline.json', 'utf8'));
const highest = (ids, prefix) => Math.max(...ids.map((id) => Number(id.slice(prefix.length))));
const capture = {
  capturedAt: '2026-09-24T00:00:00.000Z',
  fingerprints: baseline.fingerprints,
  updateNote: updateNote(baseline.blocks),
  blocks: baseline.blocks.length,
  figures: baseline.figures.length,
  nextBlock: highest(baseline.blocks.map((b) => b.id), 'block-') + 1,
  nextFigure: highest(baseline.figures.map((f) => f.id), 'figure-') + 1,
  report: null,
  baselineDigest: baselineDigest(baseline),
};
writeFileSync('content/source/captures.json', JSON.stringify([capture], null, 2) + '\n');
"
npx prettier --write content/source/captures.json
```

Expected: `content/source/captures.json` holds one entry with `"blocks": 1268`, `"figures": 90`, `"nextBlock": 1269` and `"nextFigure": 91`. Its `updateNote` starts `***Update Note 9/20/2026`.

- [ ] **Step 4: Run the test to verify it passes.**

Run: `npm test -- tests/source-baseline.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Update the docs.**

`README.md`:

- In the testing paragraph, replace `the frozen source baseline remains protected.` with `the source baseline changes only through \`npm run source:sync\`.`
- In the source paragraph, replace `Do not change the baseline to make a content regression pass.` with `The baseline changes only through \`npm run source:sync\`; never edit it by hand or to make a content regression pass.`
- After the paragraph that starts `` `app/content/repository.ts` loads full bodies``, add:

````markdown
### Syncing with the Google Doc

`npm run source:check` downloads [Kanon's guide](https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/edit) and prints what changed since the last capture, without writing anything. `npm run source:sync` then:

- records the capture in `content/source/baseline.json` and `content/source/captures.json`;
- applies text edits to the articles;
- regenerates the catalogue;
- writes a report to `content/source/changes/<date>.md`.

Run it on a branch with no uncommitted content changes:

```sh
git switch -c content/doc-sync-YYYY-MM-DD
npm run source:sync
npm run check && npm run build
```

Block IDs stay stable across captures, and numbers are never reused.

Some changes apply automatically:

- an edit to a paragraph or heading that renders exactly one source block;
- a new paragraph, heading, list item or single image placed after such a block.

Everything else is listed under "Needs attention" in the report and keeps `npm run check` failing until it is resolved by hand. New images also need alt text.

To pass options, run the script directly, for example `node scripts/source-sync.ts --force && npm run content:generate`:

- `--from <file>` reads a saved export;
- `--force` continues when most blocks changed;
- `--allow-dirty` skips the uncommitted-changes check.

Only this command touches the network. Each raw download is also kept under the ignored `.local-tools/source-doc/captures/`. See [the design](docs/superpowers/specs/2026-09-26-google-doc-sync-design.md).
````

`AGENTS.md`: after the bullet that starts `- Edit canonical content in`, add:

```markdown
- Pull Google Doc updates with `npm run source:sync` on a branch (see README). The source baseline changes only through that command; never hand-edit it or loosen a check to absorb a Doc change.
```

`docs/source-guide-migration.md`: after `A later source revision requires a new capture and deliberate reconciliation, not changes to this baseline to satisfy a test.`, add ` \`npm run source:sync\` performs that capture and reconciliation; see the README.`

`archive/guide-migration/README.md`: replace `Do not run it\n  to repair validation failures or import a newer live guide.` with `Do not run it\n  to repair validation failures or import a newer live guide; use\n  \`npm run source:sync\` for that.`

`docs/research/2026-09-25-google-doc-sync.md`: replace `implementation has not started.` with `the importer and text-edit reconciler are specified in [the sync design](../superpowers/specs/2026-09-26-google-doc-sync-design.md) and run as \`npm run source:sync\`.`

- [ ] **Step 6: Run the full check and commit.**

Run: `npm run check`
Expected: exit 0.

```bash
git add content/source/captures.json tests/source-baseline.test.ts README.md AGENTS.md docs/source-guide-migration.md archive/guide-migration/README.md docs/research/2026-09-25-google-doc-sync.md
git commit -m "Record source captures and replace frozen baseline pins"
```

---

### Task 9: First sync

**Files:**

- Modified by the command: `content/source/baseline.json`, `content/source/captures.json`, `content/source/taxonomy.json`, `app/content/chapters/chapter-05.json`, `app/content/chapters/chapter-11.json` and the generated catalogue files
- Created by the command: `content/source/changes/<date>.md`
- Modified by hand: the `block-1021` and `block-1112` formula leaves (`app/content/chapters/chapter-10.json`, `chapter-11.json`)

**Interfaces:**

- Consumes: `npm run source:sync` (Task 6).
- Produces: the first importer capture. After it, the wiki's baseline records list levels and real line breaks.

- [ ] **Step 1: Sync.**

Run: `npm run source:sync`
Expected:

- `Unchanged 1262, edited 6, added 0, removed 0; 2 need attention, 0 to review.`
- the flags `block-1021` and `block-1112` ("Edited, but its text sits in a formula, note or group");
- `Report: content/source/changes/<date>.md`.

- [ ] **Step 2: Confirm the check fails for exactly those two blocks.**

Run: `npm run verify:content`
Expected: FAIL. Only `block-1021` and `block-1112` errors appear (`source text missing or changed`).

- [ ] **Step 3: Fix the two formulas by hand.**
  1. In the formula leaf `block-1021`, find the run in `expression` (or `explanation`) whose text begins with `Formula`. Split it right after the word `Formula` into two runs with the same marks, and give the first run `"breakAfter": true`. For example, `{ "text": "Formula[Outfit…" }` becomes `{ "text": "Formula", "breakAfter": true }, { "text": "[Outfit…" }`.
  2. Do the same for `block-1112`, splitting after `Formula:`.
  3. Don't change any other character.

- [ ] **Step 4: Verify everything.**

Run: `npm run check && npm run build && npm run verify:browser`
Expected: all pass. In the build output, the static verifier reports 57 routes.

Then open `/articles/offensive-stat-values-and-attack-comparisons`. The "At 1% Double Chance: 101 total damage" line should now break before "At 2%", instead of reading "damageAt".

- [ ] **Step 5: Read the report and diff, then commit.**

Check:

- The report lists the 6 edited blocks and nothing under "Review".
- `git diff --stat` touches only the files listed for this task, plus the regenerated `app/content/catalogue.json` and `app/content/source-references.json`.
- The regenerated leaves for `block-0434`, `block-1065`, `block-1071` and `block-1079` use plain spaces where today's hand-built leaves have non-breaking spaces. That is expected, because the source text records whitespace as plain spaces.

```bash
git add content app/content
git commit -m "Capture the guide with the Doc sync importer"
```
