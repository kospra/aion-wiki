// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import * as staticVerifier from '../scripts/verify-static.mjs';

let root;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'aion-publish-'));
  for (const directory of [
    'articles',
    'assets',
    'categories',
    'images',
    'source',
  ])
    await mkdir(join(root, directory));
  for (const file of [
    '404.html',
    '__spa-fallback.html',
    'favicon.svg',
    'index.html',
  ])
    await writeFile(join(root, file), 'fixture');
  await writeFile(join(root, 'source', 'index.html'), 'source route');
  await writeFile(join(root, 'images', 'guide.png'), 'image');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('accepts a normal static publish root with the source route and images', async () => {
  await expect(staticVerifier.verifyPublishRoot(root)).resolves.toBeUndefined();
});

it('rejects a copied npm registry configuration', async () => {
  await writeFile(
    join(root, '.npmrc'),
    '//registry.example/:_authToken=secret',
  );
  await expect(staticVerifier.verifyPublishRoot(root)).rejects.toThrow(
    /Forbidden publish artifact.*\.npmrc/,
  );
});

it('rejects copied build tooling', async () => {
  await mkdir(join(root, 'scripts'));
  await writeFile(join(root, 'scripts', 'prepare-static.mjs'), 'tooling');
  await expect(staticVerifier.verifyPublishRoot(root)).rejects.toThrow(
    /Forbidden publish artifact.*scripts/,
  );
});
