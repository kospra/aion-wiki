import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('browser runtime', () => {
  it('loads repository Chromium without WSL environment defaults', async () => {
    vi.stubEnv('GUIDE_BROWSER_ROOT', '');
    const browserPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    const libraryPath = process.env.LD_LIBRARY_PATH;
    const { loadChromium } = await import('../scripts/browser-runtime.mjs');

    expect((await loadChromium()).name()).toBe('chromium');
    expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe(browserPath);
    expect(process.env.LD_LIBRARY_PATH).toBe(libraryPath);
  });

  it('rejects an invalid explicit browser root', async () => {
    vi.stubEnv('GUIDE_BROWSER_ROOT', '/this-browser-root-does-not-exist');
    const { loadChromium } = await import('../scripts/browser-runtime.mjs');

    await expect(loadChromium()).rejects.toThrow();
  });
});
