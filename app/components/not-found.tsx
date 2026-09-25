import { Box, Heading, Link, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router';

export function NotFound(): React.JSX.Element {
  return (
    <Box
      as="section"
      aria-labelledby="not-found-title"
      maxW="2xl"
      mx="auto"
      my="12"
      p={{ base: '8', md: '12' }}
      borderWidth="1px"
      borderColor="wiki.border"
      borderRadius="lg"
      bg="wiki.surface"
      textAlign="center"
    >
      <Stack gap="4" align="center">
        <Text color="wiki.muted" fontSize="sm">
          The trail ends here
        </Text>
        <Heading as="h1" id="not-found-title" size="3xl" color="wiki.ink">
          Page not found
        </Heading>
        <Text color="wiki.muted">
          We could not find that page in the archive. Check the address or
          return to the homepage.
        </Text>
        <Link
          asChild
          display="inline-flex"
          alignItems="center"
          minH="11"
          px="5"
          py="2"
          bg="wiki.accent"
          color="wiki.canvas"
          borderRadius="md"
          fontWeight="semibold"
          _hover={{ bg: 'wiki.accentHover' }}
        >
          <RouterLink to="/">Return to the homepage</RouterLink>
        </Link>
      </Stack>
    </Box>
  );
}
