import { useEffect, useMemo, useState } from 'react';
import { Box, Link, Text, chakra } from '@chakra-ui/react';
import { inlineText, walkBlocks } from '../content/reader';
import { valueLine } from '../content/rules';
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
      walkBlocks(blocks).flatMap((block): HeadingItem[] => {
        if (block.kind === 'heading')
          return [
            {
              id: block.id,
              title: inlineText(block.content),
              level: block.level,
              children: [],
            },
          ];
        const value =
          block.kind === 'paragraph' ? valueLine(block.content) : null;
        return value
          ? [{ id: block.id, title: value.stat, level: 4, children: [] }]
          : [];
      }),
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
  if (headings.length <= 1) return null;

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
      <Box
        as="ul"
        role="list"
        listStyleType="none"
        m="0"
        ps={nested ? '4' : '0'}
      >
        {items.map((item) => (
          <Box as="li" key={item.id}>
            <Link
              href={`#${item.id}`}
              display="flex"
              alignItems="center"
              minH="11"
              py="2"
              px="3"
              borderWidth="1px"
              borderRadius="wiki.control"
              borderColor={
                activeId === item.id ? 'wiki.accentBorder' : 'transparent'
              }
              bg={activeId === item.id ? 'wiki.accentSoft' : 'transparent'}
              fontWeight={activeId === item.id ? 'semibold' : 'normal'}
              aria-current={activeId === item.id ? 'location' : undefined}
              textStyle="wiki.caption"
              lineHeight="1.5"
              color={activeId === item.id ? 'wiki.accent' : 'wiki.muted'}
              overflowWrap="anywhere"
              _hover={{
                color: 'wiki.accent',
                bg: 'wiki.raised',
                textDecoration: 'none',
              }}
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
      p="4"
      layerStyle="wiki.panel"
      minW="0"
      css={{
        // CSS alone shows the list: always from xl, and below xl once the
        // native disclosure is open, so the layout never waits for JavaScript.
        '& > [data-contents-list]': { display: { base: 'none', xl: 'block' } },
        '& > details[open] ~ [data-contents-list]': { display: 'block' },
        '& > details[open] [data-contents-chevron]': {
          transform: 'rotate(180deg)',
        },
      }}
    >
      <chakra.details display={{ xl: 'none' }}>
        <chakra.summary
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap="3"
          minH="11"
          px="1"
          cursor="pointer"
          listStyleType="none"
          color="wiki.accent"
          borderRadius="wiki.control"
          css={{ '&::-webkit-details-marker': { display: 'none' } }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'wiki.accent',
            outlineOffset: '2px',
          }}
        >
          <Text
            as="span"
            textStyle="wiki.eyebrow"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            On this page · {headings.length}
          </Text>
          <Box
            as="span"
            aria-hidden="true"
            data-contents-chevron=""
            fontSize="xs"
            transition="transform 120ms ease"
            _motionReduce={{ transition: 'none' }}
          >
            ▾
          </Box>
        </chakra.summary>
      </chakra.details>
      <Text
        display={{ base: 'none', xl: 'block' }}
        px="1"
        mb="3"
        color="wiki.accent"
        textStyle="wiki.eyebrow"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wide"
      >
        On this page
      </Text>
      <Box data-contents-list="" mt={{ base: '2', xl: '0' }}>
        {renderItems(roots)}
      </Box>
    </Box>
  );
}
