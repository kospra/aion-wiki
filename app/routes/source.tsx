import { GuidePageView } from './article';
import { getPage } from '../content/repository';
import { breadcrumbJsonLd, pageMeta } from '../seo';

export function meta() {
  const page = getPage('about-the-source-and-author');
  return pageMeta({
    path: '/source',
    title: 'About the source and author | Aion 2 Wiki',
    description: page?.summary ?? 'Source attribution and context.',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Discover', path: '/' },
        { name: page?.title ?? 'About the source and author', path: '/source' },
      ]),
    ],
  });
}

export default function SourceRoute(): React.JSX.Element {
  const page = getPage('about-the-source-and-author');
  if (!page) throw new Error('Source overview is missing');
  return <GuidePageView page={page} />;
}
