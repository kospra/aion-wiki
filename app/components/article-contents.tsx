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
      <Box as="ul" listStyleType="none" pl="4">
        {items.map((item) => (
          <Box as="li" key={item.id} py="1">
            <Link
              href={`#${item.id}`}
              color="gray.700"
              _hover={{ color: 'gray.900' }}
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
      my="8"
      p="5"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="gray.50"
    >
      <Text fontWeight="semibold" color="gray.900" mb="2">
        On this page
      </Text>
      {renderItems(roots)}
    </Box>
  );
}
