import { Box, Link, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router';
import { articles, categories } from '../content/wiki';

/**
 * The current path without a trailing slash. Prerendering sees
 * "/articles/x/" while browsers may request "/articles/x", and both must
 * render the same navigation for hydration to match.
 */
function usePathname(): string {
  return useLocation().pathname.replace(/(.)\/+$/, '$1');
}

export function ChapterList({
  showArticles = false,
}: {
  showArticles?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
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
            {showArticles && active && (
              <Box
                as="ul"
                listStyleType="none"
                m="0"
                mt="1"
                ms="9"
                ps="2"
                borderStartWidth="1px"
                borderColor="wiki.border"
              >
                {articles
                  .filter((article) => article.category === category.slug)
                  .map((article) => {
                    const isCurrent = pathname === `/articles/${article.slug}`;
                    return (
                      <Box as="li" key={article.slug}>
                        <Link
                          asChild
                          display="flex"
                          alignItems="center"
                          minH="11"
                          px="2"
                          py="1"
                          fontSize="0.8125rem"
                          lineHeight="1.45"
                          borderRadius="wiki.control"
                          color={isCurrent ? 'wiki.ink' : 'wiki.muted'}
                          fontWeight={isCurrent ? 'semibold' : 'normal'}
                          aria-current={isCurrent ? 'page' : undefined}
                          _hover={{
                            color: 'wiki.accent',
                            bg: 'wiki.raised',
                            textDecoration: 'none',
                          }}
                        >
                          <RouterLink to={`/articles/${article.slug}`}>
                            {article.title}
                          </RouterLink>
                        </Link>
                      </Box>
                    );
                  })}
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

export function ChapterNavigation(): React.JSX.Element {
  const pathname = usePathname();
  return (
    <Box
      as="nav"
      aria-label="Guide chapters"
      display={{ base: 'none', lg: 'block' }}
      w="64"
      flexShrink="0"
      layerStyle="wiki.panel"
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
        <ChapterList showArticles />
        <Box borderTopWidth="1px" borderColor="wiki.border" />
        <Stack px="3" gap="2" color="wiki.muted" fontSize="xs">
          <Text>Based on Kanon’s guide</Text>
          <Text>Aion 2 progression, gear and stat reference.</Text>
        </Stack>
      </Stack>
    </Box>
  );
}
