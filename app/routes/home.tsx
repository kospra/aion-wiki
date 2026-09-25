import { WikiDirectory } from '../components/wiki-directory';
import { useLocation } from 'react-router';

export function meta() {
  return [
    { title: 'Aion 2 Wiki | Kanon guide reference' },
    {
      name: 'description',
      content:
        'An Aion 2 progression reference based on Kanon’s guide: gear, enhancement, Arcana, Daevanion, Genus and damage formulas.',
    },
  ];
}

export default function Home(): React.JSX.Element {
  const location = useLocation();
  return <WikiDirectory key={location.key} discover />;
}
