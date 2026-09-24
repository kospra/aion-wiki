import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import type { GuideValidationInput } from './content-integrity.ts';

/** Read only committed artifacts; usable in a clean checkout without research inputs. */
export async function loadCompleteGuide(): Promise<GuideValidationInput> {
  const read = async (path: string) =>
    JSON.parse(
      await readFile(
        resolve(dirname(fileURLToPath(import.meta.url)), '..', path),
        'utf8',
      ),
    );
  return {
    baseline: await read('content/source/baseline.json'),
    pages: [
      await read('app/content/source-overview.json'),
      ...(
        await Promise.all(
          Array.from({ length: 12 }, (_, i) =>
            read(
              `app/content/chapters/chapter-${String(i + 1).padStart(2, '0')}.json`,
            ),
          ),
        )
      ).flat(),
    ],
    figures: (
      await Promise.all(
        ['a', 'b', 'c'].map((group) =>
          read(`app/content/figures/group-${group}.json`),
        ),
      )
    ).flat(),
    coverage: (
      await Promise.all(
        ['a', 'b', 'c'].map((group) =>
          read(`content/coverage/group-${group}.json`),
        ),
      )
    ).flat(),
  };
}
