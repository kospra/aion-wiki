import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

export function WikiProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>;
}
