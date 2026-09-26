import { WikiDirectory } from '../components/wiki-directory';
import { useLocation } from 'react-router';
import { pageMeta, websiteJsonLd } from '../seo';

const description =
  'An Aion 2 progression reference based on Kanon’s guide: gear, enhancement, Arcana, Daevanion, Genus and damage formulas.';

export function meta() {
  return pageMeta({
    path: '/',
    title: 'Aion 2 Wiki | Kanon guide reference',
    description,
    jsonLd: [websiteJsonLd(description)],
  });
}

export default function Home(): React.JSX.Element {
  const location = useLocation();
  return <WikiDirectory key={location.key} discover />;
}
