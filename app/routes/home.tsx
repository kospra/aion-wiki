import {
  Badge,
  Box,
  Card,
  Heading,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
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
    <Stack gap={{ base: '10', md: '16' }}>
      <Box
        as="section"
        aria-labelledby="home-title"
        py={{ base: '10', md: '16' }}
      >
        <Stack gap="5" maxW="3xl" align="start">
          <Text color="gray.600" fontSize="sm" fontWeight="semibold">
            Kanon’s guide · Source-aware reference
          </Text>
          <Heading
            as="h1"
            id="home-title"
            size={{ base: '4xl', md: '5xl' }}
            color="gray.900"
          >
            Aion 2 Wiki
          </Heading>
          <Text fontSize={{ base: 'lg', md: 'xl' }} color="gray.600">
            Explore the equipment, skills, enhancement systems, stats, and class
            notes in a captured community guide.
          </Text>
          <Link
            href="#directory-title"
            display="inline-flex"
            alignItems="center"
            minH="11"
            px="5"
            py="2"
            bg="gray.900"
            color="white"
            borderRadius="md"
            fontWeight="semibold"
            _hover={{ bg: 'gray.700' }}
          >
            Explore the guide
          </Link>
          <Text color="gray.500" fontSize="sm">
            {categories.length} chapters · {articles.length} articles · Original
            figures
          </Text>
        </Stack>
      </Box>
      <Box
        as="section"
        aria-labelledby="intro-title"
        p={{ base: '6', md: '8' }}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="lg"
        bg="gray.50"
      >
        <Stack gap="3" maxW="3xl">
          <Text color="gray.600" fontSize="sm" fontWeight="semibold">
            About this reference
          </Text>
          <Heading as="h2" id="intro-title" size="xl">
            A captured guide with context
          </Heading>
          <Text color="gray.700">
            Article text and images come from Kanon’s guide. Source
            qualifications and regional or date limits appear alongside the
            claims they qualify.{' '}
            <Link asChild textDecoration="underline" textUnderlineOffset="3px">
              <RouterLink to="/source">About the source and author</RouterLink>
            </Link>
          </Text>
        </Stack>
      </Box>
      <Box as="section" aria-labelledby="category-title">
        <Stack gap="5">
          <Stack gap="2">
            <Text color="gray.600" fontSize="sm" fontWeight="semibold">
              Find your path
            </Text>
            <Heading as="h2" id="category-title" size="2xl">
              Browse by category
            </Heading>
          </Stack>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="4">
            {categories.map((category, index) => (
              <Card.Root key={category.slug} variant="outline" bg="white">
                <Link
                  asChild
                  display="block"
                  h="full"
                  color="inherit"
                  _hover={{ textDecoration: 'none', bg: 'gray.50' }}
                >
                  <RouterLink to={`/categories/${category.slug}`}>
                    <Card.Body gap="3">
                      <Text color="gray.500" fontSize="sm">
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                      <Card.Title as="h3" fontSize="lg" color="gray.900">
                        {category.title}
                      </Card.Title>
                      <Card.Description color="gray.600">
                        {category.description}
                      </Card.Description>
                      <Badge
                        variant="subtle"
                        colorPalette="gray"
                        alignSelf="start"
                      >
                        {category.slug === 'class-passives'
                          ? 'Source pending'
                          : 'Guide chapter'}
                      </Badge>
                    </Card.Body>
                  </RouterLink>
                </Link>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Stack>
      </Box>
      <WikiDirectory />
    </Stack>
  );
}
