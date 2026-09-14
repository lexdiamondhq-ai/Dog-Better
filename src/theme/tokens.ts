/**
 * Dog Better design tokens.
 *
 * The palette is lifted straight from the mascot: cocoa wordmark, sandy fur, espresso ears,
 * and the single golden paw-pad accent. Everything else in the system is derived from it, which is
 * why the app reads as warm and tactile instead of the usual blue/purple SaaS gradient.
 */

export const palette = {
  cocoa: '#6B4F3B',
  cocoaDeep: '#4B3628',
  espresso: '#2B1D15',
  fur: '#E9D3A3',
  furLight: '#F4E7C8',
  honey: '#E3A93B',
  honeyDeep: '#C88A1F',
  paper: '#FBF6EE',
  oat: '#F3EBDD',
  linen: '#E7DCC8',
  sand: '#D9CBB2',
  clay: '#C9694B',
  clayDeep: '#A64E33',
  moss: '#5E9C6F',
  mossDeep: '#3F7A50',
  sky: '#6FA3C8',
  night: '#171210',
  nightRaised: '#221A15',
  nightSurface: '#2C221B',
  nightBorder: '#3A2E25',
  white: '#FFFFFF',
} as const;

export type Scheme = 'light' | 'dark';

export const themes = {
  light: {
    scheme: 'light' as Scheme,
    bg: palette.paper,
    bgRaised: palette.white,
    surface: palette.oat,
    surfaceStrong: palette.linen,
    border: 'rgba(107, 79, 59, 0.12)',
    borderStrong: 'rgba(107, 79, 59, 0.24)',
    text: palette.espresso,
    textSecondary: 'rgba(43, 29, 21, 0.62)',
    textTertiary: 'rgba(43, 29, 21, 0.42)',
    onBrand: palette.paper,
    brand: palette.cocoa,
    brandDeep: palette.cocoaDeep,
    accent: palette.honey,
    accentDeep: palette.honeyDeep,
    fur: palette.fur,
    furLight: palette.furLight,
    good: palette.moss,
    goodDeep: palette.mossDeep,
    warn: palette.honeyDeep,
    bad: palette.clay,
    badDeep: palette.clayDeep,
    info: palette.sky,
    glassTint: 'rgba(251, 246, 238, 0.72)',
    railBg: 'rgba(251, 246, 238, 0.86)',
    shadow: palette.cocoaDeep,
    espressoOverlay: palette.espresso,
  },
  dark: {
    scheme: 'dark' as Scheme,
    bg: palette.night,
    bgRaised: palette.nightRaised,
    surface: palette.nightRaised,
    surfaceStrong: palette.nightSurface,
    border: 'rgba(233, 211, 163, 0.10)',
    borderStrong: 'rgba(233, 211, 163, 0.22)',
    text: palette.furLight,
    textSecondary: 'rgba(244, 231, 200, 0.64)',
    textTertiary: 'rgba(244, 231, 200, 0.42)',
    onBrand: palette.night,
    brand: palette.fur,
    brandDeep: palette.furLight,
    accent: palette.honey,
    accentDeep: palette.honeyDeep,
    fur: palette.cocoa,
    furLight: palette.cocoaDeep,
    good: '#7DBB8C',
    goodDeep: palette.moss,
    warn: palette.honey,
    bad: '#E08363',
    badDeep: palette.clay,
    info: palette.sky,
    glassTint: 'rgba(23, 18, 16, 0.66)',
    railBg: 'rgba(34, 26, 21, 0.86)',
    shadow: '#000000',
    espressoOverlay: '#000000',
  },
} as const;

export type Theme = (typeof themes)[Scheme];

export const radius = {
  xs: 8,
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Width reserved on the trailing edge for the Paw Rail so content never hides behind it. */
export const RAIL_WIDTH = 64;
export const RAIL_GUTTER = 12;
export const CONTENT_INSET_END = RAIL_WIDTH + RAIL_GUTTER;

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  displayMedium: 'Fredoka_500Medium',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyHeavy: 'Manrope_800ExtraBold',
} as const;

export const springs = {
  snappy: { damping: 18, stiffness: 240, mass: 0.8 },
  soft: { damping: 20, stiffness: 140, mass: 1 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.9 },
} as const;
