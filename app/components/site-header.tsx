import { useState } from 'react';
import { Link } from 'react-router';
import { categories } from '../content/wiki';

export function SiteHeader(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="site-header__inner">
        <nav aria-label="Main navigation">
          <Link className="site-brand" to="/">
            <span className="site-brand__mark" aria-hidden="true">
              ✦
            </span>
            <span>Aion 2 Wiki</span>
          </Link>
          <button
            className="site-header__toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls="chapter-navigation"
            onClick={() => setExpanded((value) => !value)}
          >
            Chapters <span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
          <div
            id="chapter-navigation"
            className={`site-header__links${expanded ? ' site-header__links--open' : ''}`}
            role="group"
            aria-label="Browse chapters"
          >
            {categories.map(({ slug, title }, index) => (
              <Link
                key={slug}
                to={`/categories/${slug}`}
                onClick={() => setExpanded(false)}
              >
                <span className="site-header__number">
                  {String(index + 1).padStart(2, '0')}
                </span>{' '}
                {title}
              </Link>
            ))}
            <Link
              className="site-header__source"
              to="/source"
              onClick={() => setExpanded(false)}
            >
              About the source
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
