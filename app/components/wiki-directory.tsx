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
      py={{ base: '8', md: '12' }}
    >
      <Stack gap="6">
        <Stack gap="2">
          <Text color="gray.600" fontSize="sm" fontWeight="semibold">
            Browse the guide
          </Text>
          <Heading as="h2" id="directory-title" size="2xl" color="gray.900">
            Article directory
          </Heading>
          <Text color="gray.600">
            Search titles, source text, and details visible in figures.
          </Text>
        </Stack>
        <Stack gap="4">
          <Field.Root maxW="xl">
            <Field.Label>Search articles</Field.Label>
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the full guide"
              bg="white"
            />
          </Field.Root>
          <Wrap role="group" aria-label="Filter by category" gap="2">
            <Button
              type="button"
              size="sm"
              variant={category === 'all' ? 'solid' : 'outline'}
              colorPalette="gray"
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All topics
            </Button>
            {categories.map((item) => (
              <Button
                type="button"
                size="sm"
                variant={category === item.slug ? 'solid' : 'outline'}
                colorPalette="gray"
                key={item.slug}
                aria-pressed={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {item.title}
              </Button>
            ))}
          </Wrap>
        </Stack>
        <Text color="gray.600" role="status" aria-live="polite">
          {visibleArticles.length}{' '}
          {visibleArticles.length === 1 ? 'article' : 'articles'} found
        </Text>
        {visibleArticles.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="4">
            {visibleArticles.map((article) => (
              <ArticleCard article={article} key={article.slug} />
            ))}
          </SimpleGrid>
        ) : (
          <Box
            p="8"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            bg="gray.50"
          >
            <Stack gap="3" align="start">
              <Heading as="h3" size="lg">
                No articles found
              </Heading>
              <Text color="gray.600">
                Try another search or browse all topics.
              </Text>
              <Button
                type="button"
                variant="outline"
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
