import type { ReactNode } from 'react';
import {
  Box,
  Em,
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
import { normalizeSourceUrl } from '../content/reader';
import type { Block, Figure, Inline } from '../content/types';
import { GuideFigure } from './guide-figure';

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
            colorPalette="blue"
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

  function renderBlock(block: Block): ReactNode {
    switch (block.kind) {
      case 'paragraph':
        return (
          <Text id={block.id} key={block.id} lineHeight="1.75">
            {renderInline(block.content)}
          </Text>
        );
      case 'heading':
        return (
          <Heading
            as={`h${block.level}` as 'h2' | 'h3' | 'h4'}
            id={block.id}
            key={block.id}
            size={block.level === 2 ? 'xl' : block.level === 3 ? 'lg' : 'md'}
            mt={block.level === 2 ? '8' : '6'}
            mb="2"
          >
            {renderInline(block.content)}
          </Heading>
        );
      case 'list': {
        const items = block.items.map((item, index) => (
          <List.Item key={`${block.id}-item-${index}`}>
            {item.map(renderBlock)}
          </List.Item>
        ));
        return block.ordered ? (
          <List.Root
            asChild
            key={block.id}
            listStyleType="decimal"
            ps="6"
            spaceY="2"
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
            borderColor="gray.200"
            borderRadius="md"
          >
            <Table.Root size="sm" variant="outline" minW="max-content">
              <Table.Caption captionSide="top">{block.caption}</Table.Caption>
              <Table.Header>
                <Table.Row>
                  {block.columns.map((column, index) => (
                    <Table.ColumnHeader key={index} scope="col">
                      {renderInline(column)}
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {block.rows.map((row, rowIndex) => (
                  <Table.Row key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <Table.Cell key={cellIndex} verticalAlign="top">
                        {cell.map(renderBlock)}
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
            p="4"
            bg="gray.50"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
          >
            <chakra.pre
              overflowX="auto"
              maxW="100%"
              fontFamily="mono"
              fontSize="sm"
              whiteSpace="pre"
            >
              {block.expression}
            </chakra.pre>
            <Text mt="3" lineHeight="1.7">
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
            p="4"
            bg="gray.50"
            borderStartWidth="3px"
            borderColor="gray.300"
            borderRadius="sm"
          >
            <Strong>{block.label}</Strong>
            <Text mt="1" lineHeight="1.7">
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
            <GuideFigure figure={figure} sourceLinks={sourceLinks} />
          </Box>
        );
      }
      case 'group':
        return (
          <Box
            id={block.id}
            key={block.id}
            role="group"
            aria-label={block.label}
            borderStartWidth="2px"
            borderColor="gray.200"
            ps="4"
            py="2"
            spaceY="4"
          >
            <Text
              data-guide-group-label=""
              fontWeight="semibold"
              color="gray.700"
            >
              {block.label}
            </Text>
            {block.blocks.map(renderBlock)}
          </Box>
        );
    }
  }

  return (
    <Box data-guide-content="" spaceY="5" minW="0" overflowWrap="anywhere">
      {blocks.map(renderBlock)}
    </Box>
  );
}
