import type { Inline } from '../../app/content/types';
import type { SourceBlock } from './model.ts';
import { LINE_BREAK } from './text.ts';

type Marks = Omit<Inline, 'text' | 'breakAfter'>;

const sameMarks = (a: Marks, b: Marks) =>
  a.strong === b.strong &&
  a.emphasis === b.emphasis &&
  a.underline === b.underline &&
  a.highlight === b.highlight &&
  a.href === b.href;

/** Truthy marks only, in the key order the article JSON uses. */
function run(text: string, marks: Marks): Inline {
  const result: Inline = { text };
  if (marks.strong) result.strong = true;
  if (marks.emphasis) result.emphasis = true;
  if (marks.underline) result.underline = true;
  if (marks.highlight) result.highlight = marks.highlight;
  if (marks.href) result.href = marks.href;
  return result;
}

/** Article runs for a source block: formatting, resolved links and line breaks. */
export function sourceRuns(
  block: SourceBlock,
  resolve: (href: string) => string | null,
): { runs: Inline[]; unresolved: string[] } {
  const text = block.text;
  const marks: Marks[] = Array.from({ length: text.length }, () => ({}));
  for (const formatting of block.formatting)
    for (let index = formatting.start; index < formatting.end; index++) {
      if (formatting.strong) marks[index].strong = true;
      if (formatting.emphasis) marks[index].emphasis = true;
      if (formatting.underline) marks[index].underline = true;
      if (formatting.highlight) marks[index].highlight = formatting.highlight;
    }
  const unresolved: string[] = [];
  const flat = text.split(LINE_BREAK).join(' ');
  let cursor = 0;
  for (const link of block.links) {
    const label = link.label.replace(/\s+/gu, ' ').trim();
    // Blank captured anchors belong to the neighbouring labeled link.
    if (!label) continue;
    const start = flat.indexOf(label, cursor);
    const href = start >= 0 ? resolve(link.href) : null;
    if (start < 0 || !href) {
      unresolved.push(link.href);
      continue;
    }
    cursor = start + label.length;
    for (let index = start; index < cursor; index++) marks[index].href = href;
  }
  // A space between two runs with identical marks joins them.
  const isGap = (character: string) =>
    character === ' ' || character === LINE_BREAK;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== ' ') continue;
    let before = index - 1;
    while (before >= 0 && isGap(text[before])) before--;
    let after = index + 1;
    while (after < text.length && isGap(text[after])) after++;
    if (
      before >= 0 &&
      after < text.length &&
      sameMarks(marks[before], marks[after])
    )
      marks[index] = { ...marks[before] };
  }
  const runs: Inline[] = [];
  let current: Inline | undefined;
  for (let index = 0; index < text.length; index++) {
    if (text[index] === LINE_BREAK) {
      if (current) current.breakAfter = true;
      current = undefined;
      continue;
    }
    if (current && sameMarks(current, marks[index]))
      current.text += text[index];
    else {
      current = run(text[index], marks[index]);
      runs.push(current);
    }
  }
  return { runs, unresolved };
}
