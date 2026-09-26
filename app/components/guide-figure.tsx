import {
  Badge,
  Box,
  Flex,
  Image,
  Link,
  List,
  Text,
  chakra,
} from '@chakra-ui/react';
import { normalizeSourceUrl } from '../content/reader';
import { isSmallFigure } from '../content/rules';
import type { Figure } from '../content/types';
import { ImageViewer } from './image-viewer';

/** Color square matching a marker drawn on a screenshot. */
export function AnnotationSwatch({
  color,
}: {
  color: string;
}): React.JSX.Element {
  return (
    <Box
      as="span"
      data-guide-color-swatch=""
      aria-hidden="true"
      bg={`wiki.annotation.${color}`}
      w="3"
      h="3"
      flexShrink="0"
      borderRadius="wiki.swatch"
    />
  );
}

/** Number badge and color square matching a marker drawn on a screenshot. */
export function AnnotationMarker({
  label,
  color,
}: {
  label: string;
  color: string;
}): React.JSX.Element {
  return (
    <Flex as="span" align="center" gap="3" flexShrink="0">
      <Badge
        size="md"
        variant="subtle"
        bg="wiki.raised"
        color="wiki.ink"
        whiteSpace="normal"
      >
        {label}
      </Badge>
      <AnnotationSwatch color={color} />
    </Flex>
  );
}

export function GuideFigure({ figure }: { figure: Figure }): React.JSX.Element {
  const annotations = figure.annotations ?? [];
  const small = isSmallFigure(figure);
  const smallSrc = small ? normalizeSourceUrl(figure.src) : null;
  return (
    <chakra.figure
      id={figure.id}
      data-guide-figure=""
      my={small ? '2' : { base: '6', md: '8' }}
      maxW="100%"
      minW="0"
    >
      {!small ? (
        <ImageViewer figure={figure} />
      ) : smallSrc ? (
        <Image
          data-guide-primary-image=""
          src={smallSrc}
          alt={figure.alt}
          htmlWidth={figure.width}
          htmlHeight={figure.height}
          loading="lazy"
          display="block"
          borderRadius="wiki.inset"
        />
      ) : (
        <Text>Image unavailable: {figure.alt}</Text>
      )}
      {annotations.length > 0 && (
        <chakra.figcaption mt="3">
          <List.Root
            data-guide-legend=""
            aria-label="Screenshot markers"
            listStyleType="none"
            borderTopWidth="1px"
            borderColor="wiki.border"
          >
            {annotations.map((annotation) => (
              <List.Item
                key={annotation.label}
                py="3"
                borderBottomWidth="1px"
                borderColor="wiki.border"
              >
                <Flex align="center" gap="3" minW="0">
                  <AnnotationMarker
                    label={annotation.label}
                    color={annotation.color}
                  />
                  <Link
                    href={`#${annotation.target}`}
                    textStyle="wiki.annotationTitle"
                    color="wiki.ink"
                    _hover={{ color: 'wiki.accentHover' }}
                    minW="0"
                    overflowWrap="anywhere"
                  >
                    {annotation.title}
                  </Link>
                </Flex>
              </List.Item>
            ))}
          </List.Root>
        </chakra.figcaption>
      )}
    </chakra.figure>
  );
}
