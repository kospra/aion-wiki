import { Link } from 'react-router';
import { categories } from '../content/wiki';
import type { CatalogueEntry } from '../content/types';

export function ArticleCard({
  article,
}: {
  article: CatalogueEntry;
}): React.JSX.Element {
  const category = categories.find(({ slug }) => slug === article.category);
  return (
    <article className="article-card">
      <Link className="article-card__link" to={`/articles/${article.slug}`}>
        <span className="article-card__category">{category?.title}</span>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
        <span className="article-card__status">
          {article.status === 'source-pending'
            ? 'Source pending'
            : 'From Kanon’s guide'}
        </span>
        <span className="article-card__arrow" aria-hidden="true">
          ↗
        </span>
      </Link>
    </article>
  );
}
