import { Badge, Card, Link, Stack, Text } from '@chakra-ui/react';
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
    <Card.Root as="article" variant="outline" h="full" bg="white">
      <Link
        asChild
        display="block"
        h="full"
        color="inherit"
        _hover={{ textDecoration: 'none', bg: 'gray.50' }}
      >
        <RouterLink to={`/articles/${article.slug}`}>
          <Card.Body>
            <Stack gap="3" align="start">
              <Text fontSize="sm" color="gray.600">
                {category?.title}
              </Text>
              <Card.Title as="h3" fontSize="lg" color="gray.900">
                {article.title}
              </Card.Title>
              <Card.Description color="gray.600">
                {article.summary}
              </Card.Description>
              <Badge variant="subtle" colorPalette="gray">
                {article.status === 'source-pending'
                  ? 'Source pending'
                  : 'From Kanon’s guide'}
              </Badge>
            </Stack>
          </Card.Body>
        </RouterLink>
      </Link>
    </Card.Root>
  );
}
