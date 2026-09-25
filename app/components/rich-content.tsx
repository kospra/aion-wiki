import type { ReactNode } from 'react';
import {
  Box,
  Em,
  Flex,
  Heading,
  Link,
  List,
  Mark,
  Span,
  Strong,
  Table,
  Text,
  chakra,
} from '@chakra-ui/react';
import { inlineText, normalizeSourceUrl, walkBlocks } from '../content/reader';
import type { Block, Figure, Inline } from '../content/types';
import { AnnotationSwatch, GuideFigure } from './guide-figure';

type Props = {
  blocks: Block[];
  figures: Record<string, Figure>;
  sourceLinks: Record<string, string>;
};

function formattedPart(part: Inline, key: number): ReactNode {
  let content: ReactNode = part.text;
  if (part.strong) content = <Strong>{content}</Strong>;
  if (part.emphasis) content = <Em>{content}</Em>;
  if (part.underline) content = <chakra.u>{content}</chakra.u>;
  if (part.highlight) {
    const backgroundColor =
      /^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/i.test(part.highlight)
        ? part.highlight
        : undefined;
    content = (
      <Mark
        bg={backgroundColor}
        whiteSpace="normal"
        color={backgroundColor ? 'black' : undefined}
        data-source-highlight={backgroundColor}
      >
        {content}
      </Mark>
    );
  }
  return (
    <Span key={key}>
      {content}
      {part.breakAfter && <br />}
    </Span>
  );
}

export function RichContent({
  blocks,
  figures,
  sourceLinks,
}: Props): React.JSX.Element {
  // Headings explained by a screenshot marker repeat its color square. The
  // heading text (or source list number) already names the marker.
  const markers = new Map<string, { label: string; color: string }[]>();
  for (const block of walkBlocks(blocks)) {
    if (block.kind !== 'figure') continue;
    for (const annotation of figures[block.figureId]?.annotations ?? []) {
      const list = markers.get(annotation.target) ?? [];
      list.push({ label: annotation.label, color: annotation.color });
      markers.set(annotation.target, list);
    }
  }

  function renderInline(parts: Inline[]): ReactNode {
    const runs: ReactNode[] = [];
    for (let index = 0; index < parts.length;) {
      const part = parts[index];
      if (!part.href) {
        runs.push(formattedPart(part, index));
        index += 1;
        continue;
      }
      const start = index;
      while (index < parts.length && parts[index].href === part.href)
        index += 1;
      const linkedParts = parts.slice(start, index);
      const content = linkedParts.map((linked, offset) =>
        formattedPart(linked, start + offset),
      );
      const mappedHref = Object.hasOwn(sourceLinks, part.href)
        ? sourceLinks[part.href]
        : undefined;
      const href = normalizeSourceUrl(
        typeof mappedHref === 'string' ? mappedHref : part.href,
      );
      runs.push(
        href && linkedParts.some((linked) => linked.text.trim()) ? (
          <Link
            key={start}
            href={href}
            display="inline"
            color="wiki.accent"
            _hover={{ color: 'wiki.accentHover' }}
            textDecoration="underline"
          >
            {content}
          </Link>
        ) : (
          <Span key={start}>{content}</Span>
        ),
      );
    }
    return runs;
  }

  function renderBlock(block: Block, inTable = false): ReactNode {
    switch (block.kind) {
      case 'paragraph':
        return (
          <Text
            id={block.id}
            key={block.id}
            textStyle={inTable ? undefined : 'wiki.body'}
            fontSize={inTable ? 'md' : undefined}
            lineHeight={inTable ? '1.6' : undefined}
            maxW={inTable ? undefined : '65ch'}
          >
            {renderInline(block.content)}
          </Text>
        );
      case 'heading': {
        const headingMarkers = markers.get(block.id) ?? [];
        const heading = (
          <Heading
            as={`h${block.level}` as 'h2' | 'h3' | 'h4'}
            id={block.id}
            key={block.id}
            textStyle={block.level === 2 ? 'wiki.section' : undefined}
            fontSize={
              block.level === 3
                ? '22px'
                : block.level === 4
                  ? '19px'
                  : undefined
            }
            lineHeight="1.3"
            color="wiki.ink"
            maxW={inTable ? undefined : '65ch'}
            mt={headingMarkers.length ? '0' : block.level === 2 ? '12' : '8'}
            mb={headingMarkers.length ? '0' : '3'}
            scrollMarginTop="6"
          >
            {renderInline(block.content)}
          </Heading>
        );
        if (!headingMarkers.length) return heading;
        // Squares sit beside the heading, so its text stays the source's own.
        return (
          <Flex
            key={block.id}
            data-guide-heading-markers=""
            align="center"
            flexWrap="wrap"
            gap="3"
            mt={block.level === 2 ? '12' : '8'}
            mb="3"
          >
            {headingMarkers.map((marker) => (
              <AnnotationSwatch key={marker.label} color={marker.color} />
            ))}
            {heading}
          </Flex>
        );
      }
      case 'list': {
        const items = block.items.map((item, index) => (
          <List.Item key={`${block.id}-item-${index}`}>
            {item.map((child) => renderBlock(child, inTable))}
          </List.Item>
        ));
        return block.ordered ? (
          <List.Root
            asChild
            key={block.id}
            listStyleType="decimal"
            ps="6"
            spaceY="2"
            maxW={inTable ? undefined : '65ch'}
            textStyle={inTable ? undefined : 'wiki.body'}
            color="wiki.ink"
          >
            <chakra.ol
              id={block.id}
              start={block.start}
              aria-label="Numbered guide list"
            >
              {items}
            </chakra.ol>
          </List.Root>
        ) : (
          <List.Root
            as="ul"
            id={block.id}
            key={block.id}
            listStyleType="disc"
            ps="6"
            spaceY="2"
            maxW={inTable ? undefined : '65ch'}
            textStyle={inTable ? undefined : 'wiki.body'}
            color="wiki.ink"
          >
            {items}
          </List.Root>
        );
      }
      case 'table':
        return (
          <Table.ScrollArea
            id={block.id}
            key={block.id}
            tabIndex={0}
            role="region"
            aria-label={block.caption}
            data-guide-table-scroll=""
            maxW="100%"
            borderWidth="1px"
            borderColor="wiki.border"
            borderRadius="md"
            overflowX="auto"
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'wiki.accent',
              outlineOffset: '2px',
            }}
          >
            <Table.Root
              size="md"
              variant="line"
              minW={block.columns.length > 3 ? 'max-content' : undefined}
              tableLayout={block.columns.length === 2 ? 'fixed' : 'auto'}
              width="full"
              fontVariantNumeric="tabular-nums"
            >
              <Table.Caption
                captionSide="top"
                whiteSpace="normal"
                overflowWrap="anywhere"
                color="wiki.muted"
                textStyle="wiki.caption"
                textAlign="start"
                px="3"
                py="2"
              >
                {block.caption}
              </Table.Caption>
              <Table.Header>
                <Table.Row>
                  {block.columns.map((column, index) => (
                    <Table.ColumnHeader
                      key={index}
                      scope="col"
                      width={
                        block.columns.length === 2 && index === 0
                          ? { base: '7rem', md: '22%' }
                          : undefined
                      }
                      bg="wiki.accentSoft"
                      color="wiki.ink"
                      px="3"
                      py="3"
                      borderBottomWidth="1px"
                      borderColor="wiki.border"
                      whiteSpace="normal"
                    >
                      {renderInline(column)}
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {block.rows.map((row, rowIndex) => (
                  <Table.Row
                    key={rowIndex}
                    borderBottomWidth="1px"
                    borderColor="wiki.border"
                  >
                    {row.map((cell, cellIndex) => (
                      <Table.Cell
                        key={cellIndex}
                        verticalAlign="top"
                        px="3"
                        py="3"
                        color="wiki.ink"
                        maxW="36rem"
                        whiteSpace="normal"
                        overflowWrap="anywhere"
                      >
                        {cell.map((child) => renderBlock(child, true))}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        );
      case 'formula':
        return (
          <Box
            as="section"
            id={block.id}
            key={block.id}
            p={{ base: '4', md: '5' }}
            bg="wiki.surface"
            borderWidth="1px"
            borderColor="wiki.border"
            borderRadius="md"
          >
            <chakra.pre
              overflowX="auto"
              maxW="100%"
              fontFamily="mono"
              fontSize="md"
              whiteSpace="pre"
              color="wiki.ink"
            >
              {block.expression}
            </chakra.pre>
            <Text
              mt="3"
              textStyle="wiki.body"
              maxW={inTable ? undefined : '65ch'}
            >
              {renderInline(block.explanation)}
            </Text>
          </Box>
        );
      case 'note':
        return (
          <Box
            as="aside"
            id={block.id}
            key={block.id}
            p={{ base: '4', md: '5' }}
            bg="wiki.surface"
            borderStartWidth="3px"
            borderColor="wiki.accentBorder"
            borderRadius="sm"
            maxW={inTable ? undefined : '65ch'}
            color="wiki.ink"
          >
            <Strong>{block.label}</Strong>
            <Text mt="1" textStyle="wiki.body">
              {renderInline(block.content)}
            </Text>
          </Box>
        );
      case 'figure': {
        const figure = figures[block.figureId];
        if (!figure)
          return (
            <Text id={block.id} key={block.id}>
              Image unavailable: {block.figureId}
            </Text>
          );
        return (
          <Box id={block.id} key={block.id} maxW="100%">
            <GuideFigure figure={figure} />
          </Box>
        );
      }
      case 'group': {
        const [first, middle, last] = block.blocks;
        // The source places "result ⬅️ ingredients" screenshots side by side.
        const arrowPair =
          block.blocks.length === 3 &&
          first.kind === 'figure' &&
          last.kind === 'figure' &&
          middle.kind === 'paragraph' &&
          /^\s*(?:⬅️|⬅|←)\s*$/u.test(inlineText(middle.content));
        if (arrowPair)
          return (
            <Flex
              id={block.id}
              key={block.id}
              data-guide-figure-pair=""
              direction={{ base: 'column', md: 'row' }}
              align="center"
              gap={{ base: '0', md: '4' }}
            >
              {block.blocks.map((child, index) =>
                index === 1 ? (
                  <Box
                    key={child.id}
                    flexShrink="0"
                    fontSize="2xl"
                    transform={{ base: 'rotate(90deg)', md: 'none' }}
                  >
                    {renderBlock(child, inTable)}
                  </Box>
                ) : (
                  <Box key={child.id} flex="1 1 0" minW="0" maxW="100%">
                    {renderBlock(child, inTable)}
                  </Box>
                ),
              )}
            </Flex>
          );
        return (
          <Box id={block.id} key={block.id} spaceY={{ base: '5', md: '6' }}>
            {block.blocks.map((child) => renderBlock(child, inTable))}
          </Box>
        );
      }
    }
  }

  return (
    <Box
      data-guide-content=""
      spaceY={{ base: '5', md: '6' }}
      minW="0"
      overflowWrap="anywhere"
      color="wiki.ink"
    >
      {blocks.map((block) => renderBlock(block))}
    </Box>
  );
}
