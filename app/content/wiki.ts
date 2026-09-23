export type Category = {
  slug: string;
  title: string;
  description: string;
};

export type Article = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  sections: { heading: string; body: string }[];
  status: 'sample';
};

export const categories: Category[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: 'Start here to learn how this growing reference is organized.',
  },
  {
    slug: 'classes',
    title: 'Classes',
    description: 'A home for future class introductions and comparisons.',
  },
  {
    slug: 'exploration',
    title: 'Exploration',
    description: 'A place for future location and travel guides.',
  },
];

export const articles: Article[] = [
  {
    slug: 'welcome-to-the-wiki',
    title: 'Welcome to the wiki',
    category: 'getting-started',
    summary: 'An introduction to this reference and what it aims to become.',
    status: 'sample',
    sections: [
      {
        heading: 'About this wiki',
        body: 'This sample page introduces the article format. Verified Aion 2 information will be added with sources as it becomes available.',
      },
    ],
  },
  {
    slug: 'using-search',
    title: 'Using search',
    category: 'getting-started',
    summary: 'Find a topic by its title or short description.',
    status: 'sample',
    sections: [
      {
        heading: 'Find a page',
        body: 'Use the article search on the homepage to narrow the directory. You can also choose a category to focus the results.',
      },
    ],
  },
  {
    slug: 'choosing-your-class',
    title: 'Choosing your class',
    category: 'classes',
    summary:
      'A place to compare playstyles as verified class guides are added.',
    status: 'sample',
    sections: [
      {
        heading: 'About this guide',
        body: 'This sample demonstrates the article layout. Verified Aion 2 class details will be added with sources.',
      },
    ],
  },
  {
    slug: 'class-guide-format',
    title: 'Class guide format',
    category: 'classes',
    summary: 'See how future class guides can organize confirmed details.',
    status: 'sample',
    sections: [
      {
        heading: 'About this format',
        body: 'This sample reserves space for sourced class information and practical notes once those details can be verified.',
      },
    ],
  },
  {
    slug: 'exploration-guide-format',
    title: 'Exploration guide format',
    category: 'exploration',
    summary: 'A template for future guides to places and journeys.',
    status: 'sample',
    sections: [
      {
        heading: 'About this format',
        body: 'This sample shows where sourced exploration notes can be presented later. It does not describe any confirmed locations.',
      },
    ],
  },
  {
    slug: 'reading-region-guides',
    title: 'Reading future region guides',
    category: 'exploration',
    summary: 'How to approach region guides as they are published.',
    status: 'sample',
    sections: [
      {
        heading: 'What to expect',
        body: 'Future guides can group verified points of interest, access notes, and sources in one place. This page is only a layout example.',
      },
    ],
  },
];

export const staticPaths = [
  '/',
  ...categories.map(({ slug }) => `/categories/${slug}`),
  ...articles.map(({ slug }) => `/articles/${slug}`),
];
