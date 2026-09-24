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
import './styles/theme.css';
import './styles/global.css';
import './styles/wiki.css';

export function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0c111b" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function SiteFooter(): React.JSX.Element {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span>Aion 2 Wiki</span>
        <span>An independent reference in progress</span>
      </div>
    </footer>
  );
}

export default function App(): React.JSX.Element {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

export function ErrorBoundary(): React.JSX.Element {
  const error = useRouteError();

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {isRouteErrorResponse(error) && error.status === 404 ? (
          <NotFound />
        ) : (
          <section className="not-found" aria-labelledby="error-title">
            <p className="eyebrow">The archive is temporarily unavailable</p>
            <h1 id="error-title">Something went wrong</h1>
            <p>
              We could not display this page. Please try returning to the
              homepage.
            </p>
            <a className="button-link" href="/">
              Return to the homepage
            </a>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
