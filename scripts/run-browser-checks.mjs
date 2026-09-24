/* global fetch, AbortSignal, AbortController */
import console from 'node:console';
import process from 'node:process';
import { setTimeout, clearTimeout } from 'node:timers';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const servePackage = require.resolve('serve/package.json');
const serveEntry = resolve(
  dirname(servePackage),
  JSON.parse(readFileSync(servePackage, 'utf8')).bin.serve,
);
const defaultChecks = [
  'verify-guide-browser.mjs',
  'verify-editorial.mjs',
  'verify-reduced-motion.mjs',
];

function assertFreePort(port) {
  return new Promise((resolveFree, reject) => {
    const probe = createServer();
    probe.once('error', (error) => {
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`Browser preview port ${port} is occupied`)
          : error,
      );
    });
    probe.listen(port, '127.0.0.1', () => probe.close(resolveFree));
  });
}

function waitForExit(child, timeoutMs = 5000) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve();
  return new Promise((resolveExit) => {
    const timeout = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

function runNode(file, args, signal) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [file, ...args], {
      stdio: 'inherit',
      shell: false,
    });
    const abort = () => child.kill('SIGTERM');
    signal.addEventListener('abort', abort, { once: true });
    child.once('error', (error) => {
      signal.removeEventListener('abort', abort);
      reject(error);
    });
    child.once('exit', (code, terminationSignal) => {
      signal.removeEventListener('abort', abort);
      if (code === 0 && !signal.aborted) resolveRun();
      else
        reject(
          new Error(
            `${file} exited with exit code ${code ?? terminationSignal}`,
          ),
        );
    });
  });
}

async function waitForReady(baseUrl, child, signal, getServerError) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error('Browser checks interrupted');
    if (getServerError()) throw getServerError();
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `Browser preview exited before readiness: ${child.exitCode ?? child.signalCode}`,
      );
    }
    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error('Browser preview was not ready within 20 seconds');
}

export async function runBrowserChecks({
  port = 4177,
  checks = defaultChecks.map((script) => resolve('scripts', script)),
} = {}) {
  await assertFreePort(port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  let server;
  try {
    server = spawn(
      process.execPath,
      [serveEntry, 'build/client', '-l', `tcp://127.0.0.1:${port}`],
      {
        stdio: 'inherit',
        shell: false,
      },
    );
    let serverError;
    server.once('error', (error) => {
      serverError = error;
    });
    await waitForReady(baseUrl, server, controller.signal, () => serverError);
    if (serverError) throw serverError;
    for (const script of checks) {
      await runNode(script, [baseUrl], controller.signal);
    }
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    if (server) {
      if (server.exitCode === null && server.signalCode === null)
        server.kill('SIGTERM');
      await waitForExit(server);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runBrowserChecks().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
