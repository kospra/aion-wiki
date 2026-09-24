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
      my={{ base: '8', md: '10' }}
      maxW="100%"
      minW="0"
    >
      <Box
        bg="wiki.surface"
        borderWidth="1px"
        borderColor="wiki.border"
        borderRadius="md"
        p={{ base: '3', md: '4' }}
      >
        {src ? (
          <Image
            data-guide-primary-image=""
            src={src}
            alt={figure.alt}
            htmlWidth={figure.width}
            htmlHeight={figure.height}
            loading="lazy"
            maxW="100%"
            height="auto"
            borderWidth="1px"
            borderColor="wiki.border"
            borderRadius="sm"
          />
        ) : (
          <Text>Image unavailable: {figure.alt}</Text>
        )}
      </Box>
      <chakra.figcaption>
        <Text mt="3" color="wiki.muted" textStyle="wiki.caption">
          {figure.caption}
        </Text>
        {src && (
          <Flex align="center" gap="4" mt="3" wrap="wrap">
            <ImageViewer figure={figure} />
            <Link
              href={src}
              aria-label={`Open original image: ${figure.alt}`}
              color="wiki.accent"
              _hover={{ color: 'wiki.accentHover' }}
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
            gap="0"
            borderTopWidth="1px"
            borderColor="wiki.border"
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
                <DataList.Item
                  key={index}
                  display="grid"
                  gridTemplateColumns={{
                    base: 'minmax(0, 1fr)',
                    md:
                      `${mapping.label} ${mapping.visualValue ?? ''}`.length >
                      90
                        ? 'minmax(0, 1fr)'
                        : 'minmax(7rem, 20%) minmax(0, 1fr)',
                  }}
                  columnGap="4"
                  rowGap="1"
                  py="3"
                  borderBottomWidth="1px"
                  borderColor="wiki.border"
                >
                  <DataList.ItemLabel
                    fontWeight="semibold"
                    color="wiki.ink"
                    textStyle="wiki.label"
                    display="block"
                    overflowWrap="anywhere"
                    minW="0"
                  >
                    {mapping.label}
                    {mapping.color && ` (${mapping.color})`}
                    {mapping.visualValue && (
                      <Text as="span" fontWeight="normal">
                        : {mapping.visualValue}
                      </Text>
                    )}
                  </DataList.ItemLabel>
                  <DataList.ItemValue
                    display="block"
                    overflowWrap="anywhere"
                    minW="0"
                    color="wiki.ink"
                    textStyle="wiki.body"
                    fontWeight="normal"
                  >
                    {mapping.meaning}
                    {mapping.confidence !== 'confirmed' && (
                      <Text as="span" color="wiki.muted">
                        {' '}
                        ({mapping.confidence})
                      </Text>
                    )}
                    {destinations.length > 0 && (
                      <Flex
                        data-guide-references=""
                        mt="2"
                        gap="1"
                        align="center"
                        wrap="wrap"
                        textStyle="wiki.caption"
                        fontWeight="normal"
                      >
                        <Text as="span" color="wiki.muted" me="1">
                          Sources
                        </Text>
                        {destinations.map(({ sourceId, href }, linkIndex) => (
                          <Link
                            key={`${sourceId}-${linkIndex}`}
                            href={href}
                            aria-label={`Source explanation: ${mapping.label} ${mapping.meaning}`}
                            color="wiki.accent"
                            _hover={{ color: 'wiki.accentHover' }}
                            minW="6"
                            minH="6"
                            justifyContent="center"
                            textDecoration="underline"
                          >
                            {linkIndex + 1}
                          </Link>
                        ))}
                      </Flex>
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
            pt="4"
            borderTopWidth="1px"
            borderColor="wiki.border"
            color="wiki.ink"
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
            ps="4"
            py="2"
            borderStartWidth="2px"
            borderColor="wiki.border"
            color="wiki.muted"
          >
            <Strong>Image uncertainty</Strong>
            <List.Root as="ul" listStyleType="disc" ps="6" mt="2">
              {figure.uncertainties.map((uncertainty, index) => (
                <List.Item key={index}>{uncertainty}</List.Item>
              ))}
            </List.Root>
          </Box>
        )}
      </chakra.figcaption>
    </chakra.figure>
  );
}
