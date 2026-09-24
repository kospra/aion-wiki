import console from 'node:console';
import process from 'node:process';
import { resolve } from 'node:path';
import { runBrowserChecks } from '../../scripts/run-browser-checks.mjs';

const mode = process.argv[2];
const port = Number(process.argv[3]);
const checks =
  mode === 'failure' ? [resolve('tests/fixtures/browser-check-fails.mjs')] : [];

runBrowserChecks({ port, checks }).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
