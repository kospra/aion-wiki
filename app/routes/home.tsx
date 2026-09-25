import { Box, Heading, Link, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router';
import { WikiDirectory } from '../components/wiki-directory';
import { articles, categories } from '../content/wiki';

export function meta() {
  return [
    { title: 'Aion 2 Wiki | Kanon guide reference' },
    {
      name: 'description',
      content:
        'Browse a sourced Aion 2 guide with 12 chapters, 43 articles, figures, and source context.',
    },
  ];
}

export default function Home(): React.JSX.Element {
  return (
    <Stack gap={{ base: '12', md: '16' }}>
      <Box
        as="section"
        aria-labelledby="home-title"
        pt={{ base: '2', md: '6' }}
      >
        <Stack gap="4" maxW="3xl" align="start">
          <Text textStyle="wiki.label" color="wiki.accent">
            Kanon’s guide · Source-aware reference
          </Text>
          <Heading
            as="h1"
            id="home-title"
            textStyle="wiki.title"
            color="wiki.ink"
          >
            Aion 2 Wiki
          </Heading>
          <Text textStyle="wiki.body" color="wiki.muted" maxW="65ch">
            Explore the equipment, skills, enhancement systems, stats, and class
            notes in a captured community guide.
          </Text>
          <Text textStyle="wiki.caption" color="wiki.muted" pt="1">
            {categories.length} chapters · {articles.length} articles · Original
            figures
          </Text>
        </Stack>
      </Box>

      <WikiDirectory />

      <Box
        as="section"
        aria-labelledby="intro-title"
        borderTopWidth="1px"
        borderColor="wiki.border"
        pt={{ base: '6', md: '8' }}
        pb={{ base: '2', md: '4' }}
      >
        <Stack gap="3" maxW="3xl">
          <Text textStyle="wiki.label" color="wiki.accent">
            About this reference
          </Text>
          <Heading
            as="h2"
            id="intro-title"
            textStyle="wiki.section"
            color="wiki.ink"
          >
            A captured guide with context
          </Heading>
          <Text textStyle="wiki.body" color="wiki.muted">
            Article text and images come from Kanon’s guide. Source
            qualifications and regional or date limits appear alongside the
            claims they qualify.{' '}
            <Link
              asChild
              color="wiki.accent"
              textDecoration="underline"
              textUnderlineOffset="3px"
              _hover={{ color: 'wiki.accentHover' }}
            >
              <RouterLink to="/source">About the source and author</RouterLink>
            </Link>
          </Text>
        </Stack>
      </Box>
    </Stack>
  );
}
