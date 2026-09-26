import { createHash } from 'node:crypto';
import type { SourceBaseline } from '../../app/content/types';

export const sha256 = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

/** Recorded per capture; a hand edit to baseline.json no longer matches it. */
export const baselineDigest = (baseline: SourceBaseline): string =>
  sha256(JSON.stringify(baseline));

/** The author's own latest update line, for the report and capture log. */
export const updateNote = (blocks: { text: string }[]): string | null =>
  blocks.find((block) => /update note/iu.test(block.text))?.text ?? null;
