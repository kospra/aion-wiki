// Pull Kanon's Google Doc into the source snapshot and articles. See README "Syncing with the Google Doc".
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSync } from './source/sync.ts';

const args = process.argv.slice(2);
const from = args.includes('--from')
  ? args[args.indexOf('--from') + 1]
  : undefined;
try {
  const result = await runSync({
    root: resolve(fileURLToPath(new URL('..', import.meta.url))),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    allowDirty: args.includes('--allow-dirty'),
    from,
    log: (line) => console.log(line),
  });
  if (result.reportPath) console.log(`Report: ${result.reportPath}`);
  if (result.flags)
    console.log(
      `${result.flags} item(s) need attention; npm run check fails until they are resolved.`,
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
