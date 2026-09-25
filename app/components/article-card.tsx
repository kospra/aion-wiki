import { Box, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react';
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
            <Flex align="start" justify="space-between" gap="4">
              <Text textStyle="wiki.label" color="wiki.muted">
                {category?.title}
              </Text>
              <Text as="span" aria-hidden="true" color="wiki.accent">
                ↗
              </Text>
            </Flex>
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
            <Text textStyle="wiki.caption" color="wiki.muted" mt="1">
              {article.status === 'source-pending'
                ? 'Source pending'
                : 'From Kanon’s guide'}
            </Text>
          </Stack>
        </RouterLink>
      </Link>
    </Box>
  );
}
