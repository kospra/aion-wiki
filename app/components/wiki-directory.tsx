import { useState } from 'react';
import { ArticleCard } from './article-card';
import { articles, categories } from '../content/wiki';

export function WikiDirectory({
  initialCategory = 'all',
}: {
  initialCategory?: string;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleArticles = articles.filter(
    (article) =>
      (category === 'all' || article.category === category) &&
      `${article.title} ${article.summary}`
        .toLowerCase()
        .includes(normalizedQuery),
  );

  return (
    <section className="wiki-directory" aria-labelledby="directory-title">
      <div className="wiki-directory__heading">
        <div>
          <p className="eyebrow">Browse the archive</p>
          <h2 id="directory-title">Article directory</h2>
        </div>
        <p className="wiki-directory__note">
          All entries shown here are sample content.
        </p>
      </div>
      <div className="wiki-directory__controls">
        <label htmlFor="article-search">Search articles</label>
        <input
          id="article-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles and summaries"
        />
        <div
          className="wiki-directory__filters"
          role="group"
          aria-label="Filter by category"
        >
          <button
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            All topics
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item.slug}
              aria-pressed={category === item.slug}
              onClick={() => setCategory(item.slug)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
      <p className="wiki-directory__count" role="status" aria-live="polite">
        {visibleArticles.length}{' '}
        {visibleArticles.length === 1 ? 'article' : 'articles'} found
      </p>
      {visibleArticles.length > 0 ? (
        <div className="article-grid">
          {visibleArticles.map((article) => (
            <ArticleCard article={article} key={article.slug} />
          ))}
        </div>
      ) : (
        <div className="wiki-directory__empty">
          <h3>No articles found</h3>
          <p>Try another search or browse all topics.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
}
