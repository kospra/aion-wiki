import type { Config } from '@react-router/dev/config';
import { staticPaths } from './app/content/wiki';

export default { ssr: false, prerender: staticPaths } satisfies Config;
