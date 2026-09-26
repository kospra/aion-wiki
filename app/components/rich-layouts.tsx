import type { ReactNode } from 'react';
import { Box, Span, Text, chakra } from '@chakra-ui/react';
import type { CalloutTone, InlineTag as Tag } from '../content/rules';

/** Clears the author's note shading inside surfaces that already show it. */
export const quietShade = {
  // `i`: the shading rule matches the color in any letter case.
  '& mark[data-source-highlight="#f8f9fa" i]': { bg: 'transparent' },
};

const iconPaths: Record<CalloutTone, string> = {
  warning: 'M10 3 2.5 16.5h15L10 3Zm0 5.5V12m0 2.2v.3',
  summary: 'M4 6h12M4 10h12M4 14h7',
  tip: 'M10 2.5v2M4.7 4.7l1.4 1.4m9.2-1.4-1.4 1.4M7 13.5a4 4 0 1 1 6 0V15H7v-1.5Zm1 4h4',
  question:
    'M7.6 7.6a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.4v.6m0 2.8v.2M10 17.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  note: 'M10 17.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM10 9v5m0-7.8v.3',
};

/** The author's shaded note as a quiet callout; its start edge keeps the source color. */
export function Callout({
  tone,
  children,
}: {
  tone: CalloutTone;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Box
      role="note"
      data-guide-callout={tone}
      layerStyle="wiki.callout"
      display="grid"
      gridTemplateColumns="1.25rem minmax(0, 1fr)"
      columnGap="3"
      maxW="65ch"
      css={quietShade}
    >
      <chakra.svg
        viewBox="0 0 20 20"
        w="5"
        h="5"
        mt="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        color={tone === 'warning' ? 'wiki.warning' : 'wiki.muted'}
        aria-hidden="true"
        focusable="false"
      >
        <path d={iconPaths[tone]} />
      </chakra.svg>
      <Box minW="0" spaceY="3">
        {children}
      </Box>
    </Box>
  );
}

/**
 * Responsive grid for short sections, label cards, or columns inside a card.
 * `wide` section cards hold columns, so their tracks leave room for two.
 */
export function CardGrid({
  kind,
  wide = false,
  children,
}: {
  kind: 'sections' | 'labels' | 'columns';
  wide?: boolean;
  children: ReactNode;
}): React.JSX.Element {
  const minimum =
    kind === 'columns'
      ? '8.5rem'
      : kind === 'labels'
        ? '14rem'
        : wide
          ? '20rem'
          : '12rem';
  return (
    <Box
      data-guide-grid={kind}
      display="grid"
      gap={kind === 'columns' ? '4' : '3'}
      // Section cards keep equal widths and form columns from md; label cards
      // and in-card columns form columns from sm and share the row they fill.
      gridTemplateColumns={
        kind === 'sections'
          ? { base: '1fr', md: `repeat(auto-fill, minmax(${minimum}, 1fr))` }
          : { base: '1fr', sm: `repeat(auto-fit, minmax(${minimum}, 1fr))` }
      }
    >
      {children}
    </Box>
  );
}

/** One card in a CardGrid. Label cards render as a one-item list, as in the source. */
export function GridCard({
  id,
  list = false,
  plain = false,
  children,
}: {
  id?: string;
  list?: boolean;
  plain?: boolean;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Box
      as={list ? 'ul' : 'div'}
      role={list ? 'list' : undefined}
      id={id}
      data-guide-card=""
      layerStyle={plain ? undefined : 'wiki.gridCard'}
      listStyleType="none"
      m="0"
      minW="0"
      spaceY="2"
    >
      {children}
    </Box>
  );
}

/** The guide's own qualifier or to-do words, marked in place. */
export function InlineTag({
  tag,
  children,
}: {
  tag: Tag;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Span
      data-guide-tag={tag}
      layerStyle={tag === 'scope' ? 'wiki.scope' : 'wiki.todo'}
    >
      {children}
    </Span>
  );
}

/** "1% Damage Boost = 0.35%" as a header: stat on the left, value large on the right. */
export function ValueLine({
  id,
  stat,
  equals,
  value,
}: {
  id: string;
  stat: ReactNode;
  equals: ReactNode;
  value: ReactNode;
}): React.JSX.Element {
  return (
    <Text
      id={id}
      data-guide-value-line=""
      display="flex"
      flexWrap="wrap"
      alignItems="baseline"
      columnGap="2"
      rowGap="1"
      maxW="65ch"
      pt="5"
      mt="10"
      borderTopWidth="1px"
      borderColor="wiki.border"
      fontSize="lg"
      fontWeight="semibold"
      lineHeight="1.35"
      color="wiki.ink"
    >
      <Span flex="1 1 12rem" minW="0">
        {stat}
      </Span>
      <Span color="wiki.muted" fontWeight="normal">
        {equals}
      </Span>
      <Span
        fontSize="2xl"
        fontVariantNumeric="tabular-nums"
        letterSpacing="-0.02em"
      >
        {value}
      </Span>
    </Text>
  );
}
