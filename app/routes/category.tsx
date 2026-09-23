import { Link, useParams } from 'react-router';
import { NotFound } from '../components/not-found';
import { WikiDirectory } from '../components/wiki-directory';
import { categories } from '../content/wiki';

export function meta({ params }: { params: { slug?: string } }) {
  const category = categories.find(({ slug }) => slug === params.slug);
  return category
    ? [
        { title: `${category.title} | Aion 2 Wiki` },
        { name: 'description', content: category.description },
      ]
    : [{ title: 'Page not found | Aion 2 Wiki' }];
}

export default function CategoryRoute(): React.JSX.Element {
  const { slug } = useParams();
  const category = categories.find((item) => item.slug === slug);

  if (!category) return <NotFound />;

  return (
    <div className="content-page category-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{category.title}</span>
      </nav>
      <header className="content-page__header">
        <p className="eyebrow">Category</p>
        <h1>{category.title}</h1>
        <p>{category.description}</p>
      </header>
      <WikiDirectory key={category.slug} initialCategory={category.slug} />
    </div>
  );
}
