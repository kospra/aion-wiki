import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('categories/:slug', 'routes/category.tsx'),
  route('articles/:slug', 'routes/article.tsx'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
