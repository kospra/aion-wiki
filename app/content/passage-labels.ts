import { blockInlineSegments, inlineText, walkBlocks } from './reader';
import type { GuidePage } from './types';

/** Labels for existing destinations; never changes the source text or URL. */
export function buildPassageLabels(
  pages: GuidePage[],
  pagePath: (slug: string) => string,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const page of pages) {
    const path = pagePath(page.slug);
    labels[path] = page.title;
    let section = page.title;
    for (const block of walkBlocks(page.blocks)) {
      const text = blockInlineSegments(block)
        .map(inlineText)
        .join(' ')
        .replace(/\s+/gu, ' ')
        .trim();
      if (block.kind === 'heading' && text) section = text;
      const full = text || section;
      const preview =
        full.length > 88
          ? `${full
              .slice(0, 88)
              .replace(/\s+\S*$/u, '')
              .trimEnd()}…`
          : full;
      labels[`${path}#${block.id}`] = preview;
    }
  }
  return labels;
}
