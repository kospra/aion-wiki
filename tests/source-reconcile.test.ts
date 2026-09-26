// @vitest-environment node
import { expect, it } from 'vitest';
import { walkBlocks } from '../app/content/reader';
import type { Block } from '../app/content/types';
import { validateGuide } from '../scripts/content-integrity.ts';
import type { ContentSet } from '../scripts/source/model.ts';
import { reconcile } from '../scripts/source/reconcile.ts';
import {
  alignFixture,
  fixtureContent,
  guideInput,
} from './fixtures/source-sync.ts';

const HEAD =
  '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2>';
const LIST =
  '<ul class="lst-kix_a-0"><li>First item</li><li>Second item</li></ul><p></p>';
const basics = (content: ContentSet) => content.chapters[0].pages[0];
const texts = (blocks: Block[]) =>
  walkBlocks(blocks).flatMap((block) =>
    block.kind === 'paragraph' || block.kind === 'heading'
      ? [block.content.map((run) => run.text).join('')]
      : [],
  );
const run = (content: ContentSet, body: string) =>
  reconcile(content, alignFixture(content, body));

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
  expect(texts(basics(result.content).blocks)).toEqual([
    'Intro',
    'Alpha has 12 points.',
    'Beta arrives.',
    'First item',
  ]);
  expect(
    result.touched.map(({ kind, sourceId }) => `${kind}:${sourceId}`),
  ).toEqual(['removed:block-0007', 'edited:block-0005', 'added:block-0009']);
  expect(result.content.taxonomy[1]).toMatchObject({
    lastBlock: 'block-0008',
    nonemptyBlocks: 5,
  });
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('keeps two new paragraphs in order', () => {
  const result = run(
    fixtureContent(),
    HEAD +
      '<p>Alpha has 10 points.</p><p>Beta arrives.</p><p>Gamma follows.</p>' +
      LIST,
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
    HEAD +
      '<p>Alpha has 10 points.</p><ul class="lst-kix_a-0"><li>First item</li><li>Between items</li><li>Second item</li></ul><p></p>',
  );
  expect(texts(basics(result.content).blocks).slice(2)).toEqual([
    'First item',
    'Between items',
    'Second item',
  ]);
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('moves an article boundary when its first block leaves', () => {
  const result = run(
    fixtureContent(),
    '<p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2><p>Alpha has 10 points.</p>' +
      LIST,
  );
  expect(result.content.taxonomy[0]).toMatchObject({
    firstBlock: 'block-0002',
    lastBlock: 'block-0002',
    nonemptyBlocks: 1,
  });
  expect(validateGuide(guideInput(result.content))).toEqual([]);
});

it('resolves a link to a Doc heading inside an edited paragraph', () => {
  const result = run(
    fixtureContent(),
    HEAD +
      '<p>Alpha has 10 points. See <a href="#h.intro">Intro</a>.</p>' +
      LIST,
  );
  const alpha = walkBlocks(basics(result.content).blocks).find(
    (block) => block.id === 'block-0005',
  );
  expect(alpha?.kind === 'paragraph' && alpha.content).toContainEqual({
    text: 'Intro',
    href: '/articles/basics#block-0004',
  });
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
  expect(
    result.flags.map(({ sourceId, reason }) => `${sourceId}: ${reason}`),
  ).toEqual([
    'block-0009: A new block at the start of an article; place it by hand',
    'block-0005: Edited, but its text sits in a formula, note or group; update it by hand',
    'block-0010: A new list item that starts a list or changes level; place it by hand',
  ]);
  const errors = validateGuide(guideInput(result.content));
  expect(errors).toContain('block-0009: missing coverage');
  expect(errors).toContain('block-0010: missing coverage');
  expect(
    errors.some((error) =>
      error.startsWith('block-0005: source text missing or changed'),
    ),
  ).toBe(true);
});

/** The fixture with a third article, "extra", opened by the Alpha paragraph. */
function withExtraArticle(): ContentSet {
  const content = fixtureContent();
  const page = basics(content);
  const moved = page.blocks.splice(1);
  content.chapters[0].pages.push({
    ...page,
    slug: 'extra',
    title: 'Extra',
    blocks: moved,
  });
  for (const entry of content.coverage[0].entries)
    if (
      entry.primary &&
      ['block-0005', 'block-0006', 'block-0007'].includes(entry.sourceId)
    )
      entry.primary.pageSlug = 'extra';
  Object.assign(content.taxonomy[1], {
    lastBlock: 'block-0004',
    nonemptyBlocks: 2,
  });
  content.taxonomy.push({
    slug: 'extra',
    chapter: 1,
    title: 'Extra',
    firstBlock: 'block-0005',
    lastBlock: 'block-0008',
    nonemptyBlocks: 3,
    figures: [],
  });
  return content;
}

it('flags a list item that changes level', () => {
  const result = run(
    fixtureContent(),
    HEAD +
      '<p>Alpha has 10 points.</p><ul class="lst-kix_a-0"><li>First item</li></ul>' +
      '<ul class="lst-kix_a-1"><li>Second item</li></ul><p></p>',
  );
  expect(result.flags.map((flag) => flag.sourceId)).toEqual(['block-0007']);
});

it('flags new blocks that follow an unplaced new chapter', () => {
  const result = run(
    fixtureContent(),
    HEAD +
      '<p>Alpha has 10 points.</p>' +
      LIST +
      '<h1>CH 2: More</h1><p>Chapter two text.</p>',
  );
  expect(result.flags.map((flag) => flag.sourceId)).toEqual([
    'block-0009',
    'block-0010',
  ]);
});

it('flags a new block that takes the place of a removed article opener', () => {
  const content = withExtraArticle();
  expect(validateGuide(guideInput(content))).toEqual([]);
  const result = run(
    content,
    HEAD + '<h2>Completely renamed opener</h2>' + LIST,
  );
  expect(result.flags.map((flag) => flag.sourceId)).toEqual(['block-0009']);
});
