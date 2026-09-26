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

export function commonSubsequence<T>(
  left: T[],
  right: T[],
): [number, number][] {
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
  const oldHashes = new Map(
    previous.figures.map((figure) => [figure.id, figure.sha256]),
  );
  const oldFigures = new Map(
    previous.figures.map((figure) => [figure.id, figure]),
  );
  const hashesBefore = (block: SourceBlock) =>
    block.figureIds.map((id) => oldHashes.get(id) ?? '');
  const hashesAfter = (block: ParsedBlock) =>
    block.images.map((index) => parsed.images[index].sha256);
  const oldKeys = previous.blocks.map((block) =>
    blockKey(block, hashesBefore(block)),
  );
  const newKeys = parsed.blocks.map((block) =>
    blockKey(block, hashesAfter(block)),
  );

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
        const sameImages =
          !!beforeImages && beforeImages === hashesAfter(after).join();
        const score =
          sameAnchor || sameImages ? 1 : similarity(before.text, after.text);
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
    if (
      block.tag === 'h1' &&
      CHAPTER_TITLE.test(block.text) &&
      !pairedOld.has(index)
    )
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
      const reuse = available.findIndex(
        (figureId) => oldHashes.get(figureId) === image.sha256,
      );
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
    // Level and numbering style are not in the key: captures before levels were recorded lack them.
    const restructured =
      !!before &&
      ((before.level !== undefined && before.level !== after.level) ||
        (before.ordered !== undefined && before.ordered !== after.ordered));
    changes.push({
      id,
      kind:
        o === undefined
          ? 'added'
          : oldKeys[o] === newKeys[n] && !restructured
            ? 'unchanged'
            : 'edited',
    });
  });

  return {
    baseline: { fingerprints: options.fingerprints, blocks, figures },
    changes,
    removed: previous.blocks
      .filter((_, index) => !pairedOld.has(index))
      .map((block) => block.id),
    newImages,
    removedFigures: previous.figures
      .filter((figure) => !keptFigures.has(figure.id))
      .map((figure) => figure.id),
    nextBlock,
    nextFigure,
  };
}
