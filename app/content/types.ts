export type Inline = {
  text: string;
  strong?: boolean;
  emphasis?: boolean;
  underline?: boolean;
  highlight?: string;
  href?: string;
  breakAfter?: boolean;
};

export type Block = { id: string; sourceIds: string[] } & (
  | { kind: 'paragraph'; content: Inline[] }
  | { kind: 'heading'; level: 2 | 3 | 4; content: Inline[] }
  | { kind: 'list'; ordered: boolean; start?: number; items: Block[][] }
  | { kind: 'table'; caption: string; columns: Inline[][]; rows: Block[][][] }
  | { kind: 'formula'; expression: string; explanation: Inline[] }
  | {
      kind: 'note';
      label: string;
      content: Inline[];
      tone: 'context' | 'uncertain';
    }
  | { kind: 'figure'; figureId: string }
  | { kind: 'group'; label: string; blocks: Block[] }
);

export type GuidePage = {
  slug: string;
  title: string;
  category: string | null;
  summary: string;
  status: 'source-backed' | 'source-uncertain' | 'source-pending';
  sourceUrl: string;
  qualifiers: string[];
  blocks: Block[];
};

export type Figure = {
  id: string;
  sourceId: string;
  src: string;
  sha256: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  mappings: {
    label: string;
    color?: string;
    visualValue?: string;
    meaning: string;
    textSourceIds: string[];
    confidence: 'confirmed' | 'approximate' | 'unresolved';
  }[];
  /** Original image audit; not rendered directly. */
  screenshotOnly: string[];
  uncertainties: string[];
  readerNotes?: {
    details: string[];
    caveats: string[];
    mappingText?: Record<string, { label?: string; meaning?: string }>;
  };
};

export type CoverageEntry = {
  sourceId: string;
  disposition: 'rendered' | 'layout-only';
  primary?: { pageSlug: string; blockIds: string[] };
  reason?: string;
};

export type SourceBaseline = {
  fingerprints: { html: string; docx: string };
  blocks: {
    id: string;
    tag?: string;
    text: string;
    numbers: string[];
    figureIds: string[];
    anchor?: string;
    listStart?: number;
    links: { label: string; href: string }[];
    formatting: (Pick<
      Inline,
      'text' | 'strong' | 'emphasis' | 'underline' | 'highlight'
    > & {
      // Half-open UTF-16 offsets in source.text.replace(/\s+/gu, ' ').trim().
      // text normalizes to this exact slice; array ordering is immaterial.
      start: number;
      end: number;
    })[];
  }[];
  figures: {
    id: string;
    sourceId: string;
    sha256: string;
    src: string;
    width: number;
    height: number;
  }[];
};

export type CatalogueEntry = Omit<GuidePage, 'blocks'> & {
  searchText: string;
  headings: { id: string; title: string }[];
};
