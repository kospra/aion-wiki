import console from 'node:console';
import process from 'node:process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { runBrowserChecks } from '../../scripts/run-browser-checks.mjs';

const mode = process.argv[2];
const port = Number(process.argv[3]);
const sentinel = process.argv[4];
if (mode === 'interrupt') process.env.BROWSER_CHECK_SENTINEL = sentinel;
const checks =
  mode === 'failure'
    ? [resolve('tests/fixtures/browser-check-fails.mjs')]
    : mode === 'interrupt'
      ? [
          resolve('tests/fixtures/browser-check-interrupts.mjs'),
          resolve('tests/fixtures/browser-check-sentinel.mjs'),
        ]
      : [];
let competitor;
const afterPortProbe =
  mode === 'race'
    ? () =>
        new Promise((resolveBind, reject) => {
          competitor = createServer((_request, response) => {
            response.writeHead(200);
            response.end('A competing server');
          });
          competitor.once('error', reject);
          competitor.listen(port, '127.0.0.1', resolveBind);
        })
    : undefined;

const originalCwd = process.cwd();
const fixtureRoot = await mkdtemp(join(tmpdir(), 'browser-runner-fixture-'));
await mkdir(join(fixtureRoot, 'build/client'), { recursive: true });
await writeFile(
  join(fixtureRoot, 'build/client/index.html'),
  '<!doctype html><title>Fixture</title>',
);
process.chdir(fixtureRoot);

try {
  await runBrowserChecks({ port, checks, afterPortProbe });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (competitor)
    await new Promise((resolveClose) => competitor.close(resolveClose));
  process.chdir(originalCwd);
  await rm(fixtureRoot, { recursive: true, force: true });
}
