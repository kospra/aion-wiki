import { NotFound } from '../components/not-found';
import { notFoundMeta } from '../seo';

export function meta() {
  return notFoundMeta();
}

export default function NotFoundRoute(): React.JSX.Element {
  return <NotFound />;
}
