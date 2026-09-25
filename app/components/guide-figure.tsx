import {
  Badge,
  Box,
  DataList,
  Flex,
  Link,
  List,
  Strong,
  Text,
  chakra,
} from '@chakra-ui/react';
import { readerFigure } from '../content/reader-figure';
import { normalizeSourceUrl } from '../content/reader';
import { sourcePassageLabels } from '../content/repository';
import type { Figure } from '../content/types';
import { ImageViewer } from './image-viewer';

type Props = {
  figure: Figure;
  sourceLinks: Record<string, string>;
};

// Explicit screenshot annotation mappings: secondary text/item colors do not
// determine the swatch. Unannotated or unverified colors remain text-only.
const annotationColors: Record<string, Record<string, string>> = {
  'figure-005': {
    '1': 'wiki.annotation.green',
    '2': 'wiki.annotation.white',
    '3': 'wiki.annotation.orange',
    '4': 'wiki.annotation.purple',
    '5': 'wiki.annotation.red',
    '6': 'wiki.annotation.cyan',
  },
  'figure-006': { '7': 'wiki.annotation.gold' },
  'figure-041': {
    Bind: 'wiki.annotation.yellow',
    Sync: 'wiki.annotation.purple',
    Reset: 'wiki.annotation.green',
  },
};

export function GuideFigure({
  figure: originalFigure,
  sourceLinks,
}: Props): React.JSX.Element {
  const figure = readerFigure(originalFigure);

  return (
    <chakra.figure
      id={figure.id}
      data-guide-figure=""
      my={{ base: '8', md: '10' }}
      maxW="100%"
      minW="0"
      p="4"
      bg="wiki.surface"
      borderRadius="md"
    >
      <ImageViewer figure={figure} />
      <chakra.figcaption>
        <Text mt="3" color="wiki.muted" textStyle="wiki.caption">
          {figure.caption}
        </Text>
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
              const swatchColor = annotationColors[figure.id]?.[mapping.label];
              const destinations = mapping.textSourceIds.flatMap((sourceId) => {
                const value = Object.hasOwn(sourceLinks, sourceId)
                  ? sourceLinks[sourceId]
                  : undefined;
                const href =
                  typeof value === 'string' ? normalizeSourceUrl(value) : null;
                const label =
                  href && Object.hasOwn(sourcePassageLabels, href)
                    ? sourcePassageLabels[href]
                    : href?.startsWith('https://docs.google.com/')
                      ? 'Original guide document'
                      : 'Read supporting guide passage';
                return href ? [{ sourceId, href, label }] : [];
              });
              return (
                <DataList.Item
                  key={index}
                  display="grid"
                  gridTemplateColumns="minmax(0, 1fr)"
                  columnGap="4"
                  rowGap="3"
                  py="6"
                  borderBottomWidth="1px"
                  borderColor="wiki.border"
                >
                  <DataList.ItemLabel
                    fontWeight="semibold"
                    color="wiki.ink"
                    textStyle="wiki.label"
                    display="flex"
                    alignItems="start"
                    flexWrap="wrap"
                    gap="3"
                    overflowWrap="anywhere"
                    minW="0"
                  >
                    <Badge
                      size="md"
                      variant="subtle"
                      bg="wiki.raised"
                      color="wiki.ink"
                      whiteSpace="normal"
                    >
                      {mapping.label}
                    </Badge>
                    {swatchColor && (
                      <Box
                        as="span"
                        data-guide-color-swatch=""
                        aria-hidden="true"
                        bg={swatchColor}
                        w="3"
                        h="3"
                        mt="1.5"
                        flexShrink="0"
                        borderRadius="2px"
                      />
                    )}
                    <Text
                      as="span"
                      data-guide-annotation-title=""
                      textStyle="wiki.annotationTitle"
                      color="wiki.ink"
                      flex="1"
                      minW="0"
                    >
                      {mapping.meaning}
                    </Text>
                  </DataList.ItemLabel>
                  <DataList.ItemValue
                    display="block"
                    overflowWrap="anywhere"
                    minW="0"
                    color="wiki.ink"
                    textStyle="wiki.body"
                    fontWeight="normal"
                  >
                    {mapping.color && (
                      <Text
                        data-guide-color-description=""
                        srOnly={Boolean(swatchColor)}
                        color="wiki.muted"
                        textStyle="wiki.caption"
                      >
                        {mapping.color}
                      </Text>
                    )}
                    {mapping.visualValue && (
                      <Text
                        data-guide-visual-value=""
                        mt={mapping.color && !swatchColor ? '3' : '0'}
                        color="wiki.muted"
                        textStyle="wiki.caption"
                      >
                        {mapping.visualValue}
                      </Text>
                    )}
                    {mapping.confidence !== 'confirmed' && (
                      <Text as="span" color="wiki.muted">
                        {' '}
                        ({mapping.confidence})
                      </Text>
                    )}
                    {destinations.length > 0 && (
                      <Flex
                        data-guide-references=""
                        mt="3"
                        gap="2"
                        align="start"
                        direction="column"
                        textStyle="wiki.caption"
                        fontWeight="normal"
                      >
                        <Text as="span" color="wiki.muted" fontSize="xs">
                          Related guide passages
                        </Text>
                        {destinations.map(
                          ({ sourceId, href, label }, linkIndex) => (
                            <Link
                              key={`${sourceId}-${linkIndex}`}
                              href={href}
                              aria-label={`Source explanation: ${mapping.label} ${mapping.meaning} — ${label}`}
                              color="wiki.accent"
                              _hover={{ color: 'wiki.accentHover' }}
                              minW="6"
                              minH="6"
                              display="inline-flex"
                              alignItems="baseline"
                              gap="2"
                              whiteSpace="normal"
                              textDecoration="underline"
                            >
                              {label}
                              <Text as="span" aria-hidden="true" flexShrink="0">
                                ↗
                              </Text>
                            </Link>
                          ),
                        )}
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
            aria-label="Example details"
            mt="5"
            pt="4"
            borderTopWidth="1px"
            borderColor="wiki.border"
            color="wiki.ink"
          >
            <Strong>Example details</Strong>
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
            <Strong>Important context</Strong>
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
