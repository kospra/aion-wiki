import type { Block, GuidePage, Inline } from './types';

/** Direct children, in the same order the rich renderer displays them. */
export function blockChildren(block: Block): Block[] {
  switch (block.kind) {
    case 'list':
      return block.items.flat();
    case 'table':
      return block.rows.flat(2);
    case 'group':
      return block.blocks;
    default:
      return [];
  }
}

export function walkBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => [
    block,
    ...walkBlocks(blockChildren(block)),
  ]);
}

export function inlineText(parts: Inline[]): string {
  return parts
    .map((part) => part.text + (part.breakAfter ? '\n' : ''))
    .join('');
}

/** Visible source-bearing runs only; captions and labels are editorial context. */
export function blockInlineSegments(block: Block): Inline[][] {
  switch (block.kind) {
    case 'paragraph':
    case 'heading':
    case 'note':
      return [block.content];
    case 'formula':
      return [[{ text: block.expression }], block.explanation];
    case 'table':
      return block.columns;
    default:
      return [];
  }
}

export function pageText(page: GuidePage): string {
  const text = [page.title, page.summary];
  for (const block of walkBlocks(page.blocks)) {
    text.push(...blockInlineSegments(block).map(inlineText));
    if (block.kind === 'table') text.push(block.caption);
    if (block.kind === 'note') text.push(block.label);
  }
  return text.filter(Boolean).join('\n');
}

/** Unwrap captured Google redirects, keeping the target's query and timestamp. */
export function normalizeSourceUrl(url: string): string | null {
  let value = url.trim();
  for (let depth = 0; depth < 8; depth++) {
    if (
      !value ||
      [...value].some(
        (character) =>
          character.charCodeAt(0) <= 32 ||
          character.charCodeAt(0) === 127 ||
          character.charCodeAt(0) === 92,
      )
    )
      return null;
    if (value.startsWith('#')) return value.length > 1 ? value : null;
    if (value.startsWith('/')) return value.startsWith('//') ? null : value;
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return null;
    }
    if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    if (
      ['www.google.com', 'google.com'].includes(parsed.hostname) &&
      parsed.pathname === '/url'
    ) {
      const destination =
        parsed.searchParams.get('q') ?? parsed.searchParams.get('url');
      if (!destination) return null;
      value = destination;
      continue;
    }
    return parsed.href;
  }
  return null;
}
