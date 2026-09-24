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
          <div className="hero__orbit">
            <span>✦</span>
          </div>
          <span className="hero__coordinate">A WORLD OF DISCOVERY</span>
        </div>
        <div className="hero__content">
          <p className="eyebrow">An open reference · A new beginning</p>
          <h1 id="home-title">
            Aion 2 <span>Wiki</span>
          </h1>
          <p className="hero__lead">
            A place to explore, organize, and revisit what we learn about Aion
            2.
          </p>
          <a className="button-link" href="#directory-title">
            Explore the archive <span aria-hidden="true">↗</span>
          </a>
          <p className="hero__caption">For curious travelers. Built to grow.</p>
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
          {categories.map((category, index) => (
            <Link
              className="category-overview__link"
              to={`/categories/${category.slug}`}
              key={category.slug}
            >
              <div className="category-overview__top" aria-hidden="true">
                <span
                  className={`category-symbol category-symbol--${category.slug}`}
                >
                  ✧
                </span>
                <span>0{index + 1}</span>
              </div>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <span className="sample-badge">Sample content</span>
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
