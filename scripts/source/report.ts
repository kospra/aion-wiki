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
  const title = (slug: string | null) =>
    slug ? (titles.get(slug) ?? slug) : 'no article';
  const count = (kind: string) =>
    alignment.changes.filter((change) => change.kind === kind).length;
  const items = (list: Flag[], empty: string) =>
    list.length
      ? list.map(
          ({ sourceId, pageSlug, reason }) =>
            `- \`${sourceId}\` in ${title(pageSlug)}: ${reason}`,
        )
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
    for (const touch of result.touched.filter(
      (item) => item.pageSlug === slug,
    )) {
      if (touch.kind === 'edited')
        lines.push(
          `- **Edited** \`${touch.sourceId}\`: ${quote(touch.before)} → ${quote(touch.after)}`,
        );
      else if (touch.kind === 'added')
        lines.push(`- **Added** \`${touch.sourceId}\`: ${quote(touch.after)}`);
      else
        lines.push(
          `- **Removed** \`${touch.sourceId}\`: ${quote(touch.before)}`,
        );
    }
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
