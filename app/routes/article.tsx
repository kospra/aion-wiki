import { Link, useParams } from 'react-router';
import { NotFound } from '../components/not-found';
import { articles, categories } from '../content/wiki';

export function meta({ params }: { params: { slug?: string } }) {
  const article = articles.find(({ slug }) => slug === params.slug);
  return article
    ? [
        { title: `${article.title} | Aion 2 Wiki` },
        { name: 'description', content: article.summary },
      ]
    : [{ title: 'Page not found | Aion 2 Wiki' }];
}

export default function ArticleRoute(): React.JSX.Element {
  const { slug } = useParams();
  const article = articles.find((item) => item.slug === slug);

  if (!article) return <NotFound />;

  const category = categories.find((item) => item.slug === article.category);

  return (
    <article className="content-page article-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true"> / </span>
        {category && (
          <>
            <Link to={`/categories/${category.slug}`}>{category.title}</Link>
            <span aria-hidden="true"> / </span>
          </>
        )}
        <span aria-current="page">{article.title}</span>
      </nav>
      <header className="content-page__header">
        <p className="eyebrow">Article</p>
        <h1>{article.title}</h1>
        <p>{article.summary}</p>
        <p className="sample-notice">
          <span className="sample-badge">Sample content</span> This page
          demonstrates the wiki format. Details will be verified and sourced
          before publication.
        </p>
      </header>
      <div className="article-page__sections">
        {article.sections.map((section) => (
          <section key={section.heading} aria-label={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
