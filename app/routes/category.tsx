import {
  Box,
  Breadcrumb,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink, useParams } from 'react-router';
import { NotFound } from '../components/not-found';
import { articles, categories } from '../content/wiki';
import { breadcrumbJsonLd, guideTitle, notFoundMeta, pageMeta } from '../seo';

export function meta({ params }: { params: { slug?: string } }) {
  const category = categories.find(({ slug }) => slug === params.slug);
  if (!category) return notFoundMeta();
  const path = `/categories/${category.slug}`;
  return pageMeta({
    path,
    title: guideTitle(category.title),
    description: category.description,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Discover', path: '/' },
        { name: category.title, path },
      ]),
    ],
  });
}

const number = (position: number) => String(position + 1).padStart(2, '0');

export default function CategoryRoute(): React.JSX.Element {
  const { slug } = useParams();
  const category = categories.find((item) => item.slug === slug);

  if (!category) return <NotFound />;
  const index = categories.indexOf(category);
  const previous = categories[index - 1];
  const next = categories[index + 1];
  const chapterArticles = articles.filter(
    (article) => article.category === category.slug,
  );

  return (
    <Stack gap={{ base: '8', md: '10' }} maxW="44rem">
      <Breadcrumb.Root
        aria-label="Breadcrumb"
        color="wiki.muted"
        textStyle="wiki.caption"
      >
        <Breadcrumb.List flexWrap="wrap">
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild color="wiki.accent">
              <RouterLink to="/">Discover</RouterLink>
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
      <Box as="header">
        <Stack gap="3">
          <Text textStyle="wiki.label" color="wiki.accent">
            Chapter {number(index)}
          </Text>
          <Heading as="h1" textStyle="wiki.title" color="wiki.ink">
            {category.title}
          </Heading>
          <Text textStyle="wiki.body" color="wiki.muted">
            {category.description}
          </Text>
        </Stack>
      </Box>
      <Box
        as="ol"
        role="list"
        aria-label="Articles in this chapter"
        listStyleType="none"
        m="0"
        p="0"
      >
        {chapterArticles.map((article, position) => (
          <Box
            as="li"
            key={article.slug}
            display="grid"
            gridTemplateColumns="2.5rem minmax(0, 1fr)"
            columnGap="3"
            py="4"
            borderTopWidth="1px"
            borderColor="wiki.border"
          >
            <Text
              as="span"
              color="wiki.muted"
              fontSize="sm"
              fontVariantNumeric="tabular-nums"
              pt="1"
            >
              {number(position)}
            </Text>
            <Stack gap="1" minW="0">
              <Link
                asChild
                color="wiki.ink"
                fontSize="lg"
                fontWeight="semibold"
                lineHeight="1.35"
                _hover={{ color: 'wiki.accentHover' }}
              >
                <RouterLink to={`/articles/${article.slug}`}>
                  {article.title}
                </RouterLink>
              </Link>
              <Text textStyle="wiki.caption" color="wiki.muted">
                {article.summary}
              </Text>
            </Stack>
          </Box>
        ))}
      </Box>
      {(previous || next) && (
        <Flex
          as="nav"
          aria-label="Chapter navigation"
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          gap="4"
          pt="6"
          borderTopWidth="1px"
          borderColor="wiki.border"
        >
          {previous ? (
            <Link
              asChild
              display="flex"
              flexDirection="column"
              alignItems="flex-start"
              color="wiki.ink"
              borderWidth="1px"
              borderColor="wiki.border"
              borderRadius="wiki.control"
              minH="11"
              px="4"
              py="2"
              fontWeight="medium"
              _hover={{ color: 'wiki.accentHover' }}
            >
              <RouterLink to={`/categories/${previous.slug}`} rel="prev">
                <Text
                  as="span"
                  textStyle="wiki.caption"
                  color="wiki.muted"
                  fontWeight="normal"
                >
                  Previous chapter
                </Text>{' '}
                ← {number(index - 1)} {previous.title}
              </RouterLink>
            </Link>
          ) : (
            <Box />
          )}
          {next && (
            <Link
              asChild
              display="flex"
              flexDirection="column"
              alignItems={{ base: 'flex-start', sm: 'flex-end' }}
              color="wiki.ink"
              borderWidth="1px"
              borderColor="wiki.border"
              borderRadius="wiki.control"
              minH="11"
              px="4"
              py="2"
              fontWeight="medium"
              textAlign={{ sm: 'right' }}
              _hover={{ color: 'wiki.accentHover' }}
            >
              <RouterLink to={`/categories/${next.slug}`} rel="next">
                <Text
                  as="span"
                  textStyle="wiki.caption"
                  color="wiki.muted"
                  fontWeight="normal"
                >
                  Next chapter
                </Text>{' '}
                {number(index + 1)} {next.title} →
              </RouterLink>
            </Link>
          )}
        </Flex>
      )}
    </Stack>
  );
}
