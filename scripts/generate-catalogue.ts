import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { inlineText, pageText, walkBlocks } from '../app/content/reader.ts';
import type { Figure, GuidePage } from '../app/content/types.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(resolve(root, path), 'utf8')) as T;

const categories = await readJson<
  { slug: string; title: string; description: string }[]
>('content/source/category-contract.json');
const figures = (
  await Promise.all(
    ['a', 'b', 'c'].map((group) =>
      readJson<Figure[]>(`app/content/figures/group-${group}.json`),
    ),
  )
).flat();
const chapters = await Promise.all(
  Array.from({ length: 12 }, (_, index) =>
    readJson<GuidePage[]>(
      `app/content/chapters/chapter-${String(index + 1).padStart(2, '0')}.json`,
    ),
  ),
);
const articles = chapters.flat().map((page) => ({
  slug: page.slug,
  title: page.title,
  category: page.category,
  summary: page.summary,
  status: page.status,
  sourceUrl: page.sourceUrl,
  qualifiers: page.qualifiers,
  searchText: pageText(page, figures),
  headings: walkBlocks(page.blocks)
    .filter((block) => block.kind === 'heading')
    .map((block) => ({ id: block.id, title: inlineText(block.content) })),
}));
const output =
  JSON.stringify(
    {
      categories: categories.map(({ slug, title, description }) => ({
        slug,
        title,
        description,
      })),
      articles,
    },
    null,
    2,
  ) + '\n';
const path = resolve(root, 'app/content/catalogue.json');
if (process.argv.includes('--check')) {
  const current = await readFile(path, 'utf8').catch(() => '');
  if (current !== output) {
    console.error(
      'app/content/catalogue.json is stale; run npm run content:generate',
    );
    process.exitCode = 1;
  } else {
    console.log('Catalogue is current.');
  }
} else {
  await writeFile(path, output);
  console.log(
    `Generated ${articles.length} article entries across ${categories.length} chapters.`,
  );
}
