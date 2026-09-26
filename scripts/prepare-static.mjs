import { rm, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { renderNotFoundDocument } = await server.ssrLoadModule(
    '/scripts/static-not-found.tsx',
  );
  await writeFile('build/client/404.html', renderNotFoundDocument(), 'utf8');
  const { renderRobots, renderSitemap, sitemapUrls } =
    await server.ssrLoadModule('/app/seo.ts');
  await writeFile(
    'build/client/sitemap.xml',
    renderSitemap(sitemapUrls()),
    'utf8',
  );
  await writeFile('build/client/robots.txt', renderRobots(), 'utf8');
  // Every route is prerendered and unknown paths get the static 404 page, so
  // nothing serves React Router's SPA fallback shell. Published, it would only
  // be an empty page that search engines could index.
  await rm('build/client/__spa-fallback.html', { force: true });
} finally {
  await server.close();
}
