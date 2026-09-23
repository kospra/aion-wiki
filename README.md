# Aion 2 Wiki

A statically built React wiki foundation. The homepage and shared shell are in place; browsable sample entries and search are the next stage. Current page text is introductory copy, not verified game information.

## Requirements

- Node.js 24.15+ (or 22.22.2+)
- npm

## Run locally

```sh
npm ci
npm run dev
```

Open the URL shown by React Router (normally `http://localhost:5173`).

This workspace's bundled Node has no npm command on `PATH`. In PowerShell, the following installs the official npm CLI into an ignored project-local folder and runs the same lockfile install:

```powershell
$nodeExe = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$npmRoot = Join-Path (Get-Location) '.local-tools/npm'
New-Item -ItemType Directory -Force -Path $npmRoot | Out-Null
Invoke-WebRequest 'https://registry.npmjs.org/npm/-/npm-12.1.0.tgz' -OutFile (Join-Path $npmRoot 'npm.tgz')
tar.exe -xzf (Join-Path $npmRoot 'npm.tgz') -C $npmRoot
$npmCli = Join-Path $npmRoot 'package/bin/npm-cli.js'
& $nodeExe $npmCli ci
& $nodeExe $npmCli run dev
```

Use `& $nodeExe $npmCli <command>` for the other npm commands below in this environment.

## Checks and static output

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run preview
```

The build writes deployable static files to `build/client`. React Router prerenders the homepage as `build/client/index.html`. The generated `__spa-fallback.html` can be configured as a host fallback for client-side navigation to unknown paths. A static host serves files from `build/client`; no application server is needed in production.

## Content

This first shell contains no article data yet. The upcoming local content module will provide labeled sample entries, categories, and article routes. Keep source content clearly marked as examples until it can be checked against reliable Aion 2 information.
