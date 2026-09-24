import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  globalCss: {
    html: { bg: 'wiki.canvas', color: 'wiki.ink', colorScheme: 'light' },
    body: {
      bg: 'wiki.canvas',
      color: 'wiki.ink',
      minH: '100dvh',
      display: 'flex',
      flexDirection: 'column',
    },
    '::selection': { bg: 'wiki.accentSoft', color: 'wiki.ink' },
    'a:focus-visible, button:focus-visible, input:focus-visible, [tabindex]:focus-visible':
      {
        outline: '2px solid',
        outlineColor: 'wiki.accent',
        outlineOffset: '3px',
      },
    '[id]': { scrollMarginTop: '6' },
  },
  theme: {
    semanticTokens: {
      colors: {
        wiki: {
          canvas: { value: '#FAF9F6' },
          surface: { value: '#FFFFFF' },
          ink: { value: '#20242B' },
          muted: { value: '#5F6672' },
          accent: { value: '#4338CA' },
          accentHover: { value: '#3730A3' },
          accentSoft: { value: '#EEECFC' },
          border: { value: '#E3E1DC' },
          controlBorder: { value: '#85858F' },
        },
      },
    },
    textStyles: {
      'wiki.body': {
        value: {
          fontSize: { base: '1.0625rem', md: '1.125rem' },
          lineHeight: '1.7',
          fontWeight: '400',
        },
      },
      'wiki.title': {
        value: {
          fontSize: { base: '1.875rem', md: '2.5rem' },
          lineHeight: '1.15',
          fontWeight: '600',
          letterSpacing: '-0.035em',
        },
      },
      'wiki.section': {
        value: {
          fontSize: { base: '1.5rem', md: '1.75rem' },
          lineHeight: '1.3',
          fontWeight: '600',
          letterSpacing: '-0.02em',
        },
      },
      'wiki.label': {
        value: {
          fontSize: '0.875rem',
          lineHeight: '1.5',
          fontWeight: '600',
          letterSpacing: '0.02em',
        },
      },
      'wiki.caption': {
        value: { fontSize: '0.875rem', lineHeight: '1.6', fontWeight: '400' },
      },
    },
    recipes: {
      heading: {
        base: {
          color: 'wiki.ink',
          fontWeight: '600',
          letterSpacing: '-0.025em',
        },
      },
      link: {
        base: {
          color: 'wiki.accent',
          textUnderlineOffset: '3px',
          _hover: { color: 'wiki.accentHover' },
        },
      },
      button: {
        base: {
          borderRadius: 'md',
          fontWeight: '600',
          minH: '11',
          whiteSpace: 'normal',
          height: 'auto',
          py: '2',
          transition: 'background-color 120ms ease, border-color 120ms ease',
          _motionReduce: { transition: 'none' },
        },
        variants: {
          variant: {
            solid: {
              bg: 'wiki.accent',
              color: 'white',
              _hover: { bg: 'wiki.accentHover' },
            },
            outline: {
              bg: 'wiki.surface',
              color: 'wiki.ink',
              borderColor: 'wiki.controlBorder',
              _hover: { bg: 'wiki.accentSoft', borderColor: 'wiki.accent' },
            },
            ghost: {
              color: 'wiki.ink',
              _hover: { bg: 'wiki.accentSoft', color: 'wiki.accent' },
            },
            subtle: {
              bg: 'wiki.accentSoft',
              color: 'wiki.accent',
              _hover: { bg: 'wiki.accentSoft' },
            },
          },
        },
      },
      input: {
        base: {
          borderRadius: 'md',
          minH: '12',
          color: 'wiki.ink',
          '--focus-color': '{colors.wiki.accent}',
          _placeholder: { color: 'wiki.muted' },
        },
        variants: {
          variant: {
            outline: { bg: 'wiki.surface', borderColor: 'wiki.controlBorder' },
          },
        },
      },
    },
  },
});

export const wikiSystem = createSystem(defaultConfig, config);
