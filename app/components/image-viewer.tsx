import {
  Box,
  CloseButton,
  Dialog,
  Image,
  Portal,
  Text,
  chakra,
} from '@chakra-ui/react';
import { normalizeSourceUrl } from '../content/reader';
import type { Figure } from '../content/types';

export function ImageViewer({ figure }: { figure: Figure }): React.JSX.Element {
  const src = normalizeSourceUrl(figure.src);
  if (!src) return <Text>Image unavailable: {figure.alt}</Text>;

  return (
    <Dialog.Root
      size="xl"
      placement="center"
      scrollBehavior="outside"
      lazyMount
    >
      <Dialog.Trigger asChild>
        <chakra.button
          type="button"
          aria-label={`View full-size image: ${figure.alt}`}
          display="block"
          maxW="100%"
          width="fit-content"
          p="2"
          bg="wiki.surface"
          borderWidth="1px"
          borderColor="wiki.border"
          borderRadius="wiki.panel"
          cursor="zoom-in"
          _hover={{ borderColor: 'wiki.accent', bg: 'wiki.accentSoft' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'wiki.accent',
            outlineOffset: '3px',
          }}
        >
          <Image
            data-guide-primary-image=""
            src={src}
            alt={figure.alt}
            htmlWidth={figure.width}
            htmlHeight={figure.height}
            loading="lazy"
            display="block"
            maxW="100%"
            height="auto"
            borderRadius="wiki.inset"
          />
        </chakra.button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop _motionReduce={{ animation: 'none' }} />
        <Dialog.Positioner>
          <Dialog.Content
            width="fit-content"
            maxW="min(94vw, 72rem)"
            maxH="94dvh"
            bg="wiki.surface"
            color="wiki.ink"
            borderRadius="wiki.panel"
            overflow="hidden"
            _motionReduce={{ animation: 'none' }}
          >
            <Dialog.Title srOnly>{figure.alt}</Dialog.Title>
            <Box display="flex" justifyContent="flex-end" p="2" flexShrink="0">
              <Dialog.CloseTrigger asChild position="static">
                <CloseButton
                  aria-label="Close image"
                  size="sm"
                  variant="ghost"
                />
              </Dialog.CloseTrigger>
            </Box>
            <Dialog.Body
              minH="0"
              overflow="hidden"
              p={{ base: '2', md: '3' }}
              pt="0"
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
                borderRadius="wiki.inset"
              >
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
              </Box>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
