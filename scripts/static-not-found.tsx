import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { NotFound } from '../app/components/not-found';
import { WikiProvider } from '../app/components/ui/provider';
import { siteIcons } from '../app/seo';

export function renderNotFoundDocument(): string {
  return (
    '<!doctype html>' +
    renderToStaticMarkup(
      <html lang="en" className="dark">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="noindex" />
          <meta name="theme-color" content="#000000" />
          {siteIcons.links.map((link) => (
            <link key={link.href} {...link} />
          ))}
          <title>Page not found | Aion 2 Wiki</title>
        </head>
        <body>
          <WikiProvider>
            <MemoryRouter>
              <main>
                <NotFound />
              </main>
            </MemoryRouter>
          </WikiProvider>
        </body>
      </html>,
    )
  );
}
