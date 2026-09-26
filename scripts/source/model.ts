import type {
  CoverageEntry,
  Figure,
  GuidePage,
  SourceBaseline,
} from '../../app/content/types';

export type SourceBlock = SourceBaseline['blocks'][number];
export type SourceFigure = SourceBaseline['figures'][number];

/** A block read from an export, before it has an ID. */
export type ParsedBlock = {
  tag: string;
  text: string;
  numbers: string[];
  links: SourceBlock['links'];
  formatting: SourceBlock['formatting'];
  /** Indexes into `ParsedExport.images`, in document order. */
  images: number[];
  anchor?: string;
  ordered?: boolean;
  listStart?: number;
  level?: number;
};

export type ParsedImage = {
  sha256: string;
  extension: 'png' | 'jpg';
  bytes: Uint8Array;
  width: number;
  height: number;
};

export type ParsedExport = { blocks: ParsedBlock[]; images: ParsedImage[] };

export type TaxonomyEntry = {
  slug: string;
  chapter: number;
  title: string;
  sourceTitle?: string;
  firstBlock: string;
  lastBlock: string;
  nonemptyBlocks: number;
  figures: string[];
};

/** One entry per capture in content/source/captures.json. */
export type Capture = {
  capturedAt: string;
  fingerprints: SourceBaseline['fingerprints'];
  updateNote: string | null;
  blocks: number;
  figures: number;
  nextBlock: number;
  nextFigure: number;
  report: string | null;
  /** SHA-256 of JSON.stringify(baseline) as written by this capture. */
  baselineDigest: string;
};

/** Every committed file the sync reads and rewrites, keyed by file name. */
export type ContentSet = {
  baseline: SourceBaseline;
  overview: GuidePage;
  chapters: { file: string; pages: GuidePage[] }[];
  coverage: { file: string; entries: CoverageEntry[] }[];
  figures: { file: string; entries: Figure[] }[];
  taxonomy: TaxonomyEntry[];
  captures: Capture[];
};
