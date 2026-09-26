// @vitest-environment node
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
import { siteOrigin } from '../app/seo.ts';
import {
  checkSearchMetadata,
  checkSiteOrigin,
} from '../scripts/verify-static.mjs';

const page = (tags) =>
  new JSDOM(`<!doctype html><html><head>${tags}</head><body></body></html>`)
    .window.document;
const shareImage = `<meta property="og:image" content="${siteOrigin}/images/share-card.png">`;

it('accepts an indexable page whose canonical link and og:url agree', () => {
  const url = `${siteOrigin}/`;
  expect(
    checkSearchMetadata(
      '/',
      page(
        `<link rel="canonical" href="${url}"><meta property="og:url" content="${url}">${shareImage}`,
      ),
    ),
  ).toEqual({ indexed: url, image: '/images/share-card.png' });
});

it('names the page whose structured data is not valid JSON', () => {
  const url = `${siteOrigin}/`;
  expect(() =>
    checkSearchMetadata(
      '/',
      page(
        `<link rel="canonical" href="${url}"><meta property="og:url" content="${url}">${shareImage}<script type="application/ld+json">{"@context": </script>`,
      ),
    ),
  ).toThrow(/^\/: structured data is not valid JSON/);
});

it('rejects noindex on a kind of page that search does not know yet', () => {
  expect(() =>
    checkSearchMetadata(
      '/glossary',
      page(
        `<meta name="robots" content="noindex"><meta property="og:url" content="${siteOrigin}/glossary/">${shareImage}`,
      ),
    ),
  ).toThrow(/placeholder/);
});

it('stops a production deploy whose primary domain differs from siteOrigin', () => {
  expect(() =>
    checkSiteOrigin({ CONTEXT: 'production', URL: 'https://renamed.example' }),
  ).toThrow(/siteOrigin/);
  expect(() =>
    checkSiteOrigin({ CONTEXT: 'production', URL: `${siteOrigin}/` }),
  ).not.toThrow();
});

it('leaves previews, branch deploys and local builds alone', () => {
  for (const env of [
    { CONTEXT: 'deploy-preview', URL: 'https://renamed.example' },
    { CONTEXT: 'branch-deploy', URL: 'https://renamed.example' },
    {},
  ])
    expect(() => checkSiteOrigin(env)).not.toThrow();
});
