import { useMemo } from 'react';
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
import { BackToTop } from '../components/back-to-top';
import { ArticleContents } from '../components/article-contents';
import { NotFound } from '../components/not-found';
import { RichContent } from '../components/rich-content';
import { articles, categories } from '../content/wiki';
import {
  figureById,
  getPage,
  pagePath,
  sourceLinks,
} from '../content/repository';
import { orderTldrFirst } from '../content/rules';
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

export function GuidePageView({
  page,
}: {
  page: GuidePage;
}): React.JSX.Element {
  const category = categories.find((item) => item.slug === page.category);
  const index = articles.findIndex((item) => item.slug === page.slug);
  const previous = index > 0 ? articles[index - 1] : undefined;
  const next = index >= 0 ? articles[index + 1] : undefined;
  const blocks = useMemo(() => orderTldrFirst(page.blocks), [page.blocks]);
  const chapterTitle = (slug: string | null) =>
    categories.find((item) => item.slug === slug)?.title;

  return (
    <Box
      as="article"
      maxW="full"
      minW="0"
      display={{ xl: 'grid' }}
      gridTemplateColumns={{ xl: 'minmax(0, 44rem) minmax(13rem, 17.5rem)' }}
      columnGap={{ xl: '12' }}
      alignItems="start"
    >
      {page.category && <BackToTop key={page.slug} targetId="article-title" />}
      <Breadcrumb.Root
        aria-label="Breadcrumb"
        gridColumn={{ xl: '1' }}
        mb={{ base: '6', md: '8' }}
        textStyle="wiki.caption"
        color="wiki.muted"
      >
        <Breadcrumb.List flexWrap="wrap" rowGap="2">
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild>
              <RouterLink to="/">Discover</RouterLink>
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
      <Box as="header" gridColumn={{ xl: '1' }} maxW="65ch" mb="6">
        <Stack gap="4">
          <Text
            color="wiki.accent"
            textStyle="wiki.eyebrow"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            {category
              ? `Chapter ${String(categories.indexOf(category) + 1).padStart(2, '0')} / ${category.title}`
              : 'Source and author'}
          </Text>
          <Heading
            as="h1"
            id="article-title"
            tabIndex={-1}
            textStyle="wiki.title"
            maxW="18ch"
            color="wiki.ink"
            overflowWrap="anywhere"
          >
            {page.title}
          </Heading>
          <Text color="wiki.muted" textStyle="wiki.body">
            {page.summary}
          </Text>
          {page.status === 'source-pending' && (
            <Text
              role="note"
              p="4"
              bg="wiki.surface"
              borderRadius="wiki.panel"
              color="wiki.muted"
              textStyle="wiki.body"
            >
              This chapter is not written yet. The original guide marks it as
              Coming soon.
            </Text>
          )}
          <Text
            color="wiki.muted"
            textStyle="wiki.caption"
            data-source-credit=""
          >
            Source:{' '}
            <Link
              href={page.sourceUrl}
              color="wiki.accent"
              _hover={{ color: 'wiki.accentHover' }}
              textDecoration="underline"
            >
              Kanon’s Aion 2 guide
            </Link>
            {category && (
              <>
                {' · '}
                <Link
                  asChild
                  color="wiki.accent"
                  _hover={{ color: 'wiki.accentHover' }}
                  textDecoration="underline"
                >
                  <RouterLink to="/source">About the author</RouterLink>
                </Link>
              </>
            )}
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
        <ArticleContents blocks={blocks} />
      </Box>
      <Box gridColumn={{ xl: '1' }} gridRow={{ xl: '3' }} minW="0">
        <RichContent
          blocks={blocks}
          figures={figureById}
          sourceLinks={sourceLinks}
        />
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
                _hover={{ color: 'wiki.accentHover' }}
                fontWeight="medium"
              >
                <RouterLink to={pagePath(previous.slug)} rel="prev">
                  {previous.category !== page.category && (
                    <Text
                      as="span"
                      display="block"
                      textStyle="wiki.caption"
                      color="wiki.muted"
                      fontWeight="normal"
                    >
                      Previous chapter · {chapterTitle(previous.category)}
                    </Text>
                  )}{' '}
                  ← Previous: {previous.title}
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
                _hover={{ color: 'wiki.accentHover' }}
                fontWeight="medium"
                textAlign={{ sm: 'right' }}
              >
                <RouterLink to={pagePath(next.slug)} rel="next">
                  {next.category !== page.category && (
                    <Text
                      as="span"
                      display="block"
                      textStyle="wiki.caption"
                      color="wiki.muted"
                      fontWeight="normal"
                    >
                      Next chapter · {chapterTitle(next.category)}
                    </Text>
                  )}{' '}
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
