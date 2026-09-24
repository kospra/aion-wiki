import { Button } from '@chakra-ui/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, it } from 'vitest';
import App, { ErrorBoundary } from '../app/root';
import { render, screen } from './render';

it('renders a styled Chakra control through the wiki provider', () => {
  render(<Button>Provider ready</Button>);

  const button = screen.getByRole('button', { name: 'Provider ready' });
  expect(button).toBeVisible();
  expect(button).toHaveClass('chakra-button');
  expect(document.querySelector('style[data-emotion]')).toBeInTheDocument();
});

it('keeps the shared shell and footer on a normal route', () => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: App,
        children: [{ index: true, element: <p>Route content</p> }],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);

  expect(screen.getByRole('main')).toHaveClass('chakra-container');
  expect(screen.getByText('Route content')).toBeVisible();
  expect(
    screen.getByText('An independent reference in progress'),
  ).toBeVisible();
});

it('keeps a styled recovery action on a route error', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: App,
        HydrateFallback: () => <p>Loading route</p>,
        ErrorBoundary,
        children: [
          {
            path: 'broken',
            loader: () => {
              throw new Error('Unavailable');
            },
            element: <p>Never shown</p>,
          },
        ],
      },
    ],
    { initialEntries: ['/broken'] },
  );
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole('main')).toHaveClass('chakra-container');
  expect(
    screen.getByRole('heading', { name: 'Something went wrong' }),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Return to the homepage' }),
  ).toHaveAttribute('href', '/');
});
