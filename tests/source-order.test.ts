import { expect, it } from 'vitest';
import {
  pageForSource,
  sourceDistance,
  sourcePositions,
} from '../app/content/source-order';

it('places blocks in article ranges by snapshot order, not ID number', () => {
  const positions = sourcePositions([
    'block-0001',
    'block-0002',
    'block-1269',
    'block-0003',
  ]);
  const ranges = [
    { slug: 'first', firstBlock: 'block-0001', lastBlock: 'block-0002' },
    { slug: 'second', firstBlock: 'block-1269', lastBlock: 'block-0003' },
  ];
  expect(pageForSource('block-1269', positions, ranges)).toBe('second');
  expect(pageForSource('block-0003', positions, ranges)).toBe('second');
  expect(pageForSource('block-9999', positions, ranges)).toBeUndefined();
  expect(sourceDistance(positions, 'block-0002', 'block-0003')).toBe(2);
});
