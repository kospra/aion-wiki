import { Box, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react';
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
import { siteIcons } from './seo';
import { SiteHeader } from './components/site-header';
import { WikiProvider } from './components/ui/provider';
import { ChapterNavigation } from './components/chapter-navigation';
import '@fontsource-variable/inter';

export function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        {siteIcons.links.map((link) => (
          <link key={link.href} {...link} />
        ))}
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
      borderColor="wiki.border"
      color="wiki.muted"
      mt="8"
      py="6"
    >
      <Flex align="center" justify="space-between" gap="3" flexWrap="wrap">
        <Text fontSize="xs">Based on Kanon’s Aion 2 guide.</Text>
        <Link href="/source" fontSize="xs" color="wiki.muted">
          About the source
        </Link>
      </Flex>
    </Box>
  );
}

function Main({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Flex
      maxW="90rem"
      w="full"
      mx="auto"
      gap={{ lg: '2' }}
      flex="1"
      align="start"
    >
      <ChapterNavigation />
      <Box
        as="main"
        id="main-content"
        tabIndex={-1}
        minW="0"
        flex="1"
        p={{ base: '4', md: '8' }}
      >
        {children}
        <SiteFooter />
      </Box>
    </Flex>
  );
}

export default function App(): React.JSX.Element {
  return (
    <>
      <SiteHeader />
      <Main>
        <Outlet />
      </Main>
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
            layerStyle="wiki.panel"
            textAlign="center"
          >
            <Stack gap="4" align="center">
              <Text color="wiki.muted" fontSize="sm">
                The archive is temporarily unavailable
              </Text>
              <Heading as="h1" id="error-title" size="3xl" color="wiki.ink">
                Something went wrong
              </Heading>
              <Text color="wiki.muted">
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
                bg="wiki.accent"
                color="wiki.canvas"
                borderRadius="wiki.control"
                fontWeight="semibold"
                _hover={{ bg: 'wiki.accentHover' }}
              >
                Return to the homepage
              </Link>
            </Stack>
          </Box>
        )}
      </Main>
    </>
  );
}
