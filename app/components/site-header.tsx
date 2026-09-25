import { Box, Button, Flex, Link, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router';

export function SiteHeader(): React.JSX.Element {
  const { pathname } = useLocation();
  return (
    <Box as="header" bg="wiki.surface">
      <Link
        href="#main-content"
        position="absolute"
        top="2"
        left="-9999px"
        zIndex="10"
        bg="wiki.accent"
        color="wiki.canvas"
        px="4"
        py="2"
        borderRadius="md"
        _focusVisible={{ left: '4', outlineColor: 'wiki.accent' }}
      >
        Skip to content
      </Link>
      <Flex
        as="nav"
        aria-label="Main navigation"
        maxW="90rem"
        mx="auto"
        minH={{ base: '76px', lg: '92px' }}
        p={{ base: '4', lg: '6' }}
        align="center"
        gap="6"
      >
        <Link
          asChild
          aria-label="Aion 2 Wiki"
          color="wiki.ink"
          fontWeight="semibold"
          fontSize={{ base: 'lg', lg: '22px' }}
          flexShrink="0"
          w={{ lg: '248px' }}
          _hover={{ color: 'wiki.accent', textDecoration: 'none' }}
        >
          <RouterLink to="/">AION 2 / WIKI</RouterLink>
        </Link>
        <Text
          display={{ base: 'none', lg: 'block' }}
          textStyle="wiki.eyebrow"
          color="wiki.muted"
          flex="1"
        >
          The community field guide
        </Text>
        <Button
          asChild
          variant="ghost"
          display={{ base: 'none', lg: 'inline-flex' }}
          aria-current={pathname === '/source' ? 'page' : undefined}
        >
          <RouterLink to="/source">About the source</RouterLink>
        </Button>
        <Button
          asChild
          variant="outline"
          display={{ base: 'inline-flex', lg: 'none' }}
          ml="auto"
          minW="28"
        >
          <RouterLink to="/#chapters">Chapters</RouterLink>
        </Button>
      </Flex>
    </Box>
  );
}
