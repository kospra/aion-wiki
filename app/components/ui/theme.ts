import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  globalCss: {
    html: {
      bg: 'wiki.canvas',
      color: 'wiki.ink',
      colorScheme: 'dark',
      scrollbarGutter: 'stable',
    },
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
    '*': {
      scrollbarColor: '{colors.wiki.scrollbar} {colors.wiki.surface}',
      scrollbarWidth: 'thin',
      '@media (forced-colors: active)': { scrollbarColor: 'auto' },
    },
    '*::-webkit-scrollbar': { width: '10px', height: '10px' },
    '*::-webkit-scrollbar-track': { bg: 'wiki.surface' },
    '*::-webkit-scrollbar-thumb': {
      bg: 'wiki.scrollbar',
      borderRadius: 'full',
      border: '2px solid',
      borderColor: 'wiki.surface',
    },
    '*::-webkit-scrollbar-thumb:hover': { bg: 'wiki.muted' },
    '*::-webkit-scrollbar-thumb:active': { bg: 'wiki.accent' },
    'input[type="search"]::-webkit-search-cancel-button': { display: 'none' },
  },
  theme: {
    tokens: {
      fonts: {
        body: { value: '"Inter Variable", Inter, system-ui, sans-serif' },
        heading: { value: '"Inter Variable", Inter, system-ui, sans-serif' },
      },
    },
    semanticTokens: {
      // Shape roles: every bordered surface uses one of these, never a raw radius.
      radii: {
        wiki: {
          // Framed surfaces: rails, cards, content blocks, dialogs and states.
          panel: { value: '{radii.lg}' },
          // Interactive rows and controls, including rows inside panels.
          control: { value: '{radii.md}' },
          // Content nested inside a framed surface, and callout edges.
          inset: { value: '{radii.sm}' },
          // Annotation color squares.
          swatch: { value: '{radii.xs}' },
        },
      },
      colors: {
        wiki: {
          // Sampled from the original screenshot annotation borders.
          annotation: {
            green: { value: '#22B14C' },
            white: { value: '#FFFFFF' },
            orange: { value: '#FF7F27' },
            purple: { value: '#A349A4' },
            red: { value: '#ED1C24' },
            cyan: { value: '#00A2E8' },
            gold: { value: '#FFC90E' },
            yellow: { value: '#FFF200' },
          },
          canvas: { value: '#000000' },
          surface: { value: '#111111' },
          raised: { value: '#18181B' },
          ink: { value: '#FAFAFA' },
          muted: { value: '#A1A1AA' },
          accent: { value: '#5EEAD4' },
          accentHover: { value: '#99F6E4' },
          accentSoft: { value: '#032726' },
          accentBorder: { value: '#286A62' },
          border: { value: '#27272A' },
          controlBorder: { value: '#71717A' },
          scrollbar: { value: '#52525B' },
        },
      },
    },
    textStyles: {
      'wiki.eyebrow': {
        value: {
          fontSize: '0.75rem',
          lineHeight: '1.55',
          fontWeight: '500',
          textTransform: 'uppercase',
        },
      },
      'wiki.hero': {
        value: {
          fontSize: { base: '2.625rem', md: '3.5rem' },
          lineHeight: '1.1',
          fontWeight: '600',
          letterSpacing: '-0.035em',
        },
      },
      'wiki.body': {
        value: {
          fontSize: { base: '1.0625rem', md: '1.125rem' },
          lineHeight: '1.65',
          fontWeight: '400',
        },
      },
      'wiki.title': {
        value: {
          fontSize: { base: '2.25rem', md: '3rem' },
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
      'wiki.annotationTitle': {
        value: {
          fontSize: { base: '1.125rem', md: '1.25rem' },
          lineHeight: '1.4',
          fontWeight: '600',
          letterSpacing: '-0.01em',
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
    layerStyles: {
      'wiki.panel': {
        value: {
          bg: 'wiki.surface',
          borderWidth: '1px',
          borderColor: 'wiki.border',
          borderRadius: 'wiki.panel',
        },
      },
      'wiki.navRow': {
        value: {
          display: 'flex',
          alignItems: 'center',
          gap: '2',
          width: 'full',
          minH: '14',
          px: '3',
          py: '2',
          borderRadius: 'wiki.control',
          borderWidth: '1px',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
          textDecoration: 'none',
          _hover: {
            bg: 'wiki.raised',
            color: 'wiki.accent',
            textDecoration: 'none',
          },
          _active: { bg: 'wiki.accentSoft' },
        },
      },
      'wiki.card': {
        value: {
          bg: 'wiki.surface',
          borderWidth: '1px',
          borderColor: 'wiki.border',
          borderRadius: 'wiki.panel',
          p: '6',
          _hover: {
            borderColor: 'wiki.accentBorder',
            bg: 'wiki.raised',
            textDecoration: 'none',
          },
          _active: { bg: 'wiki.accentSoft' },
        },
      },
    },
    recipes: {
      heading: {
        base: {
          textWrap: 'balance',
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
          cursor: 'pointer',
        },
      },
      button: {
        base: {
          borderRadius: 'wiki.control',
          cursor: 'pointer',
          _disabled: { cursor: 'not-allowed', opacity: 0.5 },
          _active: { transform: 'translateY(1px)' },
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
              color: 'wiki.canvas',
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
          borderRadius: 'wiki.control',
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
