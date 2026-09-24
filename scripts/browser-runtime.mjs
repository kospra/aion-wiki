import process from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadChromium() {
  const root = process.env.GUIDE_BROWSER_ROOT;
  if (!root) return (await import('playwright')).chromium;

  const resolved = resolve(root);
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(resolved, 'browsers');
  process.env.LD_LIBRARY_PATH ??= resolve(
    resolved,
    'libs/usr/lib/x86_64-linux-gnu',
  );
  return (
    await import(
      pathToFileURL(resolve(resolved, 'node_modules/playwright/index.mjs')).href
    )
  ).chromium;
}
