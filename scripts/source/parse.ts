import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';
import { imageSize } from './images.ts';
import type {
  ParsedBlock,
  ParsedExport,
  ParsedImage,
  SourceBlock,
} from './model.ts';
import { isSourceSpace, LINE_BREAK, numbersIn } from './text.ts';

const BLOCKS = 'p,li,h1,h2,h3,h4,h5,h6,table';

/** Google serves the HTML export gzip-compressed without saying so; detect it by its bytes. */
export function decodeExport(bytes: Uint8Array): string {
  const raw =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? gunzipSync(bytes)
      : Buffer.from(bytes);
  const html = raw.toString('utf8');
  if (!/^\s*<html[\s>]/iu.test(html))
    throw new Error('The export is not an HTML document');
  return html;
}

const IMAGE_TAG = /<img\b[^>]*>/giu;
const EMBEDDED = /\ssrc="data:image\/(png|jpeg);base64,([^"]*)"/iu;

/** Swap embedded images for placeholders so the parser reads kilobytes, not megabytes. */
function extractImages(html: string): { html: string; images: ParsedImage[] } {
  const images: ParsedImage[] = [];
  const stripped = html.replace(IMAGE_TAG, (tag) => {
    const match = EMBEDDED.exec(tag);
    if (!match)
      throw new Error(`Unsupported image in the export: ${tag.slice(0, 80)}`);
    const bytes = Buffer.from(match[2], 'base64');
    const extension = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
    images.push({
      sha256: createHash('sha256').update(bytes).digest('hex'),
      extension,
      bytes,
      ...imageSize(bytes, extension),
    });
    return tag.replace(match[0], ` data-source-image="${images.length - 1}"`);
  });
  return { html: stripped, images };
}

type Style = Record<string, string>;
type Rule = [string, Style];
type Chunk = { text: string; style: Style; lineBreak?: boolean };
type Character = { value: string; origin: number };
type Formatting = SourceBlock['formatting'][number];

function declarations(body: string): Style {
  const result: Style = {};
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon >= 0)
      result[declaration.slice(0, colon).trim()] = declaration
        .slice(colon + 1)
        .trim();
  }
  return result;
}

/** Single-class rules in stylesheet order, as the original importer read them. */
function classRules(css: string): Rule[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]+)\}/gu)].flatMap(
    ([, selector, body]): Rule[] =>
      /^\.[A-Za-z0-9_-]+$/u.test(selector.trim())
        ? [[selector.trim().slice(1), declarations(body)]]
        : [],
  );
}

function styleOf(element: Element, inherited: Style, rules: Rule[]): Style {
  const names = new Set(element.classList);
  const applied: Style = {};
  for (const [name, values] of rules)
    if (names.has(name)) Object.assign(applied, values);
  Object.assign(applied, declarations(element.getAttribute('style') ?? ''));
  const current = { ...inherited };
  for (const [key, value] of Object.entries(applied))
    if (value !== 'inherit') current[key] = value;
  return current;
}

/** Text nodes with their inherited style; text after a closing tag belongs to its parent. */
function chunksOf(element: Element, rules: Rule[]): Chunk[] {
  const ancestors: Element[] = [];
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  )
    ancestors.unshift(parent);
  let inherited: Style = {};
  for (const ancestor of ancestors)
    inherited = styleOf(ancestor, inherited, rules);
  const chunks: Chunk[] = [];
  const visit = (node: Element, parentStyle: Style) => {
    const style = styleOf(node, parentStyle, rules);
    if (node.tagName === 'BR') {
      chunks.push({ text: '', style, lineBreak: true });
      return;
    }
    for (const child of node.childNodes) {
      if (child.nodeType === 3)
        chunks.push({ text: child.textContent ?? '', style });
      else if (child.nodeType === 1) visit(child as Element, style);
    }
  };
  visit(element, inherited);
  return chunks;
}

/** One space per whitespace run, or a newline when the run holds a `<br>`; trimmed. */
function normalize(chunks: Chunk[]): Character[] {
  const characters: Character[] = [];
  const space = (value: string, origin: number) => {
    const last = characters.at(-1);
    if (!last) return;
    if (last.value === ' ' || last.value === LINE_BREAK) {
      if (value === LINE_BREAK) last.value = LINE_BREAK;
      return;
    }
    characters.push({ value, origin });
  };
  chunks.forEach((chunk, origin) => {
    if (chunk.lineBreak) space(LINE_BREAK, origin);
    else
      for (const value of chunk.text) {
        if (isSourceSpace(value)) space(' ', origin);
        else characters.push({ value, origin });
      }
  });
  while ([' ', LINE_BREAK].includes(characters.at(-1)?.value ?? ''))
    characters.pop();
  return characters;
}

/** Half-open UTF-16 ranges per text node, kept when the node carries inline styling. */
function formattingRuns(
  characters: Character[],
  chunks: Chunk[],
): Formatting[] {
  const text = characters.map((character) => character.value).join('');
  const spans = new Map<number, [number, number]>();
  let offset = 0;
  for (const { value, origin } of characters) {
    if (value !== ' ' && value !== LINE_BREAK)
      spans.set(origin, [
        spans.get(origin)?.[0] ?? offset,
        offset + value.length,
      ]);
    offset += value.length;
  }
  const runs: Formatting[] = [];
  chunks.forEach((chunk, origin) => {
    const span = spans.get(origin);
    if (!span) return;
    const run: Formatting = {
      text: text.slice(span[0], span[1]),
      start: span[0],
      end: span[1],
    };
    const weight = chunk.style['font-weight'] ?? '';
    if (weight === 'bold' || (/^\d+$/u.test(weight) && Number(weight) >= 600))
      run.strong = true;
    if (['italic', 'oblique'].includes(chunk.style['font-style'] ?? ''))
      run.emphasis = true;
    if ((chunk.style['text-decoration'] ?? '').includes('underline'))
      run.underline = true;
    const highlight = (chunk.style['background-color'] ?? '').toLowerCase();
    if (highlight && !['transparent', '#ffffff', 'white'].includes(highlight))
      run.highlight = highlight;
    if (Object.keys(run).length > 3) runs.push(run);
  });
  return runs;
}

export function parseExport(source: string): ParsedExport {
  const { html, images } = extractImages(source);
  const { document } = new JSDOM(html).window;
  const rules = classRules(
    [...document.querySelectorAll('style')]
      .map((node) => node.textContent ?? '')
      .join('\n'),
  );
  let placed = 0;
  const blocks = [...document.body.querySelectorAll(BLOCKS)]
    .filter((element) => !element.parentElement?.closest(BLOCKS))
    .map((element): ParsedBlock => {
      const chunks = chunksOf(element, rules);
      const characters = normalize(chunks);
      const text = characters.map((character) => character.value).join('');
      const block: ParsedBlock = {
        tag: element.tagName.toLowerCase(),
        text,
        numbers: numbersIn(text),
        links: [...element.querySelectorAll('a[href]')].map((link) => ({
          label: link.textContent ?? '',
          href: link.getAttribute('href') ?? '',
        })),
        formatting: formattingRuns(characters, chunks),
        images: [...element.querySelectorAll('img[data-source-image]')].map(
          (image) => Number(image.getAttribute('data-source-image')),
        ),
      };
      const anchor = [element, ...element.querySelectorAll('[id]')]
        .map((node) => node.id)
        .find(Boolean);
      if (anchor) block.anchor = anchor;
      const list = element.parentElement;
      if (element.tagName === 'LI' && list) {
        if (list.tagName === 'OL') {
          block.ordered = true;
          block.listStart =
            Number(list.getAttribute('start') ?? '1') +
            [...list.children].indexOf(element);
        } else if (list.tagName === 'UL') block.ordered = false;
        const level = [...list.classList]
          .map((name) => /^lst-kix_\w+-(\d+)$/u.exec(name)?.[1])
          .find((value) => value !== undefined);
        if (level !== undefined) block.level = Number(level);
      }
      placed += block.images.length;
      return block;
    });
  if (placed !== images.length)
    throw new Error(
      'An image in the export sits outside any paragraph, list item, heading or table',
    );
  return { blocks, images };
}
