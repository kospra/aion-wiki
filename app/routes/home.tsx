import { WikiDirectory } from '../components/wiki-directory';
import { useLocation } from 'react-router';
import { pageMeta, websiteJsonLd } from '../seo';

const description =
  'A simple Aion 2 wiki and guide to gear, enhancement, Arcana, Daevanion boards, Genus, wings and damage formulas, based on Kanon’s guide.';

export function meta() {
  return pageMeta({
    path: '/',
    title: 'Aion 2 Wiki – Gear, Enhancement & Combat Guide',
    description,
    jsonLd: [websiteJsonLd(description)],
  });
}

export default function Home(): React.JSX.Element {
  const location = useLocation();
  return <WikiDirectory key={location.key} discover />;
}
