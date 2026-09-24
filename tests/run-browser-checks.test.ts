import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

function listen(port = 0): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function close(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function runFixture(
  mode: string,
  port: number,
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(
      process.execPath,
      [resolve('tests/fixtures/launch-browser-checks.mjs'), mode, String(port)],
      {
        cwd: process.cwd(),
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once('error', reject);
    child.once('exit', (code) => resolveRun({ code, output }));
  });
}

const owned: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => {
  await Promise.all(owned.splice(0).map(close));
});

describe('browser checks runner', () => {
  it('exits nonzero on an occupied port without stopping its owner', async () => {
    const server = await listen();
    owned.push(server);
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Expected TCP port');

    const result = await runFixture('occupied', address.port);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/occupied/i);
    expect(server.listening).toBe(true);
  });

  it('exits nonzero after a failed child and releases its owned preview port', async () => {
    const probe = await listen();
    const address = probe.address();
    if (!address || typeof address === 'string')
      throw new Error('Expected TCP port');
    const port = address.port;
    await close(probe);

    const result = await runFixture('failure', port);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/exit code 17/i);

    const replacement = await listen(port);
    owned.push(replacement);
    expect(replacement.listening).toBe(true);
  }, 30_000);
});
