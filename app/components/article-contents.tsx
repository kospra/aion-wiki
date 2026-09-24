import { useEffect, useMemo, useState } from 'react';
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
  const headings = useMemo(
    () =>
      walkBlocks(blocks)
        .filter(
          (block): block is Extract<Block, { kind: 'heading' }> =>
            block.kind === 'heading',
        )
        .map((block): HeadingItem => ({
          id: block.id,
          title: inlineText(block.content),
          level: block.level,
          children: [],
        })),
    [blocks],
  );
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: HTMLElement | undefined = elements[0];
      // Anchors land 24px from the top; allow a little rounding tolerance.
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= 32) current = element;
        else break;
      }
      if (
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2
      ) {
        current = elements.at(-1);
      }
      setActiveId(current?.id);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(schedule);
    observer?.observe(document.body);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      observer?.disconnect();
    };
  }, [headings]);
  if (headings.length === 0) return null;

  const roots: HeadingItem[] = [];
  const ancestors: HeadingItem[] = [];
  for (const sourceHeading of headings) {
    const heading: HeadingItem = { ...sourceHeading, children: [] };
    while (
      ancestors.length &&
      ancestors[ancestors.length - 1].level >= heading.level
    )
      ancestors.pop();
    (ancestors.at(-1)?.children ?? roots).push(heading);
    ancestors.push(heading);
  }

  function renderItems(
    items: HeadingItem[],
    nested = false,
  ): React.JSX.Element {
    return (
      <Box as="ul" listStyleType="none" m="0" ps={nested ? '4' : '0'}>
        {items.map((item) => (
          <Box as="li" key={item.id}>
            <Link
              href={`#${item.id}`}
              display="block"
              py="2"
              px="3"
              borderStartWidth="2px"
              borderColor={activeId === item.id ? 'wiki.accent' : 'transparent'}
              bg={activeId === item.id ? 'wiki.accentSoft' : 'transparent'}
              fontWeight={activeId === item.id ? 'semibold' : 'normal'}
              aria-current={activeId === item.id ? 'location' : undefined}
              textStyle="wiki.caption"
              lineHeight="1.5"
              color={activeId === item.id ? 'wiki.accent' : 'wiki.muted'}
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
            {item.children.length > 0 && renderItems(item.children, true)}
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
        mb="3"
        ps="calc(0.75rem + 2px)"
        textTransform="uppercase"
        letterSpacing="wide"
      >
        On this page
      </Text>
      {renderItems(roots)}
    </Box>
  );
}
