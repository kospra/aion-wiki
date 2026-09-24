import console from 'node:console';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { articles, categories, staticPaths } from '../app/content/wiki.ts';

const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      })[character],
  );

for (const route of staticPaths) {
  const file = join('build/client', route.slice(1), 'index.html');
  const html = await readFile(file, 'utf8');
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main, `${route}: missing main content`);
  assert.match(main, /<h1\b[^>]*>[\s\S]+?<\/h1>/, `${route}: missing heading`);
  assert.ok(
    main.replace(/<[^>]+>/g, '').trim().length > 100,
    `${route}: empty content`,
  );
  assert.doesNotMatch(
    html,
    /\/@vite\/client|\/@react-refresh|localhost:\d+|127\.0\.0\.1:\d+/,
    `${route}: development reference`,
  );
  assert.match(
    main,
    /Sample content|sample content/,
    `${route}: missing sample disclosure`,
  );
  const article = articles.find((entry) => route === `/articles/${entry.slug}`);
  const category = categories.find(
    (entry) => route === `/categories/${entry.slug}`,
  );
  if (article) {
    assert.ok(
      main.includes(escapeHtml(article.title)),
      `${route}: missing article title`,
    );
    for (const section of article.sections) {
      assert.ok(
        main.includes(escapeHtml(section.heading)),
        `${route}: missing section heading`,
      );
      assert.ok(
        main.includes(escapeHtml(section.body)),
        `${route}: missing article text`,
      );
    }
  }
  if (category)
    assert.ok(
      main.includes(escapeHtml(category.title)),
      `${route}: missing category title`,
    );
}
console.log(`Verified ${staticPaths.length} prerendered routes.`);
