import { normalizeSourceUrl } from '../app/content/reader.ts';
import type {
  CoverageEntry,
  GuidePage,
  SourceBaseline,
} from '../app/content/types';

export const pagePath = (page: GuidePage): string =>
  page.category === null ? '/source' : `/articles/${page.slug}`;

/** A resolver shared by source-link fidelity, inline safety, and figure legends. */
export function createDestinations(
  baseline: SourceBaseline,
  pages: GuidePage[],
  coverage: CoverageEntry[],
  anchors: Map<string, Set<string>>,
  external: Record<string, string>,
) {
  const paths = new Map(pages.map((page) => [page.slug, pagePath(page)]));
  const sources = new Map(baseline.blocks.map((source) => [source.id, source]));
  const sourceAnchors = new Map(
    baseline.blocks
      .filter((source) => source.anchor)
      .map((source) => [source.anchor!, source.id]),
  );
  const primary = new Map(coverage.map((entry) => [entry.sourceId, entry]));
  const externalValues = new Set(Object.values(external));

  function sourceDestination(sourceId: string): string | null {
    const entry = primary.get(sourceId);
    if (entry?.disposition === 'rendered' && entry.primary) {
      const path = paths.get(entry.primary.pageSlug);
      const id = entry.primary.blockIds[0];
      if (path && id && anchors.get(path)?.has(id))
        return `${path}#${encodeURIComponent(id)}`;
      return null;
    }
    return external[sourceId] ?? null;
  }

  function canonical(
    href: string,
    page: GuidePage,
    fromSource = false,
  ): string | null {
    const safe = normalizeSourceUrl(href);
    if (!safe) return null;
    if (fromSource && safe.startsWith('#')) {
      let anchor: string;
      try {
        anchor = decodeURIComponent(safe.slice(1));
      } catch {
        return null;
      }
      const id = sourceAnchors.get(anchor);
      return id ? sourceDestination(id) : null;
    }
    if (!safe.startsWith('/') && !safe.startsWith('#')) return safe;
    let url: URL;
    try {
      url = new URL(safe, `https://guide.invalid${pagePath(page)}`);
    } catch {
      return null;
    }
    let anchor: string;
    try {
      anchor = decodeURIComponent(url.hash.slice(1));
    } catch {
      return null;
    }
    const destination =
      url.pathname + (anchor ? `#${encodeURIComponent(anchor)}` : '');
    if (
      anchors.has(url.pathname) &&
      (!anchor || anchors.get(url.pathname)!.has(anchor))
    )
      return destination;
    return !anchors.has(url.pathname) && externalValues.has(destination)
      ? destination
      : null;
  }

  function textDestination(sourceId: string): boolean {
    const source = sources.get(sourceId);
    return (
      !!sourceDestination(sourceId) &&
      (!!source?.text.trim() || (!source && Object.hasOwn(external, sourceId)))
    );
  }

  return { canonical, sourceDestination, textDestination };
}
