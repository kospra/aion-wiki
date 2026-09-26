import { useLocation } from 'react-router';

/**
 * The current path without a trailing slash. Prerendering sees
 * "/articles/x/" while browsers may request "/articles/x", and both must
 * render the same navigation for hydration to match.
 */
export function usePathname(): string {
  return useLocation().pathname.replace(/(.)\/+$/, '$1');
}
