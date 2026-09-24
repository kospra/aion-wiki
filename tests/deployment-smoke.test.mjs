// @vitest-environment node
import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { checkDeployment } from '../scripts/verify-deployment.mjs';

const category = '/categories/gear-and-basics-explained';
const article = '/articles/gear-anatomy-and-stat-layers';
const image =
  '/images/guide/75c12a28cb5482b515bd5690a050cbaf35ef78f6cc70fd38830633edbae241e0.png';

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
        '/': { body: '<h1>Aion 2 Wiki</h1><p>Kanon’s guide</p>' },
        [category]: {
          body: '<h1>Gear and basics explained</h1><p>Equipment stat layers and Pantheon priorities.</p>',
        },
        [`${category}/`]: {
          body: '<h1>Gear and basics explained</h1><p>Equipment stat layers and Pantheon priorities.</p>',
        },
        [article]: {
          body: '<h1>Gear anatomy and stat layers</h1><p>Enhancement/Amp Level</p>',
        },
        [`${article}/`]: {
          body: '<h1>Gear anatomy and stat layers</h1><p>Enhancement/Amp Level</p>',
        },
        '/source': {
          body: '<h1>About the source and author</h1><p>Kanon’s original words</p>',
        },
        '/source/': {
          body: '<h1>About the source and author</h1><p>Kanon’s original words</p>',
        },
        [image]: { body: Buffer.from([137, 80, 78, 71]), type: 'image/png' },
      }[path] ?? { status: 404, body: 'missing' };
    response.writeHead(fixture.status ?? 200, {
      'content-type': fixture.type ?? 'text/html; charset=utf-8',
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

it('rejects a soft 404 for an unknown page', async () => {
  changes.set('missingPage', { status: 200, body: '<h1>Aion 2 Wiki</h1>' });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(/404/);
});

it('rejects a missing referenced image', async () => {
  changes.set(image, { status: 404, body: 'missing' });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(/image|404/i);
});

it('rejects fallback HTML at a known article route', async () => {
  changes.set(article, { body: '<h1>Page not found</h1><a href="/">Home</a>' });
  await expect(checkDeployment(baseUrl)).rejects.toThrow(
    /Gear anatomy|article/i,
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
