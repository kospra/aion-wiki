/** Source block IDs stop following position once the Doc is re-imported; order comes from the snapshot. */
export type SourceRange = {
  slug: string;
  firstBlock: string;
  lastBlock: string;
};

const FAR = Number.MAX_SAFE_INTEGER;

export function sourcePositions(ids: string[]): Map<string, number> {
  return new Map(ids.map((id, index) => [id, index]));
}

export function pageForSource(
  sourceId: string,
  positions: Map<string, number>,
  ranges: SourceRange[],
): string | undefined {
  const position = positions.get(sourceId);
  if (position === undefined) return undefined;
  return ranges.find(
    ({ firstBlock, lastBlock }) =>
      position >= (positions.get(firstBlock) ?? FAR) &&
      position <= (positions.get(lastBlock) ?? -1),
  )?.slug;
}

export function sourceDistance(
  positions: Map<string, number>,
  a: string,
  b: string,
): number {
  return Math.abs((positions.get(a) ?? FAR) - (positions.get(b) ?? FAR));
}
