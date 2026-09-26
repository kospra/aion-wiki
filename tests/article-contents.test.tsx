import { fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from './render';
import { ArticleContents } from '../app/components/article-contents';
import type { Block } from '../app/content/types';

const blocks: Block[] = ['Overview', 'Materials', 'Result'].map(
  (text, index) => ({
    id: `section-${index}`,
    sourceIds: [],
    kind: 'heading',
    level: index === 1 ? 3 : 2,
    content: [{ text }],
  }),
);
afterEach(() => vi.restoreAllMocks());

// Below the wide breakpoint the list shows once its disclosure is open.
const openContents = () => {
  const details = screen
    .getByRole('navigation', { name: 'On this page' })
    .querySelector('details');
  if (details) details.open = true;
};

it('tracks the section across downward and upward scrolling and anchor navigation', async () => {
  let tops = [100, 700, 1400];
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const index = blocks.findIndex((block) => block.id === this.id);
      return {
        top: tops[index] ?? 0,
        bottom: (tops[index] ?? 0) + 40,
        height: 40,
        width: 600,
        left: 0,
        right: 600,
        x: 0,
        y: tops[index] ?? 0,
        toJSON() {},
      };
    },
  );
  render(
    <>
      <ArticleContents blocks={blocks} />
      {blocks.map((block) => (
        <h2 key={block.id} id={block.id}>
          {block.id}
        </h2>
      ))}
    </>,
  );
  openContents();
  const active = async (name: string) => {
    await waitFor(() =>
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'aria-current',
        'location',
      ),
    );
    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(
      1,
    );
  };
  await active('Overview');
  tops = [-700, -100, 600];
  fireEvent.scroll(window);
  await active('Materials');
  tops = [-50, 550, 1250];
  fireEvent.scroll(window);
  await active('Overview');
  tops = [-1300, -700, 24];
  fireEvent(window, new HashChangeEvent('hashchange'));
  await active('Result');
});

it('hides the contents box when it would list one entry', () => {
  render(<ArticleContents blocks={[blocks[0]]} />);
  expect(
    screen.queryByRole('navigation', { name: 'On this page' }),
  ).not.toBeInTheDocument();
});

it('lists value lines under their heading behind a disclosure that starts closed', () => {
  const withValue: Block[] = [
    blocks[0],
    {
      id: 'value',
      sourceIds: [],
      kind: 'paragraph',
      content: [{ text: '1% Speed = 0.5%' }],
    },
    blocks[2],
  ];
  render(<ArticleContents blocks={withValue} />);
  const nav = screen.getByRole('navigation', { name: 'On this page' });
  expect(nav.querySelector('details')).not.toHaveAttribute('open');
  expect(within(nav).getByText('On this page · 3')).toBeInTheDocument();
  expect(
    within(nav).queryByRole('link', { name: '1% Speed' }),
  ).not.toBeInTheDocument();
  openContents();
  expect(
    within(nav).getByRole('link', { name: '1% Speed' }).closest('ul')
      ?.parentElement,
  ).toHaveTextContent('Overview');
});

it('keeps the list outside the disclosure so wide screens show it without JavaScript', () => {
  render(<ArticleContents blocks={blocks} />);
  const nav = screen.getByRole('navigation', { name: 'On this page' });
  const list = nav.querySelector<HTMLElement>('[data-contents-list]');
  expect(list).not.toBeNull();
  expect(nav.querySelector('details')).not.toContainElement(list);
});
