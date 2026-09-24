import {
  Box,
  Button,
  Collapsible,
  Container,
  Flex,
  Link,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { categories } from '../content/wiki';

export function SiteHeader(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box as="header" bg="white" borderBottomWidth="1px" borderColor="gray.200">
      <Link
        href="#main-content"
        position="absolute"
        top="2"
        left="-9999px"
        zIndex="10"
        bg="gray.900"
        color="white"
        px="4"
        py="2"
        borderRadius="md"
        _focusVisible={{ left: '4' }}
      >
        Skip to content
      </Link>
      <Container maxW="7xl" px={{ base: '4', md: '6' }}>
        <Box as="nav" aria-label="Main navigation">
          <Collapsible.Root
            open={expanded}
            onOpenChange={(details) => setExpanded(details.open)}
          >
            <Flex minH="18" align="center" justify="space-between" gap="4">
              <Link
                asChild
                color="gray.900"
                fontWeight="bold"
                fontSize="lg"
                _hover={{ textDecoration: 'none' }}
              >
                <RouterLink to="/">Aion 2 Wiki</RouterLink>
              </Link>
              <Collapsible.Trigger asChild>
                <Button variant="outline" size="sm" display={{ md: 'none' }}>
                  Browse chapters
                </Button>
              </Collapsible.Trigger>
            </Flex>
            <Collapsible.Content
              display={{ md: 'none' }}
              _motionReduce={{ animation: 'none' }}
            >
              <Box
                id="chapter-navigation"
                role="group"
                aria-label="Browse chapters"
                borderTopWidth="1px"
                borderColor="gray.200"
                py="4"
              >
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap="1">
                  {categories.map(({ slug, title }, index) => (
                    <Link
                      key={slug}
                      asChild
                      onClick={() => setExpanded(false)}
                      display="block"
                      px="3"
                      py="2"
                      borderRadius="md"
                      color="gray.700"
                      _hover={{ bg: 'gray.100', color: 'gray.900' }}
                    >
                      <RouterLink to={`/categories/${slug}`}>
                        <Text as="span" color="gray.500" fontSize="sm" mr="2">
                          {String(index + 1).padStart(2, '0')}
                        </Text>{' '}
                        {title}
                      </RouterLink>
                    </Link>
                  ))}
                  <Link
                    asChild
                    onClick={() => setExpanded(false)}
                    display="block"
                    px="3"
                    py="2"
                    borderRadius="md"
                    color="gray.700"
                  >
                    <RouterLink to="/source">About the source</RouterLink>
                  </Link>
                </SimpleGrid>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
          <Box
            display={{ base: 'none', md: 'block' }}
            borderTopWidth="1px"
            borderColor="gray.100"
            py="3"
          >
            <Flex
              role="group"
              aria-label="Desktop chapters"
              wrap="wrap"
              gapX="5"
              gapY="2"
              align="center"
            >
              {categories.map(({ slug, title }) => (
                <Link
                  key={slug}
                  asChild
                  fontSize="sm"
                  color="gray.700"
                  _hover={{ color: 'gray.900' }}
                >
                  <RouterLink to={`/categories/${slug}`}>{title}</RouterLink>
                </Link>
              ))}
              <Link
                asChild
                fontSize="sm"
                color="gray.700"
                _hover={{ color: 'gray.900' }}
              >
                <RouterLink to="/source">About the source</RouterLink>
              </Link>
            </Flex>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
