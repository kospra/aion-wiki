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
  | { kind: 'formula'; expression: Inline[]; explanation: Inline[] }
  | {
      kind: 'note';
      label: string;
      content: Inline[];
      tone: 'context' | 'uncertain';
    }
  | { kind: 'figure'; figureId: string }
  | { kind: 'group'; blocks: Block[] }
);

export type GuidePage = {
  slug: string;
  title: string;
  category: string | null;
  summary: string;
  status: 'source-backed' | 'source-uncertain' | 'source-pending';
  sourceUrl: string;
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
  /** Numbered or colored markers drawn on the original screenshot. */
  annotations?: {
    label: string;
    title: string;
    /** Key of a `wiki.annotation.*` color token. */
    color: string;
    /** Block id of the section explaining this marker, on the same page. */
    target: string;
  }[];
};

/** Google Docs leftovers that carry no guide content on a wiki page. */
export type Omission =
  /** A divider line such as "—". */
  | 'separator'
  /** "CH 3: IDEAL STAT LINES"; the article header already names the chapter. */
  | 'chapter-title'
  /** Instructions for navigating the Google Doc itself. */
  | 'document-navigation';

export type CoverageEntry = {
  sourceId: string;
  disposition: 'rendered' | 'layout-only' | 'omitted';
  primary?: { pageSlug: string; blockIds: string[] };
  reason?: string;
  /** Required for omitted blocks. */
  omission?: Omission;
  /** Omitted blocks: the article they belonged to; links to them open it. */
  pageSlug?: string;
  /** Rendered blocks: drop a stray word (≤3 letters) beside a figure. */
  strayText?: boolean;
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
