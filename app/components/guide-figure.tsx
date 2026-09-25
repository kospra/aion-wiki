import {
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
                        align="start"
                        direction="column"
                        textStyle="wiki.caption"
                        fontWeight="normal"
                      >
                        <Text as="span" color="wiki.muted" me="1">
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
                              display="inline"
                              whiteSpace="normal"
                              textDecoration="underline"
                            >
                              {label}
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
