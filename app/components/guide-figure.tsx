import {
  Box,
  DataList,
  Flex,
  Image,
  Link,
  List,
  Strong,
  Text,
  chakra,
} from '@chakra-ui/react';
import { normalizeSourceUrl } from '../content/reader';
import type { Figure } from '../content/types';
import { ImageViewer } from './image-viewer';

type Props = {
  figure: Figure;
  sourceLinks: Record<string, string>;
};

export function GuideFigure({ figure, sourceLinks }: Props): React.JSX.Element {
  const src = normalizeSourceUrl(figure.src);

  return (
    <chakra.figure
      id={figure.id}
      data-guide-figure=""
      my="6"
      maxW="100%"
      minW="0"
    >
      {src ? (
        <Image
          src={src}
          alt={figure.alt}
          htmlWidth={figure.width}
          htmlHeight={figure.height}
          loading="lazy"
          maxW="100%"
          height="auto"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        />
      ) : (
        <Text>Image unavailable: {figure.alt}</Text>
      )}
      <chakra.figcaption mt="2" color="gray.600" fontSize="sm">
        {figure.caption}
      </chakra.figcaption>
      {src && (
        <Flex align="center" gap="4" mt="3" wrap="wrap">
          <ImageViewer figure={figure} />
          <Link
            href={src}
            aria-label={`Open original image: ${figure.alt}`}
            colorPalette="blue"
          >
            Open original image
          </Link>
        </Flex>
      )}
      {figure.mappings.length > 0 && (
        <DataList.Root
          data-guide-legend=""
          aria-label="Image annotations"
          mt="5"
          gap="3"
        >
          {figure.mappings.map((mapping, index) => {
            const destinations = mapping.textSourceIds.flatMap((sourceId) => {
              const value = Object.hasOwn(sourceLinks, sourceId)
                ? sourceLinks[sourceId]
                : undefined;
              const href =
                typeof value === 'string' ? normalizeSourceUrl(value) : null;
              return href ? [{ sourceId, href }] : [];
            });
            return (
              <DataList.Item key={index}>
                <DataList.ItemLabel fontWeight="semibold">
                  {mapping.label}
                  {mapping.color && ` (${mapping.color})`}
                  {mapping.visualValue && `: ${mapping.visualValue}`}
                </DataList.ItemLabel>
                <DataList.ItemValue display="block">
                  {mapping.meaning}
                  {mapping.confidence !== 'confirmed' && (
                    <Text as="span" color="gray.600">
                      {' '}
                      ({mapping.confidence})
                    </Text>
                  )}
                  {destinations.length > 0 && (
                    <Box as="span" data-guide-references="" ms="2">
                      {destinations.map(({ sourceId, href }, linkIndex) => (
                        <Link
                          key={`${sourceId}-${linkIndex}`}
                          href={href}
                          aria-label={`Source explanation: ${mapping.label} ${mapping.meaning}`}
                          colorPalette="blue"
                          me="2"
                        >
                          {linkIndex === 0
                            ? 'Source explanation'
                            : `Source explanation ${linkIndex + 1}`}
                        </Link>
                      ))}
                    </Box>
                  )}
                </DataList.ItemValue>
              </DataList.Item>
            );
          })}
        </DataList.Root>
      )}
      {figure.screenshotOnly.length > 0 && (
        <Box
          as="section"
          data-guide-screenshot-facts=""
          aria-label="Facts visible only in the image"
          mt="5"
          p="4"
          bg="gray.50"
          borderRadius="md"
        >
          <Strong>Visible in image</Strong>
          <List.Root as="ul" listStyleType="disc" ps="6" mt="2">
            {figure.screenshotOnly.map((fact, index) => (
              <List.Item key={index}>{fact}</List.Item>
            ))}
          </List.Root>
        </Box>
      )}
      {figure.uncertainties.length > 0 && (
        <Box
          as="aside"
          data-guide-uncertainties=""
          mt="4"
          p="4"
          bg="gray.50"
          borderStartWidth="3px"
          borderColor="gray.300"
        >
          <Strong>Image uncertainty</Strong>
          <List.Root as="ul" listStyleType="disc" ps="6" mt="2">
            {figure.uncertainties.map((uncertainty, index) => (
              <List.Item key={index}>{uncertainty}</List.Item>
            ))}
          </List.Root>
        </Box>
      )}
    </chakra.figure>
  );
}
