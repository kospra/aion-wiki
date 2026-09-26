import {
  Badge,
  Box,
  Button,
  CloseButton,
  Field,
  Flex,
  Heading,
  Input,
  Link,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { ArticleCard } from './article-card';
import { ChapterList } from './chapter-navigation';
import { articles, categories } from '../content/wiki';
import { matchesSearch } from '../content/rules';

export function WikiDirectory({
  initialCategory = 'all',
  discover = false,
}: {
  initialCategory?: string;
  discover?: boolean;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const searchRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const showChapters = discover && !normalizedQuery && category === 'all';
  const visibleArticles = articles.filter(
    (article) =>
      (category === 'all' || article.category === category) &&
      matchesSearch(article.searchText, normalizedQuery),
  );
  function clearSearch(reset = false) {
    setQuery('');
    if (reset) setCategory('all');
    searchRef.current?.focus();
  }
  return (
    <Stack gap="8">
      <Flex gap="8" align="start">
        <Stack flex="1" minW="0" gap="6">
          {discover && (
            <>
              <Text textStyle="wiki.eyebrow" color="wiki.accent">
                The community field guide
              </Text>
              <Heading as="h1" id="home-title" textStyle="wiki.hero">
                Aion 2,
                <Box as="br" display={{ base: 'block', md: 'none' }} />{' '}
                explained.
              </Heading>
              <Text
                textStyle="wiki.body"
                color="wiki.muted"
                display={{ base: 'none', md: 'block' }}
              >
                A field guide to equipment, progression and combat — with the
                original explanations close at hand.
              </Text>
              <Text
                textStyle="wiki.body"
                color="wiki.muted"
                display={{ base: 'block', md: 'none' }}
              >
                Equipment, progression and combat. Explained with context.
              </Text>
            </>
          )}
          <Field.Root>
            <Field.Label srOnly={discover}>Search articles</Field.Label>
            <Box position="relative" w="full">
              <Input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the guide"
                pr="12"
                bg="wiki.canvas"
              />
              {query && (
                <CloseButton
                  type="button"
                  aria-label="Clear search"
                  variant="ghost"
                  size="sm"
                  position="absolute"
                  right="1"
                  top="0.5"
                  onClick={() => clearSearch()}
                />
              )}
            </Box>
            <Field.HelperText
              color="wiki.muted"
              fontSize="xs"
              display={{ base: discover ? 'none' : 'block', md: 'block' }}
              mt="2"
            >
              Search article titles and text.
            </Field.HelperText>
          </Field.Root>
          {discover && (
            <Text
              fontSize="xs"
              color="wiki.muted"
              display={{ base: 'block', xl: 'none' }}
            >
              {categories.length} chapters · {articles.length} articles
            </Text>
          )}
        </Stack>
        {discover && (
          <Stack
            as="aside"
            aria-label="About this guide"
            display={{ base: 'none', xl: 'flex' }}
            bg="wiki.surface"
            w="340px"
            p="6"
            gap="4"
            flexShrink="0"
          >
            <Text textStyle="wiki.eyebrow" color="wiki.accent">
              About this wiki
            </Text>
            <Heading
              as="h2"
              fontSize="28px"
              lineHeight="1.1"
              color="wiki.accent"
            >
              Kanon’s Aion 2
              <br />
              progression guide.
            </Heading>
            <Box borderTopWidth="1px" borderColor="wiki.border" />
            <Text fontWeight="semibold">
              {categories.length} chapters / {articles.length} articles
            </Text>
            <Text fontSize="sm" color="wiki.muted">
              Gear, enhancement, Arcana, Daevanion, Genus and damage formulas,
              organized for quick reference.
            </Text>
            <Link asChild alignSelf="start">
              <RouterLink to="/source">
                <Badge bg="wiki.raised" color="wiki.ink">
                  Based on Kanon’s guide
                </Badge>
              </RouterLink>
            </Link>
          </Stack>
        )}
      </Flex>
      {showChapters ? (
        <Box as="section" id="chapters" aria-labelledby="chapters-title">
          <Heading as="h2" id="chapters-title" textStyle="wiki.section" mb="6">
            <Box as="span" display={{ base: 'none', md: 'inline' }}>
              Explore the guide
            </Box>
            <Box as="span" display={{ base: 'inline', md: 'none' }}>
              All chapters
            </Box>
          </Heading>
          <Box display={{ base: 'block', md: 'none' }}>
            <ChapterList />
          </Box>
          <SimpleGrid
            display={{ base: 'none', md: 'grid' }}
            columns={{ md: 2, xl: 3 }}
            gap="4"
          >
            {categories.map((item, index) => (
              <Link
                key={item.slug}
                asChild
                layerStyle="wiki.card"
                display="block"
                color="wiki.ink"
                minH="32"
              >
                <RouterLink to={`/categories/${item.slug}`}>
                  <Heading as="h3" fontSize="lg" lineHeight="1.5" mb="2">
                    {String(index + 1).padStart(2, '0')} / {item.title}
                  </Heading>
                  <Text fontSize="sm" lineHeight="1.5" color="wiki.muted">
                    {item.description}
                  </Text>
                </RouterLink>
              </Link>
            ))}
          </SimpleGrid>
        </Box>
      ) : (
        <Box as="section" aria-labelledby="directory-title">
          <Stack gap="6">
            <Flex
              align={{ base: 'start', md: 'center' }}
              justify="space-between"
              gap="4"
              direction={{ base: 'column', md: 'row' }}
            >
              <Heading as="h2" id="directory-title" textStyle="wiki.section">
                {normalizedQuery
                  ? 'Search results'
                  : 'Articles in this chapter'}
              </Heading>
              <NativeSelect.Root w={{ base: 'full', md: '64' }}>
                <NativeSelect.Field
                  aria-label="Filter by category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  minH="11"
                  bg="wiki.surface"
                  borderColor="wiki.controlBorder"
                >
                  <option value="all">All topics</option>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.title}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Flex>
            <Text
              role="status"
              aria-live="polite"
              textStyle="wiki.caption"
              color="wiki.muted"
            >
              {visibleArticles.length}{' '}
              {visibleArticles.length === 1 ? 'article' : 'articles'} found
            </Text>
            {visibleArticles.length ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                {visibleArticles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </SimpleGrid>
            ) : (
              <Stack
                align="start"
                layerStyle="wiki.panel"
                p={{ base: '6', md: '8' }}
                gap="3"
              >
                <Heading as="h3" fontSize="xl">
                  No articles found
                </Heading>
                <Text color="wiki.muted">
                  Try another search or browse all topics.
                </Text>
                <Button variant="outline" onClick={() => clearSearch(true)}>
                  Reset filters
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
