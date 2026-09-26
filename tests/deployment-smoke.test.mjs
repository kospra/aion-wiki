// @vitest-environment node
import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { checkDeployment } from '../scripts/verify-deployment.mjs';

const readJson = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalogue = readJson('../app/content/catalogue.json');
const categoryEntry = catalogue.categories[0];
const articleEntry = catalogue.articles[0];
const source = readJson('../app/content/source-overview.json');
const category = `/categories/${categoryEntry.slug}`;
const article = `/articles/${articleEntry.slug}`;
const image = readJson('../app/content/figures/group-a.json')[0].src;

let server;
let baseUrl;
let changes;

beforeEach(async () => {
  changes = new Map();
  server = createServer((request, response) => {
    const path = request.url;
    const override =
      changes.get(path) ??
      (path?.startsWith('/__deployment-smoke-missing-')
        ? (changes.get('missingPage') ?? {
            status: 404,
            body: '<h1>Page not found</h1><a href="/">Home</a>',
          })
        : path?.startsWith('/images/guide/__deployment-smoke-missing-')
          ? (changes.get('missingAsset') ?? {
              status: 404,
              body: 'missing image',
            })
          : undefined);
    if (override?.hang) return;
    const fixture = override ??
      {
        '/': { body: '<h1>Aion 2, explained.</h1><p>Kanon’s guide</p>' },
        [category]: {
          body: `<h1>${categoryEntry.title}</h1><p>Example category description.</p>`,
        },
        [`${category}/`]: {
          body: `<h1>${categoryEntry.title}</h1><p>Example category description.</p>`,
        },
        [article]: {
          body: `<h1>${articleEntry.title}</h1><p>Example article body.</p>`,
        },
        [`${article}/`]: {
          body: `<h1>${articleEntry.title}</h1><p>Example article body.</p>`,
        },
        '/source': {
          body: `<h1>${source.title}</h1><p>Example source description.</p>`,
        },
        '/source/': {
          body: `<h1>${source.title}</h1><p>Example source description.</p>`,
        },
        [image]: { body: Buffer.from([137, 80, 78, 71]), type: 'image/png' },
        '/robots.txt': {
          body: 'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n',
          type: 'text/plain; charset=utf-8',
        },
        '/sitemap.xml': {
          body: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>\n',
          type: 'application/xml',
        },
      }[path] ?? { status: 404, body: 'missing' };
    response.writeHead(fixture.status ?? 200, {
      'content-type': fixture.type ?? 'text/html; charset=utf-8',
      ...fixture.headers,
    });
    response.end(fixture.body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

it('accepts representative HTML and image routes with semantic 404s', async () => {
  await expect(checkDeployment(baseUrl)).resolves.toBeUndefined();
});

it('accepts redirects to trailing slashes on the same origin', async () => {
  for (const path of [category, article, '/source']) {
    changes.set(path, { status: 308, headers: { location: `${path}/` } });
  }
  await expect(checkDeployment(baseUrl)).resolves.toBeUndefined();
});

it('rejects a different origin even when every redirected response is valid', async () => {
  const redirector = createServer((request, response) => {
    response.writeHead(302, { location: `${baseUrl}${request.url}` });
    response.end();
  });
  await new Promise((resolve) => redirector.listen(0, '127.0.0.1', resolve));
  const redirectUrl = `http://127.0.0.1:${redirector.address().port}`;
  try {
    await expect(checkDeployment(redirectUrl)).rejects.toThrow(
      /origin|redirect/i,
    );
  } finally {
    redirector.closeAllConnections();
    await new Promise((resolve) => redirector.close(resolve));
  }
});
it('rejects a soft 404 for an unknown page', async () => {
  changes.set('missingPage', { status: 200, body: '<h1>Aion 2 Wiki</h1>' });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(/404/);
});

it('rejects a missing referenced image', async () => {
  changes.set(image, { status: 404, body: 'missing' });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(/image|404/i);
});

it.each([
  ['/robots.txt', 'User-agent: *\nAllow: /\n', /robots/i],
  ['/sitemap.xml', '<h1>Aion 2, explained.</h1>', /sitemap/i],
])(
  'rejects %s without its search engine content',
  async (path, body, error) => {
    changes.set(path, { body });
    await expect(checkDeployment(baseUrl)).rejects.toThrow(error);
  },
);

it('rejects fallback HTML at a known article route', async () => {
  changes.set(article, {
    body: `<h1>Aion 2 Wiki</h1><nav><a href="${article}">${articleEntry.title}</a></nav>`,
  });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(
    /article\/page title/i,
  );
});

it('rejects an incorrect HTML content type', async () => {
  changes.set('/', { body: '<h1>Aion 2 Wiki</h1>', type: 'text/plain' });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(/content.type/i);
});

it('rejects a nonexistent asset served as HTML with status 200', async () => {
  changes.set('missingAsset', { body: '<h1>Page not found</h1>' });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(/404/);
});

it('times out when the server does not answer', async () => {
  changes.set('/', { hang: true });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(/timed out/i);
}, 12_000);

it.each([
  'ftp://example.com',
  'https://user:pass@example.com',
  'https://example.com/path',
  'https://example.com/?draft=1',
  'https://example.com/#part',
  'not-a-url',
])('rejects invalid site URL %s', async (url) => {
  await expect(checkDeployment(url)).rejects.toThrow(/URL/i);
});
