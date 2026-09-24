import {
  Box,
  Container,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  Links,
  Meta,
  Outlet,
  ScrollRestoration,
  Scripts,
  isRouteErrorResponse,
  useRouteError,
} from 'react-router';
import { NotFound } from './components/not-found';
import { SiteHeader } from './components/site-header';
import { WikiProvider } from './components/ui/provider';

export function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <Meta />
        <Links />
      </head>
      <body>
        <WikiProvider>{children}</WikiProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function SiteFooter(): React.JSX.Element {
  return (
    <Box
      as="footer"
      borderTopWidth="1px"
      borderColor="gray.200"
      bg="white"
      color="gray.600"
    >
      <Container maxW="7xl">
        <Flex
          minH="24"
          py="6"
          align="center"
          justify="space-between"
          gap="3"
          direction={{ base: 'column', sm: 'row' }}
        >
          <Text fontSize="lg" fontWeight="semibold" color="gray.900">
            Aion 2 Wiki
          </Text>
          <Text fontSize="sm">An independent reference in progress</Text>
        </Flex>
      </Container>
    </Box>
  );
}

function Main({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Container
      as="main"
      id="main-content"
      tabIndex={-1}
      maxW="7xl"
      flex="1"
      px={{ base: '4', md: '6' }}
      py={{ base: '8', md: '12' }}
    >
      {children}
    </Container>
  );
}

export default function App(): React.JSX.Element {
  return (
    <>
      <SiteHeader />
      <Main>
        <Outlet />
      </Main>
      <SiteFooter />
    </>
  );
}

export function ErrorBoundary(): React.JSX.Element {
  const error = useRouteError();

  return (
    <>
      <SiteHeader />
      <Main>
        {isRouteErrorResponse(error) && error.status === 404 ? (
          <NotFound />
        ) : (
          <Box
            as="section"
            aria-labelledby="error-title"
            maxW="2xl"
            mx="auto"
            my="12"
            p={{ base: '8', md: '12' }}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            bg="white"
            textAlign="center"
          >
            <Stack gap="4" align="center">
              <Text color="gray.600" fontSize="sm">
                The archive is temporarily unavailable
              </Text>
              <Heading as="h1" id="error-title" size="3xl" color="gray.900">
                Something went wrong
              </Heading>
              <Text color="gray.600">
                We could not display this page. Please try returning to the
                homepage.
              </Text>
              <Link
                href="/"
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
                Return to the homepage
              </Link>
            </Stack>
          </Box>
        )}
      </Main>
      <SiteFooter />
    </>
  );
}
