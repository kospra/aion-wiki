import { Box, Link, Text } from '@chakra-ui/react';
import { inlineText, walkBlocks } from '../content/reader';
import type { Block } from '../content/types';

type HeadingItem = {
  id: string;
  title: string;
  level: number;
  children: HeadingItem[];
};

export function ArticleContents({
  blocks,
}: {
  blocks: Block[];
}): React.JSX.Element | null {
  const headings = walkBlocks(blocks)
    .filter(
      (block): block is Extract<Block, { kind: 'heading' }> =>
        block.kind === 'heading',
    )
    .map((block): HeadingItem => ({
      id: block.id,
      title: inlineText(block.content),
      level: block.level,
      children: [],
    }));
  if (headings.length === 0) return null;

  const roots: HeadingItem[] = [];
  const ancestors: HeadingItem[] = [];
  for (const heading of headings) {
    while (
      ancestors.length &&
      ancestors[ancestors.length - 1].level >= heading.level
    )
      ancestors.pop();
    (ancestors.at(-1)?.children ?? roots).push(heading);
    ancestors.push(heading);
  }

  function renderItems(items: HeadingItem[]): React.JSX.Element {
    return (
      <Box as="ul" listStyleType="none" ps="4">
        {items.map((item) => (
          <Box as="li" key={item.id}>
            <Link
              href={`#${item.id}`}
              display="block"
              py="2"
              color="wiki.muted"
              overflowWrap="anywhere"
              _hover={{ color: 'wiki.accent' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'wiki.accent',
                outlineOffset: '2px',
              }}
            >
              {item.title}
            </Link>
            {item.children.length > 0 && renderItems(item.children)}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      as="nav"
      aria-label="On this page"
      my={{ base: '7', xl: '0' }}
      py={{ base: '4', xl: '1' }}
      ps={{ base: '0', xl: '5' }}
      borderTopWidth={{ base: '1px', xl: '0' }}
      borderBottomWidth={{ base: '1px', xl: '0' }}
      borderStartWidth={{ base: '0', xl: '1px' }}
      borderColor="wiki.border"
      minW="0"
    >
      <Text
        textStyle="wiki.label"
        fontWeight="semibold"
        color="wiki.ink"
        mb="2"
        textTransform="uppercase"
        letterSpacing="wide"
      >
        On this page
      </Text>
      {renderItems(roots)}
    </Box>
  );
}
