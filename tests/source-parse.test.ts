// @vitest-environment node
import { gzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { imageSize } from '../scripts/source/images.ts';
import { decodeExport, parseExport } from '../scripts/source/parse.ts';
import { isSourceSpace } from '../scripts/source/text.ts';

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const page = (body: string, style = '') =>
  `<html><head><style>${style}</style></head><body>${body}</body></html>`;

it('reads gzip and plain exports and rejects anything else', () => {
  const html = page('<p>One</p>');
  expect(decodeExport(gzipSync(html))).toBe(html);
  expect(decodeExport(Buffer.from(html))).toBe(html);
  expect(() => decodeExport(Buffer.from('%PDF-1.7'))).toThrow(
    'not an HTML document',
  );
});

it('treats the capture whitespace set as spaces', () => {
  for (const code of [0x20, 0xa0, 0x1c, 0x2028, 0xfeff])
    expect(isSourceSpace(String.fromCodePoint(code))).toBe(true);
  expect(isSourceSpace('a')).toBe(false);
});

it('selects top-level blocks in order and collapses whitespace', () => {
  const { blocks } = parseExport(
    page(
      '<h2 id="h.a">Title</h2><p>  A&nbsp;&nbsp;b <span>c</span>\n</p>' +
        '<ul class="lst-kix_x-0"><li><p>nested</p></li></ul>' +
        '<table><tr><td>cell</td></tr></table>',
    ),
  );
  expect(blocks.map((block) => [block.tag, block.text])).toEqual([
    ['h2', 'Title'],
    ['p', 'A b c'],
    ['li', 'nested'],
    ['table', 'cell'],
  ]);
  expect(blocks[0].anchor).toBe('h.a');
});

it('keeps an inner line break as a newline and drops breaks at the edges', () => {
  const { blocks } = parseExport(
    page('<p><br>damage<br>At 2%<br></p><p>30%<br>&nbsp;more</p>'),
  );
  expect(blocks.map((block) => block.text)).toEqual([
    'damage\nAt 2%',
    '30%\nmore',
  ]);
});

it('records list numbering and nesting level', () => {
  const { blocks } = parseExport(
    page(
      '<ol class="lst-kix_n-0 start" start="3"><li>c</li><li>d</li></ol>' +
        '<ul class="lst-kix_n-1"><li>e</li></ul>',
    ),
  );
  expect(
    blocks.map(({ ordered, listStart, level }) => ({
      ordered,
      listStart,
      level,
    })),
  ).toEqual([
    { ordered: true, listStart: 3, level: 0 },
    { ordered: true, listStart: 4, level: 0 },
    { ordered: false, listStart: undefined, level: 1 },
  ]);
});

it('keeps raw links, numbers and the first descendant anchor', () => {
  const { blocks } = parseExport(
    page(
      '<p><span id="h.x"></span>See <a href="https://www.google.com/url?q=https://example.com&amp;ust=1">1,200 and 5.5%</a></p>',
    ),
  );
  expect(blocks[0]).toMatchObject({
    anchor: 'h.x',
    numbers: ['1,200', '5.5'],
    links: [
      {
        label: '1,200 and 5.5%',
        href: 'https://www.google.com/url?q=https://example.com&ust=1',
      },
    ],
  });
});

// Ported from archive/guide-migration/formatting-import.py.
it('positions formatting runs like the original importer', () => {
  const style =
    '.normal { font-style: normal } .italic { font-style: italic } ' +
    '.bold { font-weight: 700 } .marked { text-decoration: underline; background-color: #ffff00 }';
  const { blocks } = parseExport(
    page(
      '<p class="italic">  🎮&nbsp;<span class="normal">P<span>erks</span></span>\n\t' +
        '<span class="italic normal">Per<span class="bold marked"><a style="text-decoration:inherit">ks</a></span></span>' +
        ' tail <span style="font-style:normal">plain</span> end </p>',
      style,
    ),
  );
  expect(blocks[0].text).toBe('🎮 Perks Perks tail plain end');
  expect(blocks[0].formatting).toEqual([
    { text: '🎮', start: 0, end: 2, emphasis: true },
    { text: 'Per', start: 9, end: 12, emphasis: true },
    {
      text: 'ks',
      start: 12,
      end: 14,
      strong: true,
      emphasis: true,
      underline: true,
      highlight: '#ffff00',
    },
    { text: 'tail', start: 15, end: 19, emphasis: true },
    { text: 'end', start: 26, end: 29, emphasis: true },
  ]);
});

it('extracts embedded images with hash, size and placement', () => {
  const { blocks, images } = parseExport(
    page(
      `<p>x<img src="data:image/png;base64,${png}"></p>` +
        `<p><img alt="" src="data:image/png;base64,${png}"></p>`,
    ),
  );
  expect(images).toHaveLength(2);
  expect(images[0]).toMatchObject({ extension: 'png', width: 1, height: 1 });
  expect(images[0].sha256).toMatch(/^[0-9a-f]{64}$/u);
  expect(blocks.map((block) => block.images)).toEqual([[0], [1]]);
});

it('stops on images it cannot place or read', () => {
  expect(() =>
    parseExport(page('<p><img src="https://example.com/a.png"></p>')),
  ).toThrow('Unsupported image');
  expect(() =>
    parseExport(page('<p><img src="data:image/gif;base64,R0lGOD"></p>')),
  ).toThrow('Unsupported image');
  expect(() =>
    parseExport(
      page(`<div><img src="data:image/png;base64,${png}"></div><p>x</p>`),
    ),
  ).toThrow('outside any');
});

it('reads PNG and JPEG dimensions from their headers', () => {
  const pngHeader = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0,
    0, 0, 3,
  ]);
  expect(imageSize(pngHeader, 'png')).toEqual({ width: 2, height: 3 });
  const jpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b,
    0x08, 0x00, 0x02, 0x00, 0x03, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
  ]);
  expect(imageSize(jpeg, 'jpg')).toEqual({ width: 3, height: 2 });
});
