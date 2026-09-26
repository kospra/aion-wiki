// @vitest-environment node
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
import { renderNotFoundDocument } from '../scripts/static-not-found';

it('renders an independent styled 404 with a working home link', () => {
  const document = new JSDOM(renderNotFoundDocument()).window.document;
  expect(document.querySelector('h1')?.textContent).toBe('Page not found');
  expect(document.querySelector('a')?.getAttribute('href')).toBe('/');
  expect(document.querySelector('style')).not.toBeNull();
  expect(document.querySelector('script')).toBeNull();
  expect(document.documentElement.lang).toBe('en');
  expect(document.documentElement.className).toBe('dark');
  expect(document.querySelector('main')).not.toBeNull();
  expect(
    document.querySelector('meta[name="robots"]')?.getAttribute('content'),
  ).toBe('noindex');
  document.defaultView?.close();
});
