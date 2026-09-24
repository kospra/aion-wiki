import type { ReactElement } from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { WikiProvider } from '../app/components/ui/provider';

export * from '@testing-library/react';

export function render(ui: ReactElement, options?: RenderOptions) {
  return testingLibraryRender(ui, {
    ...options,
    wrapper: ({ children }) => <WikiProvider>{children}</WikiProvider>,
  });
}
