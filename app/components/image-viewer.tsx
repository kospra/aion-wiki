import {
  Box,
  Button,
  Dialog,
  Flex,
  Image,
  Link,
  Portal,
  Text,
} from '@chakra-ui/react';
import { normalizeSourceUrl } from '../content/reader';
import type { Figure } from '../content/types';

export function ImageViewer({ figure }: { figure: Figure }): React.JSX.Element {
  const src = normalizeSourceUrl(figure.src);

  return (
    <Dialog.Root
      size="xl"
      placement="center"
      scrollBehavior="outside"
      lazyMount
    >
      <Dialog.Trigger asChild>
        <Button size="sm" variant="outline">
          View full-size image
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="min(94vw, 72rem)"
            maxH="94dvh"
            overflow="hidden"
          >
            <Dialog.Header>
              <Flex align="center" gap="4" justify="space-between" wrap="wrap">
                <Dialog.Title fontSize="lg">
                  Full-size: {figure.caption}
                </Dialog.Title>
                <Flex align="center" gap="3">
                  {src && (
                    <Link
                      href={src}
                      aria-label={`Open original image: ${figure.alt}`}
                      colorPalette="blue"
                    >
                      Open original image
                    </Link>
                  )}
                  <Dialog.CloseTrigger asChild>
                    <Button size="sm" variant="outline">
                      Close image
                    </Button>
                  </Dialog.CloseTrigger>
                </Flex>
              </Flex>
            </Dialog.Header>
            <Dialog.Body minH="0" overflow="hidden" pb="4">
              <Box
                role="region"
                aria-label="Scroll full-size image"
                tabIndex={0}
                data-guide-image-scroll=""
                overflow="auto"
                maxH="calc(94dvh - 7rem)"
                maxW="100%"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="sm"
              >
                {src ? (
                  <Image
                    src={src}
                    alt={figure.alt}
                    htmlWidth={figure.width}
                    htmlHeight={figure.height}
                    loading="lazy"
                    width={`${figure.width}px`}
                    height={`${figure.height}px`}
                    maxW="none"
                    maxH="none"
                    display="block"
                  />
                ) : (
                  <Text>Image unavailable: {figure.alt}</Text>
                )}
              </Box>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
