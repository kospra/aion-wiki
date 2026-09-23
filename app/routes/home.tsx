import { Link } from 'react-router';
import { WikiDirectory } from '../components/wiki-directory';
import { categories } from '../content/wiki';

export function meta() {
  return [
    { title: 'Aion 2 Wiki | A field guide in progress' },
    {
      name: 'description',
      content:
        'Browse sample categories and articles in an Aion 2 reference taking shape.',
    },
  ];
}

export default function Home(): React.JSX.Element {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__ornament" aria-hidden="true">
          <span>✦</span>
        </div>
        <div className="hero__content">
          <p className="eyebrow">An open reference for curious travelers</p>
          <h1 id="home-title">Aion 2 Wiki</h1>
          <p className="hero__lead">
            A place to explore, organize, and revisit what we learn about Aion
            2.
          </p>
        </div>
      </section>

      <section className="intro-panel" aria-labelledby="intro-title">
        <div>
          <p className="eyebrow">The archive</p>
          <h2 id="intro-title">A guide with room to grow</h2>
          <p>
            Explore a small set of sample pages while the wiki takes shape.
            Every entry is labeled so it is clear where verified, sourced
            information will be added later.
          </p>
        </div>
        <div className="intro-panel__seal" aria-hidden="true">
          ✧
        </div>
      </section>

      <section className="category-overview" aria-labelledby="category-title">
        <p className="eyebrow">Find your path</p>
        <h2 id="category-title">Browse by category</h2>
        <div className="category-overview__grid">
          {categories.map((category) => (
            <Link
              className="category-overview__link"
              to={`/categories/${category.slug}`}
              key={category.slug}
            >
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <span className="sample-badge">Sample content</span>
            </Link>
          ))}
        </div>
      </section>

      <WikiDirectory />
    </div>
  );
}
