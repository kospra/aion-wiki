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
} finally {
  await server.close();
}
