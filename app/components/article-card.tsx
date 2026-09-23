import { Link } from 'react-router';
import { categories, type Article } from '../content/wiki';

export function ArticleCard({
  article,
}: {
  article: Article;
}): React.JSX.Element {
  const category = categories.find(({ slug }) => slug === article.category);

  return (
    <article className="article-card">
      <Link className="article-card__link" to={`/articles/${article.slug}`}>
        <span className="article-card__category">{category?.title}</span>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
        <span className="sample-badge">Sample content</span>
      </Link>
    </article>
  );
}
