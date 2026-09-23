import { NotFound } from '../components/not-found';

export function meta() {
  return [{ title: 'Page not found | Aion 2 Wiki' }];
}

export default function NotFoundRoute(): React.JSX.Element {
  return <NotFound />;
}
