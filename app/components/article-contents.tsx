import { inlineText, walkBlocks } from '../content/reader';
import type { Block } from '../content/types';

type HeadingItem = {
  id: string;
  title: string;
  level: number;
  children: HeadingItem[];
};

export function ArticleContents({
  blocks,
}: {
  blocks: Block[];
}): React.JSX.Element | null {
  const headings = walkBlocks(blocks)
    .filter(
      (block): block is Extract<Block, { kind: 'heading' }> =>
        block.kind === 'heading',
    )
    .map((block): HeadingItem => ({
      id: block.id,
      title: inlineText(block.content),
      level: block.level,
      children: [],
    }));
  if (headings.length === 0) return null;

  const roots: HeadingItem[] = [];
  const ancestors: HeadingItem[] = [];
  for (const heading of headings) {
    while (
      ancestors.length &&
      ancestors[ancestors.length - 1].level >= heading.level
    )
      ancestors.pop();
    (ancestors.at(-1)?.children ?? roots).push(heading);
    ancestors.push(heading);
  }

  function renderItems(items: HeadingItem[]): React.JSX.Element {
    return (
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.title}</a>
            {item.children.length > 0 && renderItems(item.children)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <nav className="article-contents" aria-label="On this page">
      <p className="article-contents__title">On this page</p>
      {renderItems(roots)}
    </nav>
  );
}
