import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
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
  sentinel?: string,
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve('tests/fixtures/launch-browser-checks.mjs'),
        mode,
        String(port),
        sentinel ?? '',
      ],
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

  it('never starts the next check after SIGTERM during the previous check', async () => {
    const probe = await listen();
    const address = probe.address();
    if (!address || typeof address === 'string')
      throw new Error('Expected TCP port');
    const port = address.port;
    await close(probe);
    const directory = mkdtempSync(join(tmpdir(), 'browser-interrupt-'));
    const sentinel = join(directory, 'next-check-ran');
    try {
      const result = await runFixture('interrupt', port, sentinel);
      expect(result.code).toBe(1);
      expect(existsSync(sentinel)).toBe(false);
      const replacement = await listen(port);
      owned.push(replacement);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30_000);

  it('rejects a competing HTTP 200 server that binds after the port probe', async () => {
    const probe = await listen();
    const address = probe.address();
    if (!address || typeof address === 'string')
      throw new Error('Expected TCP port');
    const port = address.port;
    await close(probe);

    const result = await runFixture('race', port);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/preview|occupied|ready/i);
    const replacement = await listen(port);
    owned.push(replacement);
  }, 30_000);
  it('does not spawn a check whose abort signal is already set', async () => {
    const { runNode } = await import('../scripts/run-browser-checks.mjs');
    const directory = mkdtempSync(join(tmpdir(), 'browser-preabort-'));
    const sentinel = join(directory, 'check-ran');
    const controller = new AbortController();
    controller.abort();
    try {
      await expect(
        runNode(
          resolve('tests/fixtures/browser-check-sentinel.mjs'),
          ['http://127.0.0.1:1', sentinel],
          controller.signal,
        ),
      ).rejects.toThrow(/interrupt|abort/i);
      expect(existsSync(sentinel)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
