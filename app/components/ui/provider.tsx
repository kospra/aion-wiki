import { ChakraProvider } from '@chakra-ui/react';
import { wikiSystem } from './theme';

export function WikiProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <ChakraProvider value={wikiSystem}>{children}</ChakraProvider>;
}
