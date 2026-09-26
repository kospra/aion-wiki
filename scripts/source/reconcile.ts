import { walkBlocks } from '../../app/content/reader.ts';
import type {
  Block,
  CoverageEntry,
  Figure,
  GuidePage,
} from '../../app/content/types';
import { createDestinations, pagePath } from '../content-destinations.ts';
import { isLayoutOnly } from '../content-integrity.ts';
import type { Alignment } from './align.ts';
import { sourceRuns } from './leaf.ts';
import type { ContentSet, SourceBlock, TaxonomyEntry } from './model.ts';

export type Flag = {
  sourceId: string;
  pageSlug: string | null;
  reason: string;
};
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

export const EMPTY_REASON =
  'Empty document spacing is normalized by article layout.';
export const DIVIDER_REASON =
  'Google Docs divider line; article spacing separates sections.';

type Slot = { block: Block; container: Block[]; index: number };
type Location = Slot & { page: GuidePage; ancestors: Slot[] };
type LeafKind = 'paragraph' | 'heading' | 'figure';

function locate(pages: GuidePage[]): Map<string, Location[]> {
  const result = new Map<string, Location[]>();
  const visit = (page: GuidePage, container: Block[], ancestors: Slot[]) =>
    container.forEach((block, index) => {
      const slot = { block, container, index };
      for (const id of block.sourceIds)
        result.set(id, [
          ...(result.get(id) ?? []),
          { ...slot, page, ancestors },
        ]);
      const inner = [...ancestors, slot];
      if (block.kind === 'list')
        block.items.forEach((item) => visit(page, item, inner));
      else if (block.kind === 'group') visit(page, block.blocks, inner);
      else if (block.kind === 'table')
        block.rows.forEach((row) =>
          row.forEach((cell) => visit(page, cell, inner)),
        );
    });
  pages.forEach((page) => visit(page, page.blocks, []));
  return result;
}

function leafKind(block: SourceBlock): LeafKind | null {
  if (block.figureIds.length)
    return block.figureIds.length === 1 && !block.text.trim() ? 'figure' : null;
  if (block.tag === 'p' || block.tag === 'li') return 'paragraph';
  if (block.tag === 'h2' || block.tag === 'h3' || block.tag === 'h4')
    return 'heading';
  return null;
}

function newLeaf(block: SourceBlock, kind: LeafKind): Block {
  const base = { id: block.id, sourceIds: [block.id] };
  if (kind === 'figure') return { ...base, kind, figureId: block.figureIds[0] };
  if (kind === 'heading')
    return {
      ...base,
      kind,
      level: Number(block.tag!.slice(1)) as 2 | 3 | 4,
      content: [],
    };
  return { ...base, kind, content: [] };
}

export function reconcile(
  current: ContentSet,
  alignment: Alignment,
): Reconciliation {
  const content = structuredClone(current);
  content.baseline = alignment.baseline;
  const flags: Flag[] = [];
  const reviews: Flag[] = [];
  const touched: Touch[] = [];
  const pending: { leaf: Block; sourceId: string; page: GuidePage }[] = [];
  const snapshot = alignment.baseline.blocks;
  const previous = new Map(
    current.baseline.blocks.map((block) => [block.id, block]),
  );
  const next = new Map(snapshot.map((block) => [block.id, block]));
  const order = new Map(snapshot.map((block, index) => [block.id, index]));
  const pages = [
    content.overview,
    ...content.chapters.flatMap((file) => file.pages),
  ];
  const pageBySlug = new Map(pages.map((page) => [page.slug, page]));
  const flag = (sourceId: string, pageSlug: string | null, reason: string) => {
    flags.push({ sourceId, pageSlug, reason });
  };
  const review = (
    sourceId: string,
    pageSlug: string | null,
    reason: string,
  ) => {
    reviews.push({ sourceId, pageSlug, reason });
  };

  const entryOf = (id: string) => {
    for (const file of content.coverage) {
      const index = file.entries.findIndex((entry) => entry.sourceId === id);
      if (index >= 0)
        return { entries: file.entries, index, entry: file.entries[index] };
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
        const found = file.entries.findIndex(
          (figure) => figure.id === figures[index].id,
        );
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
      parent.block.items = parent.block.items.filter(
        (item) => item !== location.container,
      );
      if (!parent.block.items.length) parent.container.splice(parent.index, 1);
    }
  };

  // 1. An article whose first block left starts at its next surviving block.
  const removed = new Set(alignment.removed);
  const previousOrder = new Map(
    current.baseline.blocks.map((block, index) => [block.id, index]),
  );
  for (const entry of content.taxonomy) {
    if (!removed.has(entry.firstBlock)) continue;
    const range = current.baseline.blocks.slice(
      previousOrder.get(entry.firstBlock)!,
      previousOrder.get(entry.lastBlock)! + 1,
    );
    const survivor = range.find((block) => !removed.has(block.id));
    if (survivor) entry.firstBlock = survivor.id;
    else
      flag(
        entry.firstBlock,
        entry.slug,
        'Every block of this article left the Doc; retire or merge the article by hand',
      );
  }

  // 2. Removed blocks.
  for (const id of alignment.removed) {
    const before = previous.get(id)!;
    const found = entryOf(id);
    const locations = locate(pages).get(id) ?? [];
    const slug =
      found?.entry.primary?.pageSlug ??
      found?.entry.pageSlug ??
      locations[0]?.page.slug ??
      null;
    if (!locations.length) {
      // Nothing rendered it, or an interrupted run already removed its leaf.
      if (found) found.entries.splice(found.index, 1);
      continue;
    }
    const leaf = sole(id, ['paragraph', 'heading', 'figure']);
    if (!found || found.entry.disposition !== 'rendered' || !leaf) {
      flag(
        id,
        slug,
        'Removed from the Doc, but its article leaf has another shape; remove it by hand',
      );
      continue;
    }
    removeSlot(leaf);
    found.entries.splice(found.index, 1);
    before.figureIds.forEach(removeFigure);
    touched.push({
      kind: 'removed',
      sourceId: id,
      pageSlug: slug,
      before: before.text,
    });
  }

  // 3. Articles own their blocks by snapshot position; new blocks join the article before them.
  const pageOf = new Map<string, string>();
  const starts = new Map(
    content.taxonomy.map((entry) => [entry.firstBlock, entry]),
  );
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
        insertEntry({
          sourceId: id,
          disposition: 'rendered',
          primary: { pageSlug: existing[0].page.slug, blockIds: [id] },
        });
      return;
    }
    if (isLayoutOnly(block)) {
      insertEntry({
        sourceId: id,
        disposition: 'layout-only',
        reason: block.text ? DIVIDER_REASON : EMPTY_REASON,
      });
      return;
    }
    const kind = leafKind(block);
    if (!kind)
      return flag(
        id,
        slug,
        'A new h1, h5, h6, table, image group or image with text; place it by hand',
      );
    let predecessor: SourceBlock | undefined;
    for (let index = order.get(id)! - 1; index >= 0; index--) {
      const candidate = snapshot[index];
      if (pageOf.get(candidate.id) !== slug) break;
      if (entryOf(candidate.id)?.entry.disposition === 'rendered') {
        predecessor = candidate;
        break;
      }
    }
    if (!predecessor)
      return flag(
        id,
        slug,
        'A new block at the start of an article; place it by hand',
      );
    const anchor = sole(predecessor.id, ['paragraph', 'heading', 'figure']);
    if (!anchor)
      return flag(
        id,
        slug,
        `The block before it (${predecessor.id}) is not a single leaf; place it by hand`,
      );
    if (anchor.ancestors.some((slot) => slot.block.kind === 'table'))
      return flag(
        id,
        slug,
        'The block before it sits in a table; place it by hand',
      );
    const leaf = newLeaf(block, kind);
    if (block.tag === 'li') {
      const list = anchor.ancestors.at(-1)?.block;
      const items = list?.kind === 'list' ? list.items : undefined;
      const item = items ? items.indexOf(anchor.container) : -1;
      if (
        !items ||
        item < 0 ||
        predecessor.tag !== 'li' ||
        predecessor.level !== block.level
      )
        return flag(
          id,
          slug,
          'A new list item that starts a list or changes level; place it by hand',
        );
      items.splice(item + 1, 0, [leaf]);
    } else {
      const outer =
        predecessor.tag === 'li'
          ? anchor.ancestors.find((slot) => slot.block.kind === 'list')
          : undefined;
      const target = outer ?? anchor;
      target.container.splice(target.index + 1, 0, leaf);
    }
    insertEntry({
      sourceId: id,
      disposition: 'rendered',
      primary: { pageSlug: slug, blockIds: [id] },
    });
    if (leaf.kind === 'figure') insertFigure(leaf.figureId);
    else pending.push({ leaf, sourceId: id, page: pageBySlug.get(slug)! });
    touched.push({
      kind: 'added',
      sourceId: id,
      pageSlug: slug,
      after: block.text,
    });
    if (leaf.kind === 'heading')
      review(id, slug, 'A new heading; decide whether it starts a new article');
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
      if (!leaf)
        return flag(
          id,
          pageSlug,
          'Now empty, but its article leaf has another shape; remove it by hand',
        );
      removeSlot(leaf);
      found.entries[found.index] = {
        sourceId: id,
        disposition: 'layout-only',
        reason: after.text ? DIVIDER_REASON : EMPTY_REASON,
      };
      touched.push({
        kind: 'removed',
        sourceId: id,
        pageSlug,
        before: before.text,
      });
      return;
    }
    if (before.tag !== after.tag)
      return flag(
        id,
        pageSlug,
        `Changed from ${before.tag} to ${after.tag}; update the leaf by hand`,
      );
    if (before.figureIds.join() !== after.figureIds.join())
      return flag(
        id,
        pageSlug,
        'Its images changed; update the figures by hand',
      );
    if (entry.strayText)
      return flag(
        id,
        pageSlug,
        'Edited next to a figure with stray-text handling; update it by hand',
      );
    const leaf = sole(id, ['paragraph', 'heading']);
    if (!leaf)
      return flag(
        id,
        pageSlug,
        'Edited, but its text sits in a formula, note or group; update it by hand',
      );
    pending.push({ leaf: leaf.block, sourceId: id, page: leaf.page });
    touched.push({
      kind: 'edited',
      sourceId: id,
      pageSlug,
      before: before.text,
      after: after.text,
    });
    if (content.taxonomy.some((range) => range.firstBlock === id))
      review(
        id,
        pageSlug,
        'Edited the heading that opens this article; check the article title',
      );
    if (before.anchor !== after.anchor)
      review(
        id,
        pageSlug,
        'Its Google anchor changed; check links from other sections',
      );
  };

  // 4. Edits and additions in snapshot order, so consecutive new blocks chain.
  for (const { id, kind } of alignment.changes) {
    if (kind === 'edited') edit(id);
    else if (kind === 'added') add(id);
  }

  // 5. Runs last, once every destination exists.
  const anchors = new Map(
    pages.map((page) => [
      pagePath(page),
      new Set(walkBlocks(page.blocks).map((block) => block.id)),
    ]),
  );
  const destinations = createDestinations(
    alignment.baseline,
    pages,
    content.coverage.flatMap((file) => file.entries),
    anchors,
    {},
  );
  for (const { leaf, sourceId, page } of pending) {
    if (leaf.kind !== 'paragraph' && leaf.kind !== 'heading') continue;
    const { runs, unresolved } = sourceRuns(next.get(sourceId)!, (href) =>
      destinations.canonical(href, page, true),
    );
    leaf.content = runs;
    for (const href of unresolved)
      flag(sourceId, page.slug, `Link target not found: ${href}`);
  }

  // 6. Derived taxonomy counts.
  for (const entry of content.taxonomy) {
    const blocks = snapshot.filter(
      (block) => pageOf.get(block.id) === entry.slug,
    );
    if (!blocks.length) continue;
    entry.nonemptyBlocks = blocks.filter(
      (block) => block.text || block.figureIds.length,
    ).length;
    entry.figures = blocks.flatMap((block) => block.figureIds);
  }
  return { content, flags, reviews, touched };
}
