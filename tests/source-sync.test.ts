// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { validateGuide } from '../scripts/content-integrity.ts';
import { baselineDigest } from '../scripts/source/captures.ts';
import type { ContentSet } from '../scripts/source/model.ts';
import { loadContent, runSync } from '../scripts/source/sync.ts';
import {
  exportHtml,
  fixtureContent,
  guideInput,
} from './fixtures/source-sync.ts';

const SECOND =
  '<p>About text</p><p>More about text</p><h1>CH 1: Basics</h1><h2 id="h.intro">Intro</h2>' +
  '<p>Alpha has 12 points.</p><p>Beta arrives.</p><ul class="lst-kix_a-0"><li>First item</li></ul><p></p>';

async function write(root: string, path: string, value: unknown) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(
    join(root, path),
    typeof value === 'string' || value instanceof Uint8Array
      ? value
      : JSON.stringify(value, null, 2),
  );
}

async function fixtureRoot(content: ContentSet = fixtureContent()) {
  const root = await mkdtemp(join(tmpdir(), 'doc-sync-'));
  await write(root, 'content/source/baseline.json', content.baseline);
  await write(root, 'content/source/taxonomy.json', content.taxonomy);
  await write(root, 'content/source/captures.json', content.captures);
  await write(root, 'app/content/source-overview.json', content.overview);
  for (const { file, pages } of content.chapters)
    await write(root, `app/content/chapters/${file}`, pages);
  for (const { file, entries } of content.coverage)
    await write(root, `content/coverage/${file}`, entries);
  for (const { file, entries } of content.figures)
    await write(root, `app/content/figures/${file}`, entries);
  await write(root, 'export.html.gz', gzipSync(exportHtml(SECOND)));
  return root;
}
const now = new Date('2026-10-07T12:00:00.000Z');

it('updates articles, snapshot and captures from a saved export', async () => {
  const root = await fixtureRoot();
  const result = await runSync({
    root,
    from: join(root, 'export.html.gz'),
    allowDirty: true,
    now,
  });
  expect(result).toEqual({
    changed: true,
    flags: 0,
    reportPath: 'content/source/changes/2026-10-07.md',
  });
  const content = await loadContent(root);
  expect(validateGuide(guideInput(content))).toEqual([]);
  expect(content.captures).toHaveLength(2);
  expect(content.captures[1]).toMatchObject({
    nextBlock: 10,
    report: 'content/source/changes/2026-10-07.md',
    baselineDigest: baselineDigest(content.baseline),
  });
  expect(await readFile(join(root, result.reportPath!), 'utf8')).toContain(
    'Beta arrives.',
  );
  expect(
    existsSync(
      join(
        root,
        '.local-tools/source-doc/captures/2026-10-07T12-00-00-000Z.html.gz',
      ),
    ),
  ).toBe(true);
});

it('writes nothing on a second run over the same export', async () => {
  const root = await fixtureRoot();
  await runSync({
    root,
    from: join(root, 'export.html.gz'),
    allowDirty: true,
    now,
  });
  const before = await readFile(
    join(root, 'content/source/captures.json'),
    'utf8',
  );
  expect(
    await runSync({
      root,
      from: join(root, 'export.html.gz'),
      allowDirty: true,
      now,
    }),
  ).toEqual({ changed: false, flags: 0, reportPath: null });
  expect(
    await readFile(join(root, 'content/source/captures.json'), 'utf8'),
  ).toBe(before);
});

it('writes nothing on a dry run', async () => {
  const root = await fixtureRoot();
  const before = await readFile(
    join(root, 'content/source/baseline.json'),
    'utf8',
  );
  expect(
    await runSync({
      root,
      from: join(root, 'export.html.gz'),
      dryRun: true,
      now,
    }),
  ).toEqual({ changed: true, flags: 0, reportPath: null });
  expect(
    await readFile(join(root, 'content/source/baseline.json'), 'utf8'),
  ).toBe(before);
});

it('writes nothing when the export is not HTML', async () => {
  const root = await fixtureRoot();
  await write(root, 'broken.html', '%PDF-1.7');
  const before = await readFile(
    join(root, 'content/source/baseline.json'),
    'utf8',
  );
  await expect(
    runSync({ root, from: join(root, 'broken.html'), allowDirty: true, now }),
  ).rejects.toThrow('not an HTML document');
  expect(
    await readFile(join(root, 'content/source/baseline.json'), 'utf8'),
  ).toBe(before);
});

it('refuses to run over uncommitted content changes', async () => {
  const root = await fixtureRoot();
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        ...args,
      ],
      { cwd: root },
    );
  git('init', '--quiet');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');
  await write(root, 'content/coverage/group-a.json', '[]');
  await expect(
    runSync({ root, from: join(root, 'export.html.gz'), now }),
  ).rejects.toThrow('uncommitted changes');
});
