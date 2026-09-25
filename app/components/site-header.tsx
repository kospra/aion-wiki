import { Box, Container, Flex, Link, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router';

export function SiteHeader(): React.JSX.Element {
  const { pathname } = useLocation();
  return (
    <Box
      as="header"
      bg="wiki.canvas"
      borderBottomWidth="1px"
      borderColor="wiki.border"
    >
      <Link
        href="#main-content"
        position="absolute"
        top="2"
        left="-9999px"
        zIndex="10"
        bg="wiki.accent"
        color="white"
        px="4"
        py="2"
        borderRadius="md"
        _focusVisible={{ left: '4', outlineColor: 'wiki.accent' }}
      >
        Skip to content
      </Link>
      <Container maxW="7xl" px={{ base: '4', md: '6' }}>
        <Flex
          as="nav"
          aria-label="Main navigation"
          minH="16"
          align="center"
          justify="space-between"
          gap="4"
        >
          <Link
            asChild
            color="wiki.ink"
            fontWeight="bold"
            fontSize="lg"
            letterSpacing="-0.02em"
            _hover={{ color: 'wiki.accent', textDecoration: 'none' }}
          >
            <RouterLink to="/">Aion 2 Wiki</RouterLink>
          </Link>
          <Text
            display={{ base: 'none', lg: 'block' }}
            textStyle="wiki.caption"
            color="wiki.muted"
            ml="auto"
          >
            Kanon's guide reference
          </Text>
          <Link
            asChild
            display="inline-flex"
            textStyle="wiki.label"
            color={pathname === '/source' ? 'wiki.accent' : 'wiki.muted'}
            _hover={{ color: 'wiki.accent' }}
          >
            <RouterLink to="/source">About the source</RouterLink>
          </Link>
        </Flex>
      </Container>
    </Box>
  );
}
