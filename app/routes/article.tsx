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
    <Box
      as="article"
      maxW="7xl"
      mx="auto"
      minW="0"
      display={{ xl: 'grid' }}
      gridTemplateColumns={{ xl: 'minmax(0, 1fr) 15rem' }}
      columnGap={{ xl: '12' }}
      alignItems="start"
    >
      <Breadcrumb.Root
        aria-label="Breadcrumb"
        gridColumn={{ xl: '1' }}
        mb={{ base: '6', md: '8' }}
        textStyle="wiki.label"
        color="wiki.muted"
      >
        <Breadcrumb.List flexWrap="wrap" rowGap="2">
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
      <Box
        as="header"
        gridColumn={{ xl: '1' }}
        maxW="65ch"
        mb={{ base: '8', md: '10' }}
      >
        <Stack gap={{ base: '3', md: '4' }}>
          <Text
            color="wiki.accent"
            textStyle="wiki.label"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            {category ? 'Guide article' : 'Source and author'}
          </Text>
          <Heading
            as="h1"
            textStyle="wiki.title"
            color="wiki.ink"
            overflowWrap="anywhere"
          >
            {page.title}
          </Heading>
          <Text color="wiki.muted" textStyle="wiki.body">
            {page.summary}
          </Text>
          <Box
            role="note"
            data-source-status=""
            ps="4"
            py="1"
            borderStartWidth="2px"
            borderColor="wiki.border"
          >
            <Stack gap="1" textStyle="wiki.label" color="wiki.muted">
              <Badge
                alignSelf="start"
                variant="subtle"
                bg="wiki.accentSoft"
                color="wiki.accent"
                px="2"
                py="1"
              >
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
          <Text
            color="wiki.muted"
            textStyle="wiki.caption"
            data-source-credit=""
          >
            This guide preserves Kanon’s source statements and labels the
            source’s limits.{' '}
            <Link
              href={page.sourceUrl}
              color="wiki.accent"
              _hover={{ color: 'wiki.accentHover' }}
              textDecoration="underline"
            >
              Original source document
            </Link>
            {' · '}
            <Link
              asChild
              color="wiki.accent"
              _hover={{ color: 'wiki.accentHover' }}
              textDecoration="underline"
            >
              <RouterLink to="/source">About the source and author</RouterLink>
            </Link>
          </Text>
        </Stack>
      </Box>
      <Box
        as="aside"
        gridColumn={{ xl: '2' }}
        gridRow={{ xl: '1 / 4' }}
        position={{ xl: 'sticky' }}
        top={{ xl: '6' }}
        maxH={{ xl: 'calc(100vh - 3rem)' }}
        overflowY={{ xl: 'auto' }}
        minW="0"
      >
        <ArticleContents blocks={page.blocks} />
      </Box>
      <Box gridColumn={{ xl: '1' }} gridRow={{ xl: '3' }} minW="0">
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
            pt="5"
            borderTopWidth="1px"
            borderColor="wiki.border"
            color="wiki.muted"
          >
            <Stack gap="3">
              <Heading as="h2" textStyle="wiki.section" color="wiki.ink">
                Source link notes
              </Heading>
              <Text>
                Some original anchors could not be matched unambiguously to a
                captured block. Those links open the original document.
              </Text>
              <Box as="ul" pl="5" listStyleType="disc">
                {[...ambiguousLinks].map((href) => (
                  <Box as="li" key={href}>
                    <Link
                      href={sourceLinks[href]}
                      color="wiki.accent"
                      textDecoration="underline"
                    >
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
            borderColor="wiki.border"
          >
            {previous ? (
              <Link
                asChild
                color="wiki.accent"
                _hover={{ color: 'wiki.accentHover' }}
                fontWeight="medium"
              >
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
                color="wiki.accent"
                _hover={{ color: 'wiki.accentHover' }}
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
    </Box>
  );
}

export default function ArticleRoute(): React.JSX.Element {
  const { slug } = useParams();
  const page = slug ? getPage(slug) : undefined;
  if (!page || page.category === null) return <NotFound />;
  return <GuidePageView page={page} />;
}
