import { Box, Heading, Link, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router';
import { categories } from '../content/wiki';
import type { CatalogueEntry } from '../content/types';

export function ArticleCard({
  article,
}: {
  article: CatalogueEntry;
}): React.JSX.Element {
  const category = categories.find(({ slug }) => slug === article.category);

  return (
    <Box as="article" minW="0">
      <Link
        asChild
        display="block"
        h="full"
        layerStyle="wiki.card"
        color="wiki.ink"
        _hover={{ color: 'wiki.accent' }}
        _focusVisible={{ outlineColor: 'wiki.accent', outlineOffset: '3px' }}
      >
        <RouterLink to={`/articles/${article.slug}`}>
          <Stack gap="2">
            <Text textStyle="wiki.label" color="wiki.muted">
              {category?.title}
            </Text>
            <Heading
              as="h3"
              fontSize="lg"
              lineHeight="1.35"
              fontWeight="semibold"
            >
              {article.title}
            </Heading>
            <Text textStyle="wiki.caption" color="wiki.muted">
              {article.summary}
            </Text>
            {article.status === 'source-pending' && (
              <Text textStyle="wiki.caption" color="wiki.muted" mt="1">
                Not written yet
              </Text>
            )}
          </Stack>
        </RouterLink>
      </Link>
    </Box>
  );
}
