import process from 'node:process';
import { writeFileSync } from 'node:fs';

writeFileSync(process.argv[3] ?? process.env.BROWSER_CHECK_SENTINEL, 'ran');
