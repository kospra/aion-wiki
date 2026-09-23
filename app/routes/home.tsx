export function meta() {
  return [
    { title: 'Aion 2 Wiki | A field guide in progress' },
    {
      name: 'description',
      content:
        'A community-minded reference space for Aion 2, currently taking shape.',
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
            This foundation will hold browsable topics, articles, and search.
            Sample content is coming soon and will be clearly labeled when it
            arrives.
          </p>
        </div>
        <div className="intro-panel__seal" aria-hidden="true">
          ✧
        </div>
      </section>
    </div>
  );
}
