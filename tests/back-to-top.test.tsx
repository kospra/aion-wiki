import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from './render';
import userEvent from '@testing-library/user-event';
import { BackToTop } from '../app/components/back-to-top';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

it('appears after one viewport and hides again near the top', () => {
  render(<BackToTop targetId="article-title" />);
  expect(
    screen.queryByRole('button', { name: 'Back to top' }),
  ).not.toBeInTheDocument();
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: window.innerHeight + 1,
  });
  fireEvent.scroll(window);
  expect(screen.getByRole('button', { name: 'Back to top' })).toBeVisible();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  fireEvent.scroll(window);
  expect(
    screen.queryByRole('button', { name: 'Back to top' }),
  ).not.toBeInTheDocument();
});

it.each([false, true])(
  'returns focus to the title and honors reduced motion: %s',
  async (reduced) => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: reduced })),
    );
    render(
      <>
        <h1 id="article-title" tabIndex={-1}>
          Article title
        </h1>
        <BackToTop targetId="article-title" />
      </>,
    );
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: window.innerHeight + 1,
    });
    fireEvent.scroll(window);
    const button = screen.getByRole('button', { name: 'Back to top' });
    button.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(screen.getByRole('heading')).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({
      top: 0,
      behavior: reduced ? 'instant' : 'smooth',
    });
  },
);
