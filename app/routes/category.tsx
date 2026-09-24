import { Box, Breadcrumb, Heading, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink, useParams } from 'react-router';
import { NotFound } from '../components/not-found';
import { WikiDirectory } from '../components/wiki-directory';
import { categories } from '../content/wiki';

export function meta({ params }: { params: { slug?: string } }) {
  const category = categories.find(({ slug }) => slug === params.slug);
  return category
    ? [
        { title: `${category.title} | Aion 2 Wiki` },
        { name: 'description', content: category.description },
      ]
    : [{ title: 'Page not found | Aion 2 Wiki' }];
}

export default function CategoryRoute(): React.JSX.Element {
  const { slug } = useParams();
  const category = categories.find((item) => item.slug === slug);

  if (!category) return <NotFound />;

  return (
    <Stack gap={{ base: '8', md: '10' }}>
      <Breadcrumb.Root
        aria-label="Breadcrumb"
        color="wiki.muted"
        textStyle="wiki.caption"
      >
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild color="wiki.accent">
              <RouterLink to="/">Home</RouterLink>
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink color="wiki.ink">
              {category.title}
            </Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
      <Box as="header" maxW="3xl">
        <Stack gap="3">
          <Text textStyle="wiki.label" color="wiki.accent">
            Chapter {String(categories.indexOf(category) + 1).padStart(2, '0')}
          </Text>
          <Heading as="h1" textStyle="wiki.title" color="wiki.ink">
            {category.title}
          </Heading>
          <Text textStyle="wiki.body" color="wiki.muted">
            {category.description}
          </Text>
        </Stack>
      </Box>
      <WikiDirectory key={category.slug} initialCategory={category.slug} />
    </Stack>
  );
}
