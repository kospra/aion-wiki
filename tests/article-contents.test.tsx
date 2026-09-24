import { fireEvent, waitFor } from '@testing-library/react';
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
