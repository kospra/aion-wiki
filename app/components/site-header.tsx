import {
  Box,
  Button,
  Collapsible,
  Container,
  Flex,
  Link,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { articles, categories } from '../content/wiki';

export function SiteHeader(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const { pathname } = useLocation();
  const articleSlug = pathname.startsWith('/articles/')
    ? pathname.split('/')[2]
    : undefined;
  const activeCategory = pathname.startsWith('/categories/')
    ? pathname.split('/')[2]
    : articles.find((article) => article.slug === articleSlug)?.category;

  return (
    <Box
      as="header"
      bg="wiki.canvas"
      borderBottomWidth="1px"
      borderColor="wiki.border"
    >
      <Link
        href="#main-content"
        position="absolute"
        top="2"
        left="-9999px"
        zIndex="10"
        bg="wiki.accent"
        color="white"
        px="4"
        py="2"
        borderRadius="md"
        _focusVisible={{ left: '4', outlineColor: 'wiki.accent' }}
      >
        Skip to content
      </Link>
      <Container maxW="7xl" px={{ base: '4', md: '6' }}>
        <Box as="nav" aria-label="Main navigation">
          <Collapsible.Root
            open={expanded}
            onOpenChange={(details) => setExpanded(details.open)}
          >
            <Flex minH="16" align="center" justify="space-between" gap="4">
              <Link
                asChild
                color="wiki.ink"
                fontWeight="bold"
                fontSize="lg"
                letterSpacing="-0.02em"
                _hover={{ color: 'wiki.accent', textDecoration: 'none' }}
              >
                <RouterLink to="/">Aion 2 Wiki</RouterLink>
              </Link>
              <Text
                display={{ base: 'none', lg: 'block' }}
                textStyle="wiki.caption"
                color="wiki.muted"
                ml="auto"
              >
                Kanon’s guide reference
              </Text>
              <Link
                asChild
                display={{ base: 'none', md: 'inline-flex' }}
                textStyle="wiki.label"
                color={pathname === '/source' ? 'wiki.accent' : 'wiki.muted'}
                _hover={{ color: 'wiki.accent' }}
              >
                <RouterLink to="/source">About the source</RouterLink>
              </Link>
              <Collapsible.Trigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  minH="10"
                  display={{ md: 'none' }}
                  borderColor="wiki.controlBorder"
                  color="wiki.ink"
                >
                  Browse chapters
                </Button>
              </Collapsible.Trigger>
            </Flex>
            <Collapsible.Content
              display={{ md: 'none' }}
              _motionReduce={{ animation: 'none' }}
            >
              <Box
                id="chapter-navigation"
                role="group"
                aria-label="Browse chapters"
                borderTopWidth="1px"
                borderColor="wiki.border"
                py="4"
              >
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap="1">
                  {categories.map(({ slug, title }, index) => (
                    <Link
                      key={slug}
                      asChild
                      onClick={() => setExpanded(false)}
                      display="block"
                      px="3"
                      py="2"
                      borderRadius="md"
                      color={
                        activeCategory === slug ? 'wiki.accent' : 'wiki.ink'
                      }
                      bg={
                        activeCategory === slug
                          ? 'wiki.accentSoft'
                          : 'transparent'
                      }
                      fontWeight={
                        activeCategory === slug ? 'semibold' : 'normal'
                      }
                      _hover={{ bg: 'wiki.accentSoft', color: 'wiki.accent' }}
                    >
                      <RouterLink to={`/categories/${slug}`}>
                        <Text
                          as="span"
                          color="wiki.muted"
                          textStyle="wiki.caption"
                          mr="2"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </Text>{' '}
                        {title}
                      </RouterLink>
                    </Link>
                  ))}
                  <Link
                    asChild
                    onClick={() => setExpanded(false)}
                    display="block"
                    px="3"
                    py="2"
                    borderRadius="md"
                    color={pathname === '/source' ? 'wiki.accent' : 'wiki.ink'}
                    bg={
                      pathname === '/source' ? 'wiki.accentSoft' : 'transparent'
                    }
                    _hover={{ bg: 'wiki.accentSoft', color: 'wiki.accent' }}
                  >
                    <RouterLink to="/source">About the source</RouterLink>
                  </Link>
                </SimpleGrid>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
          <Box
            display={{ base: 'none', md: 'block' }}
            borderTopWidth="1px"
            borderColor="wiki.border"
            overflowX="auto"
            scrollbarWidth="thin"
          >
            <Flex
              role="group"
              aria-label="Desktop chapters"
              gap="4"
              align="center"
              width="max-content"
              minW="full"
            >
              {categories.map(({ slug, title }) => (
                <Link
                  key={slug}
                  asChild
                  display="inline-flex"
                  alignItems="center"
                  minH="11"
                  fontSize="sm"
                  fontWeight={activeCategory === slug ? 'semibold' : 'medium'}
                  color={activeCategory === slug ? 'wiki.accent' : 'wiki.muted'}
                  borderBottomWidth="2px"
                  borderColor={
                    activeCategory === slug ? 'wiki.accent' : 'transparent'
                  }
                  whiteSpace="nowrap"
                  _hover={{ color: 'wiki.accent', textDecoration: 'none' }}
                  _focusVisible={{
                    outlineColor: 'wiki.accent',
                    outlineOffset: '-2px',
                  }}
                >
                  <RouterLink to={`/categories/${slug}`}>{title}</RouterLink>
                </Link>
              ))}
            </Flex>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
