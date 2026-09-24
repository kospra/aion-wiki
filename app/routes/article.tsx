import {
  Badge,
  Box,
  Breadcrumb,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink, useParams } from 'react-router';
import { ArticleContents } from '../components/article-contents';
import { NotFound } from '../components/not-found';
import { RichContent } from '../components/rich-content';
import { articles, categories } from '../content/wiki';
import {
  figureById,
  getPage,
  pagePath,
  sourceLinkNotes,
  sourceLinks,
} from '../content/repository';
import { blockInlineSegments, walkBlocks } from '../content/reader';
import type { GuidePage } from '../content/types';

export function meta({ params }: { params: { slug?: string } }) {
  const article = articles.find(({ slug }) => slug === params.slug);
  return article
    ? [
        { title: `${article.title} | Aion 2 Wiki` },
        { name: 'description', content: article.summary },
      ]
    : [{ title: 'Page not found | Aion 2 Wiki' }];
}

const statusText = {
  'source-backed': 'Source backed',
  'source-uncertain': 'Source context and uncertainty',
  'source-pending': 'Source pending',
};

export function GuidePageView({
  page,
}: {
  page: GuidePage;
}): React.JSX.Element {
  const category = categories.find((item) => item.slug === page.category);
  const index = articles.findIndex((item) => item.slug === page.slug);
  const previous = index > 0 ? articles[index - 1] : undefined;
  const next = index >= 0 ? articles[index + 1] : undefined;
  const ambiguousLinks = new Set(
    walkBlocks(page.blocks)
      .flatMap((block) => blockInlineSegments(block).flat())
      .map((part) => part.href)
      .filter((href): href is string => Boolean(href && sourceLinkNotes[href])),
  );

  return (
    <Box as="article" maxW="5xl" mx="auto">
      <Breadcrumb.Root aria-label="Breadcrumb" mb="8">
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild>
              <RouterLink to="/">Home</RouterLink>
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          {category && (
            <>
              <Breadcrumb.Item>
                <Breadcrumb.Link asChild>
                  <RouterLink to={`/categories/${category.slug}`}>
                    {category.title}
                  </RouterLink>
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
            </>
          )}
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>{page.title}</Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
      <Box as="header" maxW="3xl" mb="8">
        <Stack gap="4">
          <Text color="gray.600" fontSize="sm" fontWeight="semibold">
            {category ? 'Guide article' : 'Source and author'}
          </Text>
          <Heading as="h1" size={{ base: '3xl', md: '4xl' }}>
            {page.title}
          </Heading>
          <Text color="gray.600" fontSize="lg">
            {page.summary}
          </Text>
          <Box
            role="note"
            data-source-status=""
            p="5"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="gray.50"
          >
            <Stack gap="2">
              <Badge alignSelf="start" variant="subtle" colorPalette="gray">
                {statusText[page.status]}
              </Badge>
              {page.status === 'source-pending' && (
                <Text>
                  The captured chapter says Coming soon; no guide details were
                  supplied for it.
                </Text>
              )}
              {page.qualifiers.map((qualifier) => (
                <Text key={qualifier}>{qualifier}</Text>
              ))}
            </Stack>
          </Box>
          <Text color="gray.600" fontSize="sm" data-source-credit="">
            This guide preserves Kanon’s source statements and labels the
            source’s limits.{' '}
            <Link href={page.sourceUrl} textDecoration="underline">
              Original source document
            </Link>
            {' · '}
            <Link asChild textDecoration="underline">
              <RouterLink to="/source">About the source and author</RouterLink>
            </Link>
          </Text>
        </Stack>
      </Box>
      <ArticleContents blocks={page.blocks} />
      <RichContent
        blocks={page.blocks}
        figures={figureById}
        sourceLinks={sourceLinks}
      />
      {ambiguousLinks.size > 0 && (
        <Box
          as="aside"
          aria-label="Source link notes"
          mt="10"
          p="5"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          bg="gray.50"
        >
          <Stack gap="3">
            <Heading as="h2" size="lg">
              Source link notes
            </Heading>
            <Text>
              Some original anchors could not be matched unambiguously to a
              captured block. Those links open the original document.
            </Text>
            <Box as="ul" pl="5" listStyleType="disc">
              {[...ambiguousLinks].map((href) => (
                <Box as="li" key={href}>
                  <Link href={sourceLinks[href]} textDecoration="underline">
                    {href}
                  </Link>
                  : {sourceLinkNotes[href]}
                </Box>
              ))}
            </Box>
          </Stack>
        </Box>
      )}
      {(previous || next) && (
        <Flex
          as="nav"
          aria-label="Guide article navigation"
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          gap="4"
          mt="10"
          pt="6"
          borderTopWidth="1px"
          borderColor="gray.200"
        >
          {previous ? (
            <Link asChild color="gray.900" fontWeight="medium">
              <RouterLink to={pagePath(previous.slug)} rel="prev">
                ← Previous: {previous.title}
              </RouterLink>
            </Link>
          ) : (
            <Box />
          )}
          {next && (
            <Link
              asChild
              color="gray.900"
              fontWeight="medium"
              textAlign={{ sm: 'right' }}
            >
              <RouterLink to={pagePath(next.slug)} rel="next">
                Next: {next.title} →
              </RouterLink>
            </Link>
          )}
        </Flex>
      )}
    </Box>
  );
}

export default function ArticleRoute(): React.JSX.Element {
  const { slug } = useParams();
  const page = slug ? getPage(slug) : undefined;
  if (!page || page.category === null) return <NotFound />;
  return <GuidePageView page={page} />;
}
