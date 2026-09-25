import { WikiDirectory } from '../components/wiki-directory';
import { useLocation } from 'react-router';

export function meta() {
  return [
    { title: 'Aion 2 Wiki | Kanon guide reference' },
    {
      name: 'description',
      content:
        'Browse a sourced Aion 2 guide with 12 chapters, 43 articles, figures, and source context.',
    },
  ];
}

export default function Home(): React.JSX.Element {
  const location = useLocation();
  return <WikiDirectory key={location.key} discover />;
}
