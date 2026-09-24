import { blockChildren, blockInlineSegments } from '../app/content/reader.ts';
import type { Block, Inline, SourceBaseline } from '../app/content/types';

type IndexedBlock = {
  block: Block;
  sourceIds: string[];
  ancestors: string[];
  listNumber?: number;
};

export function indexBlocks(blocks: Block[]): IndexedBlock[] {
  const result: IndexedBlock[] = [];
  function visit(
    block: Block,
    inherited: string[],
    ancestors: string[],
    listNumber?: number,
  ) {
    const sourceIds = block.sourceIds.length ? block.sourceIds : inherited;
    result.push({ block, sourceIds, ancestors, listNumber });
    const parents = [...ancestors, block.id];
    if (block.kind === 'list') {
      block.items.forEach((item, index) => {
        const number = block.ordered ? (block.start ?? 1) + index : undefined;
        item.forEach((child) => visit(child, sourceIds, parents, number));
      });
    } else {
      blockChildren(block).forEach((child) =>
        visit(child, sourceIds, parents, listNumber),
      );
    }
  }
  blocks.forEach((block) => visit(block, [], []));
  return result;
}

export function primaryFragments(
  index: IndexedBlock[],
  blockIds: string[],
  sourceId: string,
): IndexedBlock[] {
  const roots = new Set(blockIds);
  // Each actual node is visited once even when the manifest names both it and a parent.
  return index.filter(
    ({ block, ancestors, sourceIds }) =>
      sourceIds.includes(sourceId) &&
      (roots.has(block.id) || ancestors.some((id) => roots.has(id))),
  );
}

export const normalizeWhitespace = (text: string): string =>
  text.replace(/\s+/gu, ' ').trim();

// Keep the style and link provenance of each visible character while collapsing
// whitespace, so a styled copy elsewhere cannot cover an unstyled source occurrence.
function visibleCharacters(fragments: IndexedBlock[]): {
  text: string;
  runs: Inline[];
} {
  const runs: Inline[] = [];
  for (const fragment of fragments) {
    for (const segment of blockInlineSegments(fragment.block)) {
      if (runs.length) runs.push({ text: ' ' });
      for (const run of segment) {
        for (let index = 0; index < run.text.length; index++)
          runs.push({ ...run, text: run.text[index] });
        if (run.breakAfter) runs.push({ ...run, text: ' ' });
      }
    }
  }
  const normalized: Inline[] = [];
  for (const run of runs) {
    if (/\s/u.test(run.text)) {
      if (normalized.length && normalized.at(-1)?.text !== ' ')
        normalized.push({ ...run, text: ' ' });
    } else normalized.push(run);
  }
  if (normalized.at(-1)?.text === ' ') normalized.pop();
  return { text: normalized.map((run) => run.text).join(''), runs: normalized };
}

function counts(tokens: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const token of tokens) result.set(token, (result.get(token) ?? 0) + 1);
  return result;
}

type SourceBlock = SourceBaseline['blocks'][number];

export function validateFragments(
  source: SourceBlock,
  fragments: IndexedBlock[],
  canonicalLink: (href: string, fromSource: boolean) => string | null,
): string[] {
  const errors: string[] = [];
  const visible = visibleCharacters(fragments);
  const expected = normalizeWhitespace(source.text);
  const offset = visible.text.indexOf(expected);
  if (expected && offset === -1)
    errors.push(`${source.id}: source text missing or changed: ${expected}`);

  // This is the frozen importer's numeric-token grammar, not a page-wide count.
  const actualNumbers = counts(visible.text.match(/\d+(?:[.,]\d+)*/g) ?? []);
  const expectedNumbers = counts(source.numbers);
  for (const token of new Set([
    ...actualNumbers.keys(),
    ...expectedNumbers.keys(),
  ])) {
    if (actualNumbers.get(token) !== expectedNumbers.get(token)) {
      errors.push(
        `${source.id}: numeric occurrence mismatch for ${token} (expected ${expectedNumbers.get(token) ?? 0}, got ${actualNumbers.get(token) ?? 0})`,
      );
    }
  }

  if (
    source.listStart !== undefined &&
    !fragments.some(
      (fragment) =>
        fragment.listNumber === source.listStart ||
        (fragment.block.kind === 'list' &&
          fragment.block.ordered &&
          (fragment.block.start ?? 1) === source.listStart),
    )
  ) {
    errors.push(
      `${source.id}: ordered list number must be ${source.listStart}`,
    );
  }

  if (offset >= 0) {
    for (const formatting of source.formatting) {
      const text = normalizeWhitespace(formatting.text);
      const { start, end } = formatting;
      if (
        !text ||
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end <= start ||
        end > expected.length ||
        expected.slice(start, end) !== text
      ) {
        errors.push(
          `${source.id}: invalid formatting source position for ${text}`,
        );
        continue;
      }
      for (const property of [
        'strong',
        'emphasis',
        'underline',
        'highlight',
      ] as const) {
        const value = formatting[property];
        if (!value) continue;
        const preserved = visible.runs
          .slice(offset + start, offset + end)
          .every((run) => /\s/u.test(run.text) || run[property] === value);
        if (!preserved)
          errors.push(
            `${source.id}: formatting ${property} missing from ${text}`,
          );
      }
    }
    let linkCursor = 0;
    for (const [linkIndex, link] of source.links.entries()) {
      const label = normalizeWhitespace(link.label);
      if (!label) {
        // Captured Google runs can split the spaces around a labeled anchor.
        // Account for those occurrences as part of that adjacent identical link,
        // avoiding inaccessible blank anchors in the rendered guide.
        const neighbor = [
          source.links[linkIndex - 1],
          source.links[linkIndex + 1],
        ].some(
          (candidate) =>
            candidate &&
            normalizeWhitespace(candidate.label) &&
            canonicalLink(candidate.href, true) ===
              canonicalLink(link.href, true),
        );
        if (!neighbor)
          errors.push(
            `${source.id}: whitespace-only link needs an adjacent labeled link: ${link.href}`,
          );
        continue;
      }
      const start = expected.indexOf(label, linkCursor);
      linkCursor = Math.max(0, start) + label.length;
      const target = canonicalLink(link.href, true);
      const preserved =
        !!label &&
        start >= 0 &&
        target !== null &&
        visible.runs
          .slice(offset + start, offset + start + label.length)
          .every(
            (run) => !!run.href && canonicalLink(run.href, false) === target,
          );
      if (!preserved)
        errors.push(
          `${source.id}: link missing or changed for ${label}: ${link.href}`,
        );
    }
  }
  return errors;
}
