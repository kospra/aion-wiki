import { Link, useParams } from 'react-router';
import { ArticleContents } from '../components/article-contents';
import { NotFound } from '../components/not-found';
import { RichContent } from '../components/rich-content';
import { articles, categories } from '../content/wiki';
import {
  figureById,
  getPage,
  pagePath,
  sourceLinkNotes,
  sourceLinks,
} from '../content/repository';
import { blockInlineSegments, walkBlocks } from '../content/reader';
import type { GuidePage } from '../content/types';

export function meta({ params }: { params: { slug?: string } }) {
  const article = articles.find(({ slug }) => slug === params.slug);
  return article
    ? [
        { title: `${article.title} | Aion 2 Wiki` },
        { name: 'description', content: article.summary },
      ]
    : [{ title: 'Page not found | Aion 2 Wiki' }];
}

const statusText = {
  'source-backed': 'Source backed',
  'source-uncertain': 'Source context and uncertainty',
  'source-pending': 'Source pending',
};

export function GuidePageView({
  page,
}: {
  page: GuidePage;
}): React.JSX.Element {
  const category = categories.find((item) => item.slug === page.category);
  const index = articles.findIndex((item) => item.slug === page.slug);
  const previous = index > 0 ? articles[index - 1] : undefined;
  const next = index >= 0 ? articles[index + 1] : undefined;
  const ambiguousLinks = new Set(
    walkBlocks(page.blocks)
      .flatMap((block) => blockInlineSegments(block).flat())
      .map((part) => part.href)
      .filter((href): href is string => Boolean(href && sourceLinkNotes[href])),
  );

  return (
    <article className="content-page article-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        {category && (
          <>
            <Link to={`/categories/${category.slug}`}>{category.title}</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page">{page.title}</span>
      </nav>
      <header className="content-page__header">
        <p className="eyebrow">
          {category ? 'Guide article' : 'Source and author'}
        </p>
        <h1>{page.title}</h1>
        <p>{page.summary}</p>
        <div className="source-status" role="note">
          <strong>{statusText[page.status]}</strong>
          {page.status === 'source-pending' && (
            <p>
              The captured chapter says Coming soon; no guide details were
              supplied for it.
            </p>
          )}
          {page.qualifiers.map((qualifier) => (
            <p key={qualifier}>{qualifier}</p>
          ))}
        </div>
        <p className="source-credit">
          This guide preserves Kanon’s source statements and labels the source’s
          limits. <a href={page.sourceUrl}>Original source document</a>
          {' · '}
          <Link to="/source">About the source and author</Link>
        </p>
      </header>
      <ArticleContents blocks={page.blocks} />
      <RichContent
        blocks={page.blocks}
        figures={figureById}
        sourceLinks={sourceLinks}
      />
      {ambiguousLinks.size > 0 && (
        <aside className="source-link-notes" aria-label="Source link notes">
          <h2>Source link notes</h2>
          <p>
            Some original anchors could not be matched unambiguously to a
            captured block. Those links open the original document.
          </p>
          <ul>
            {[...ambiguousLinks].map((href) => (
              <li key={href}>
                <a href={sourceLinks[href]}>{href}</a>: {sourceLinkNotes[href]}
              </li>
            ))}
          </ul>
        </aside>
      )}
      {(previous || next) && (
        <nav className="article-pager" aria-label="Guide article navigation">
          {previous ? (
            <Link to={pagePath(previous.slug)} rel="prev">
              ← Previous: {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={pagePath(next.slug)} rel="next">
              Next: {next.title} →
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}

export default function ArticleRoute(): React.JSX.Element {
  const { slug } = useParams();
  const page = slug ? getPage(slug) : undefined;
  if (!page || page.category === null) return <NotFound />;
  return <GuidePageView page={page} />;
}
