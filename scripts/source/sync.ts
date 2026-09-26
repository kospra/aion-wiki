import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { format, resolveConfig } from 'prettier';
import type {
  CoverageEntry,
  Figure,
  GuidePage,
  SourceBaseline,
} from '../../app/content/types';
import { alignSnapshot } from './align.ts';
import { baselineDigest, sha256, updateNote } from './captures.ts';
import type { Capture, ContentSet, TaxonomyEntry } from './model.ts';
import { decodeExport, parseExport } from './parse.ts';
import { reconcile } from './reconcile.ts';
import { renderReport } from './report.ts';

export const EXPORT_URL =
  'https://docs.google.com/document/d/11u4wLCG1WfL-xSka2Aze0rI9vYRa7mq3N3Gp1bt0AWY/export?format=html';

export type SyncOptions = {
  root: string;
  dryRun?: boolean;
  from?: string;
  force?: boolean;
  allowDirty?: boolean;
  now?: Date;
  download?: () => Promise<Uint8Array>;
  log?: (line: string) => void;
};
export type SyncResult = {
  changed: boolean;
  flags: number;
  reportPath: string | null;
};

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, 'utf8')) as T;

async function writeFormatted(
  path: string,
  text: string,
  parser: 'json' | 'markdown',
) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    await format(text, { ...(await resolveConfig(path)), parser }),
  );
}
const writeJson = (path: string, value: unknown) =>
  writeFormatted(path, JSON.stringify(value, null, 2), 'json');

async function files<T>(
  dir: string,
  pattern: RegExp,
): Promise<{ file: string; value: T }[]> {
  const names = (await readdir(dir))
    .filter((name) => pattern.test(name))
    .sort();
  return Promise.all(
    names.map(async (file) => ({
      file,
      value: await readJson<T>(join(dir, file)),
    })),
  );
}

export async function loadContent(root: string): Promise<ContentSet> {
  const at = (path: string) => join(root, path);
  const chapters = await files<GuidePage[]>(
    at('app/content/chapters'),
    /^chapter-\d+\.json$/u,
  );
  const coverage = await files<CoverageEntry[]>(
    at('content/coverage'),
    /^group-[a-z]\.json$/u,
  );
  const figures = await files<Figure[]>(
    at('app/content/figures'),
    /^group-[a-z]\.json$/u,
  );
  return {
    baseline: await readJson<SourceBaseline>(
      at('content/source/baseline.json'),
    ),
    overview: await readJson<GuidePage>(at('app/content/source-overview.json')),
    chapters: chapters.map(({ file, value }) => ({ file, pages: value })),
    coverage: coverage.map(({ file, value }) => ({ file, entries: value })),
    figures: figures.map(({ file, value }) => ({ file, entries: value })),
    taxonomy: await readJson<TaxonomyEntry[]>(
      at('content/source/taxonomy.json'),
    ),
    captures: await readJson<Capture[]>(at('content/source/captures.json')),
  };
}

export function uncommittedContent(root: string): string[] {
  try {
    return execFileSync(
      'git',
      [
        'status',
        '--porcelain',
        '--',
        'content',
        'app/content',
        'public/images/guide',
      ],
      { cwd: root, encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean);
  } catch {
    throw new Error(
      'Could not ask git about uncommitted changes; pass --allow-dirty to skip this check',
    );
  }
}

async function download(): Promise<Uint8Array> {
  const response = await fetch(EXPORT_URL);
  if (!response.ok)
    throw new Error(`The Doc export failed with HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const { root, log = () => {} } = options;
  if (!options.dryRun && !options.allowDirty) {
    const dirty = uncommittedContent(root);
    if (dirty.length)
      throw new Error(
        `Content files have uncommitted changes; commit or stash them, or pass --allow-dirty:\n${dirty.join('\n')}`,
      );
  }
  const content = await loadContent(root);
  const last = content.captures.at(-1);
  if (!last)
    throw new Error(
      'content/source/captures.json has no capture to continue from',
    );
  const raw = options.from
    ? new Uint8Array(await readFile(options.from))
    : await (options.download ?? download)();
  const html = decodeExport(raw);
  const alignment = alignSnapshot(content.baseline, parseExport(html), {
    fingerprints: { html: sha256(html) },
    nextBlock: last.nextBlock,
    nextFigure: last.nextFigure,
    force: options.force,
  });
  if (
    JSON.stringify(alignment.baseline.blocks) ===
      JSON.stringify(content.baseline.blocks) &&
    JSON.stringify(alignment.baseline.figures) ===
      JSON.stringify(content.baseline.figures)
  ) {
    log('No changes since the last capture.');
    return { changed: false, flags: 0, reportPath: null };
  }
  const result = reconcile(content, alignment);
  const capturedAt = (options.now ?? new Date()).toISOString();
  const reportPath = `content/source/changes/${capturedAt.slice(0, 10)}.md`;
  const capture: Capture = {
    capturedAt,
    fingerprints: alignment.baseline.fingerprints,
    updateNote: updateNote(alignment.baseline.blocks),
    blocks: alignment.baseline.blocks.length,
    figures: alignment.baseline.figures.length,
    nextBlock: alignment.nextBlock,
    nextFigure: alignment.nextFigure,
    report: reportPath,
    baselineDigest: baselineDigest(alignment.baseline),
    pending: result.flags,
  };
  const count = (kind: string) =>
    alignment.changes.filter((change) => change.kind === kind).length;
  log(
    `Unchanged ${count('unchanged')}, edited ${count('edited')}, added ${count('added')}, removed ${alignment.removed.length}; ` +
      `${result.flags.length} need attention, ${result.reviews.length} to review.`,
  );
  for (const { sourceId, reason } of result.flags)
    log(`  ${sourceId}: ${reason}`);
  if (options.dryRun)
    return { changed: true, flags: result.flags.length, reportPath: null };

  // Images first and the snapshot last, so an interrupted run can simply run again.
  for (const { figure, bytes } of alignment.newImages) {
    const path = join(root, 'public', figure.src);
    if (!existsSync(path)) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    }
  }
  const out = result.content;
  for (const { file, pages } of out.chapters)
    await writeJson(join(root, 'app/content/chapters', file), pages);
  await writeJson(join(root, 'app/content/source-overview.json'), out.overview);
  for (const { file, entries } of out.coverage)
    await writeJson(join(root, 'content/coverage', file), entries);
  for (const { file, entries } of out.figures)
    await writeJson(join(root, 'app/content/figures', file), entries);
  await writeJson(join(root, 'content/source/taxonomy.json'), out.taxonomy);
  const titles = new Map(
    [out.overview, ...out.chapters.flatMap((file) => file.pages)].map(
      (page) => [page.slug, page.title],
    ),
  );
  await writeFormatted(
    join(root, reportPath),
    renderReport({ capture, alignment, result, titles }),
    'markdown',
  );
  const archive = join(
    root,
    '.local-tools/source-doc/captures',
    `${capturedAt.replace(/[:.]/gu, '-')}.html.gz`,
  );
  await mkdir(dirname(archive), { recursive: true });
  await writeFile(
    archive,
    raw[0] === 0x1f && raw[1] === 0x8b ? raw : gzipSync(raw),
  );
  await writeJson(
    join(root, 'content/source/baseline.json'),
    alignment.baseline,
  );
  await writeJson(join(root, 'content/source/captures.json'), [
    ...content.captures,
    capture,
  ]);
  return { changed: true, flags: result.flags.length, reportPath };
}
