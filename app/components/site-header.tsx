import { Link } from 'react-router';

export function SiteHeader(): React.JSX.Element {
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
        </nav>
        <span className="site-header__eyebrow">A field guide in progress</span>
      </div>
    </header>
  );
}
