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
        <Dialog.Backdrop _motionReduce={{ animation: 'none' }} />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="min(94vw, 72rem)"
            maxH="94dvh"
            bg="wiki.surface"
            color="wiki.ink"
            borderRadius="lg"
            overflow="hidden"
            _motionReduce={{ animation: 'none' }}
          >
            <Dialog.Header flexShrink="0">
              <Flex align="center" gap="4" justify="space-between" wrap="wrap">
                <Dialog.Title fontSize="lg">
                  Full-size: {figure.caption}
                </Dialog.Title>
                <Flex align="center" gap="3">
                  {src && (
                    <Link
                      href={src}
                      aria-label={`Open original image: ${figure.alt}`}
                      color="wiki.accent"
                    >
                      Open original image
                    </Link>
                  )}
                  <Dialog.CloseTrigger asChild position="static">
                    <Button size="sm" variant="outline">
                      Close image
                    </Button>
                  </Dialog.CloseTrigger>
                </Flex>
              </Flex>
            </Dialog.Header>
            <Dialog.Body
              minH="0"
              overflow="hidden"
              pb="4"
              display="flex"
              flexDirection="column"
              flex="1"
            >
              <Box
                role="region"
                aria-label="Scroll full-size image"
                tabIndex={0}
                data-guide-image-scroll=""
                overflow="auto"
                minH="0"
                flex="1"
                maxW="100%"
                borderWidth="1px"
                borderColor="wiki.border"
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
