import { GuidePageView } from './article';
import { getPage } from '../content/repository';

export function meta() {
  const page = getPage('about-the-source-and-author');
  return [
    { title: 'About the source and author | Aion 2 Wiki' },
    {
      name: 'description',
      content: page?.summary ?? 'Source attribution and context.',
    },
  ];
}

export default function SourceRoute(): React.JSX.Element {
  const page = getPage('about-the-source-and-author');
  if (!page) throw new Error('Source overview is missing');
  return <GuidePageView page={page} />;
}
