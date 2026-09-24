import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Wrap,
} from '@chakra-ui/react';
import { useState } from 'react';
import { ArticleCard } from './article-card';
import { articles, categories } from '../content/wiki';

export function WikiDirectory({
  initialCategory = 'all',
}: {
  initialCategory?: string;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleArticles = articles.filter(
    (article) =>
      (category === 'all' || article.category === category) &&
      article.searchText.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <Box
      as="section"
      aria-labelledby="directory-title"
      borderTopWidth="1px"
      borderColor="wiki.border"
      pt={{ base: '6', md: '8' }}
    >
      <Stack gap={{ base: '6', md: '7' }}>
        <Stack gap="2">
          <Text textStyle="wiki.label" color="wiki.accent">
            Browse the guide
          </Text>
          <Heading
            as="h2"
            id="directory-title"
            textStyle="wiki.section"
            color="wiki.ink"
          >
            Article directory
          </Heading>
          <Text textStyle="wiki.caption" color="wiki.muted">
            Search titles, source text, and details visible in figures.
          </Text>
        </Stack>
        <Stack gap="4">
          <Field.Root maxW="2xl">
            <Field.Label textStyle="wiki.label" color="wiki.ink">
              Search articles
            </Field.Label>
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the full guide"
              bg="wiki.surface"
              borderColor="wiki.controlBorder"
              borderRadius="md"
              minH="12"
              color="wiki.ink"
              _placeholder={{ color: 'wiki.muted' }}
              _focusVisible={{
                borderColor: 'wiki.accent',
                outlineColor: 'wiki.accent',
              }}
            />
          </Field.Root>
          <Wrap role="group" aria-label="Filter by category" gap="2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              minH="10"
              borderRadius="full"
              borderColor={
                category === 'all' ? 'wiki.accent' : 'wiki.controlBorder'
              }
              bg={category === 'all' ? 'wiki.accentSoft' : 'transparent'}
              color={category === 'all' ? 'wiki.accent' : 'wiki.ink'}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
              _hover={{ borderColor: 'wiki.accent', color: 'wiki.accent' }}
            >
              All topics
            </Button>
            {categories.map((item) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                minH="10"
                borderRadius="full"
                borderColor={
                  category === item.slug ? 'wiki.accent' : 'wiki.controlBorder'
                }
                bg={category === item.slug ? 'wiki.accentSoft' : 'transparent'}
                color={category === item.slug ? 'wiki.accent' : 'wiki.ink'}
                key={item.slug}
                aria-pressed={category === item.slug}
                onClick={() => setCategory(item.slug)}
                _hover={{ borderColor: 'wiki.accent', color: 'wiki.accent' }}
              >
                {item.title}
              </Button>
            ))}
          </Wrap>
        </Stack>
        <Text
          textStyle="wiki.caption"
          color="wiki.muted"
          role="status"
          aria-live="polite"
        >
          {visibleArticles.length}{' '}
          {visibleArticles.length === 1 ? 'article' : 'articles'} found
        </Text>
        {visibleArticles.length > 0 ? (
          <SimpleGrid
            columns={{ base: 1, md: 2 }}
            gapX={{ md: '8', xl: '12' }}
            gapY="0"
          >
            {visibleArticles.map((article) => (
              <ArticleCard article={article} key={article.slug} />
            ))}
          </SimpleGrid>
        ) : (
          <Box py="8" borderTopWidth="1px" borderColor="wiki.border">
            <Stack gap="3" align="start">
              <Heading as="h3" fontSize="lg" color="wiki.ink">
                No articles found
              </Heading>
              <Text color="wiki.muted">
                Try another search or browse all topics.
              </Text>
              <Button
                type="button"
                variant="outline"
                borderColor="wiki.controlBorder"
                color="wiki.accent"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                }}
              >
                Reset filters
              </Button>
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
