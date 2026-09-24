import { Link } from 'react-router';
import { WikiDirectory } from '../components/wiki-directory';
import { articles, categories } from '../content/wiki';

export function meta() {
  return [
    { title: 'Aion 2 Wiki | Kanon guide reference' },
    {
      name: 'description',
      content:
        'Browse a sourced Aion 2 guide with 12 chapters, 43 articles, figures, and source context.',
    },
  ];
}

export default function Home(): React.JSX.Element {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__ornament" aria-hidden="true">
          <div className="hero__orbit">
            <span>✦</span>
          </div>
          <span className="hero__coordinate">A GUIDE TO THE DETAILS</span>
        </div>
        <div className="hero__content">
          <p className="eyebrow">Kanon’s guide · Source-aware reference</p>
          <h1 id="home-title">
            Aion 2 <span>Wiki</span>
          </h1>
          <p className="hero__lead">
            Explore the equipment, skills, enhancement systems, stats, and class
            notes in a captured community guide.
          </p>
          <a className="button-link" href="#directory-title">
            Explore the guide <span aria-hidden="true">↗</span>
          </a>
          <p className="hero__caption">
            {categories.length} chapters · {articles.length} articles · Original
            figures
          </p>
        </div>
      </section>
      <section className="intro-panel" aria-labelledby="intro-title">
        <div>
          <p className="eyebrow">About this reference</p>
          <h2 id="intro-title">A captured guide with context</h2>
          <p>
            Article text and images come from Kanon’s guide. Source
            qualifications and regional or date limits appear alongside the
            claims they qualify.{' '}
            <Link to="/source">About the source and author</Link>
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
          {categories.map((category, index) => (
            <Link
              className="category-overview__link"
              to={`/categories/${category.slug}`}
              key={category.slug}
            >
              <div className="category-overview__top" aria-hidden="true">
                <span className="category-symbol">✧</span>
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <span className="category-overview__status">
                {category.slug === 'class-passives'
                  ? 'Source pending'
                  : 'Guide chapter'}
              </span>
              <span className="category-overview__arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>
      <WikiDirectory />
    </div>
  );
}
