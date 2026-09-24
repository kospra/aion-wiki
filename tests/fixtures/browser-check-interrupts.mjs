import process from 'node:process';
import { setTimeout } from 'node:timers/promises';

process.kill(process.ppid, 'SIGTERM');
await setTimeout(100);
