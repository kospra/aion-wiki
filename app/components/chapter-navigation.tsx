import { Box, Link, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router';
import { articles, categories } from '../content/wiki';

export function ChapterList(): React.JSX.Element {
  const { pathname } = useLocation();
  const current = articles.find(
    (article) => pathname === `/articles/${article.slug}`,
  )?.category;
  return (
    <Stack as="ul" listStyleType="none" m="0" p="0" gap="1">
      {categories.map((category, index) => {
        const active =
          current === category.slug ||
          pathname === `/categories/${category.slug}`;
        return (
          <Box as="li" key={category.slug}>
            <Link
              asChild
              variant="plain"
              layerStyle="wiki.navRow"
              aria-current={
                active ? (current ? 'location' : 'page') : undefined
              }
              bg={active ? 'wiki.accentSoft' : 'transparent'}
              borderColor={active ? 'wiki.accentBorder' : 'transparent'}
              color={active ? 'wiki.accent' : 'wiki.ink'}
              fontWeight={active ? 'semibold' : 'normal'}
            >
              <RouterLink to={`/categories/${category.slug}`}>
                <Text
                  as="span"
                  w="6"
                  flexShrink="0"
                  fontSize="xs"
                  color={active ? 'wiki.accent' : 'wiki.muted'}
                >
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text as="span" minW="0">
                  {category.title}
                </Text>
              </RouterLink>
            </Link>
          </Box>
        );
      })}
    </Stack>
  );
}

export function ChapterNavigation(): React.JSX.Element {
  const { pathname } = useLocation();
  return (
    <Box
      as="nav"
      aria-label="Guide chapters"
      display={{ base: 'none', lg: 'block' }}
      w="64"
      flexShrink="0"
      bg="wiki.surface"
      borderWidth="1px"
      borderColor="wiki.border"
      borderRadius="lg"
      p="4"
      mt="8"
      ms="8"
      alignSelf="start"
    >
      <Stack gap="2">
        <Text textStyle="wiki.eyebrow" color="wiki.muted" px="3">
          The guide
        </Text>
        <Link
          asChild
          layerStyle="wiki.navRow"
          minH="12"
          aria-current={pathname === '/' ? 'page' : undefined}
          bg={pathname === '/' ? 'wiki.accentSoft' : 'transparent'}
          borderColor="wiki.accentBorder"
          color="wiki.accent"
        >
          <RouterLink to="/">Discover</RouterLink>
        </Link>
        <Box borderTopWidth="1px" borderColor="wiki.border" />
        <Text textStyle="wiki.eyebrow" color="wiki.muted" px="3">
          Chapters
        </Text>
        <ChapterList />
        <Box borderTopWidth="1px" borderColor="wiki.border" />
        <Stack px="3" gap="2" color="wiki.muted" fontSize="xs">
          <Text>Based on Kanon’s guide</Text>
          <Text>Aion 2 progression, gear and stat reference.</Text>
        </Stack>
      </Stack>
    </Box>
  );
}
