import { writeFile } from 'node:fs/promises';
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
} finally {
  await server.close();
}
