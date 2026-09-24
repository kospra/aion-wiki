import type { ReactNode } from 'react';
import { normalizeSourceUrl } from '../content/reader';
import type { Block, Figure, Inline } from '../content/types';
import { GuideFigure } from './guide-figure';

type Props = {
  blocks: Block[];
  figures: Record<string, Figure>;
  sourceLinks: Record<string, string>;
};

function formattedPart(part: Inline, key: number): ReactNode {
  let content: ReactNode = part.text;
  if (part.strong) content = <strong>{content}</strong>;
  if (part.emphasis) content = <em>{content}</em>;
  if (part.underline) content = <u>{content}</u>;
  if (part.highlight) {
    const backgroundColor =
      /^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/i.test(part.highlight)
        ? part.highlight
        : undefined;
    content = (
      <mark style={backgroundColor ? { backgroundColor } : undefined}>
        {content}
      </mark>
    );
  }
  return (
    <span key={key}>
      {content}
      {part.breakAfter && <br />}
    </span>
  );
}

export function RichContent({
  blocks,
  figures,
  sourceLinks,
}: Props): React.JSX.Element {
  function renderInline(parts: Inline[]): ReactNode {
    const runs: ReactNode[] = [];
    for (let index = 0; index < parts.length;) {
      const part = parts[index];
      if (!part.href) {
        runs.push(formattedPart(part, index));
        index += 1;
        continue;
      }
      const start = index;
      while (index < parts.length && parts[index].href === part.href)
        index += 1;
      const linkedParts = parts.slice(start, index);
      const content = linkedParts.map((linked, offset) =>
        formattedPart(linked, start + offset),
      );
      const mappedHref = Object.hasOwn(sourceLinks, part.href)
        ? sourceLinks[part.href]
        : undefined;
      const href = normalizeSourceUrl(
        typeof mappedHref === 'string' ? mappedHref : part.href,
      );
      // Blank source spans often flank a labeled link to the same target.
      runs.push(
        href && linkedParts.some((linked) => linked.text.trim()) ? (
          <a key={start} href={href}>
            {content}
          </a>
        ) : (
          <span key={start}>{content}</span>
        ),
      );
    }
    return runs;
  }

  function renderBlock(block: Block): ReactNode {
    switch (block.kind) {
      case 'paragraph':
        return (
          <p id={block.id} key={block.id}>
            {renderInline(block.content)}
          </p>
        );
      case 'heading': {
        const Heading = `h${block.level}` as 'h2' | 'h3' | 'h4';
        return (
          <Heading id={block.id} key={block.id}>
            {renderInline(block.content)}
          </Heading>
        );
      }
      case 'list': {
        const items = block.items.map((item, index) => (
          <li key={`${block.id}-item-${index}`}>{item.map(renderBlock)}</li>
        ));
        return block.ordered ? (
          <ol
            id={block.id}
            key={block.id}
            start={block.start}
            aria-label="Numbered guide list"
          >
            {items}
          </ol>
        ) : (
          <ul id={block.id} key={block.id}>
            {items}
          </ul>
        );
      }
      case 'table':
        return (
          <div
            id={block.id}
            key={block.id}
            className="guide-table-scroll"
            role="region"
            aria-label={block.caption}
            tabIndex={0}
          >
            <table>
              <caption>{block.caption}</caption>
              <thead>
                <tr>
                  {block.columns.map((column, index) => (
                    <th key={index} scope="col">
                      {renderInline(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell.map(renderBlock)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'formula':
        return (
          <section id={block.id} key={block.id} className="guide-formula">
            <pre>{block.expression}</pre>
            <p>{renderInline(block.explanation)}</p>
          </section>
        );
      case 'note':
        return (
          <aside
            id={block.id}
            key={block.id}
            className={`guide-note guide-note--${block.tone}`}
          >
            <strong>{block.label}</strong>
            <p>{renderInline(block.content)}</p>
          </aside>
        );
      case 'figure': {
        const figure = figures[block.figureId];
        if (!figure)
          return (
            <p id={block.id} key={block.id}>
              Image unavailable: {block.figureId}
            </p>
          );
        return (
          <div id={block.id} key={block.id} className="guide-figure-placement">
            <GuideFigure figure={figure} sourceLinks={sourceLinks} />
          </div>
        );
      }
      case 'group':
        return (
          <div
            id={block.id}
            key={block.id}
            role="group"
            aria-label={block.label}
            className="guide-group"
          >
            <p className="guide-group__label">{block.label}</p>
            {block.blocks.map(renderBlock)}
          </div>
        );
    }
  }

  return <div className="guide-content">{blocks.map(renderBlock)}</div>;
}
