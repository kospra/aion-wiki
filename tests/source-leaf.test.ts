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
    sourceRuns(
      block('Go big now', [{ text: 'big', start: 3, end: 6, strong: true }]),
      same,
    ).runs,
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
  const resolve = (href: string) =>
    href === '#h.x' ? '/articles/a#block-0002' : null;
  expect(
    sourceRuns(
      block('See the guide', [], [{ label: 'the guide', href: '#h.x' }]),
      resolve,
    ).runs,
  ).toEqual([
    { text: 'See ' },
    { text: 'the guide', href: '/articles/a#block-0002' },
  ]);
  expect(
    sourceRuns(
      block('See the guide', [], [{ label: 'the guide', href: '#h.y' }]),
      resolve,
    ).unresolved,
  ).toEqual(['#h.y']);
});
