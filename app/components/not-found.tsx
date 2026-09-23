import { Link } from 'react-router';

export function NotFound(): React.JSX.Element {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <span className="not-found__symbol" aria-hidden="true">
        ✧
      </span>
      <p className="eyebrow">The trail ends here</p>
      <h1 id="not-found-title">Page not found</h1>
      <p>
        We could not find that page in the archive. Check the address or return
        to the homepage.
      </p>
      <Link className="button-link" to="/">
        Return to the homepage
      </Link>
    </section>
  );
}
