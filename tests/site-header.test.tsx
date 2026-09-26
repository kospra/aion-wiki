import { render } from './render';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { SiteHeader } from '../app/components/site-header';

it('marks the source page as current with or without a trailing slash', () => {
  for (const path of ['/source', '/source/']) {
    const { container, unmount } = render(
      <MemoryRouter initialEntries={[path]}>
        <SiteHeader />
      </MemoryRouter>,
    );
    expect(container.querySelector('a[href="/source"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    unmount();
  }
});
