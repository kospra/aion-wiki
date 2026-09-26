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
  expect(
    updateNote([{ text: 'Intro' }, { text: '***Update Note 9/20: x' }]),
  ).toBe('***Update Note 9/20: x');
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
    titles: new Map([
      ['about', 'About'],
      ['basics', 'Basics'],
    ]),
  });
  expect(report).toContain('# Google Doc sync 2026-10-07');
  expect(report).toContain('Update Note 10/6: new values');
  expect(report).toContain('| Edited | 1 |');
  expect(report).toContain('| Added | 1 |');
  expect(report).toContain(
    '- `block-0009` in Basics: A new block at the start of an article; place it by hand',
  );
  expect(report).toContain('### Basics');
  expect(report).toContain(
    '- **Edited** `block-0005`: “Alpha has 10 points.” → “Alpha has 12 points.”',
  );
});

it('says so when nothing needs attention', () => {
  const content = fixtureContent();
  const alignment = alignFixture(
    content,
    '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2>' +
      '<p>Alpha has 10 points.</p><ul class="lst-kix_a-0"><li>First item</li><li>Second item</li></ul><p></p>',
  );
  const report = renderReport({
    capture,
    alignment,
    result: reconcile(content, alignment),
    titles: new Map(),
  });
  expect(report).toContain('Nothing. `npm run check` should pass.');
  expect(report).toContain('No block changes.');
});
